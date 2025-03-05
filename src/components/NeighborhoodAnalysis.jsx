import React, { useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, LabelList, ComposedChart
} from 'recharts';
import ChartCard from './shared/ChartCard';
import { useCrimeData } from '../utils/CrimeDataContext';

// Crime type colors - matching the theme from CrimeTypeChart
const CRIME_COLORS = {
  'HOMICIDE': '#E53935',           // Red
  'ASSAULT W/DANGEROUS WEAPON': '#D81B60', // Pink
  'ROBBERY': '#8E24AA',           // Purple
  'BURGLARY': '#3949AB',          // Indigo
  'MOTOR VEHICLE THEFT': '#1E88E5', // Blue
  'THEFT F/AUTO': '#00ACC1',       // Cyan
  'THEFT/OTHER': '#43A047',        // Green
  'default': '#757575'             // Grey
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum, entry) => sum + entry.value, 0);
    
    return (
      <div className="bg-white p-3 border border-gray-200 shadow-lg rounded">
        <p className="font-semibold text-gray-800 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p 
            key={index} 
            className="text-sm flex items-center py-1"
            style={{ color: CRIME_COLORS[entry.name] || CRIME_COLORS.default }}
          >
            <span 
              className="inline-block w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: CRIME_COLORS[entry.name] || CRIME_COLORS.default }}
            />
            <span className="flex-1">
              {entry.name}:{' '}
              <span className="font-medium">{entry.value}</span>
              <span className="text-gray-500 ml-1">
                ({((entry.value / total) * 100).toFixed(1)}%)
              </span>
            </span>
          </p>
        ))}
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-800">
            Total Incidents: {total}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

// Empty state component
const EmptyState = () => (
  <div className="h-[500px] flex items-center justify-center bg-gray-50 rounded-lg">
    <div className="text-center p-6">
      <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
      </svg>
      <h3 className="mt-2 text-lg font-medium text-gray-900">No Neighborhood Data Available</h3>
      <p className="mt-1 text-sm text-gray-500">
        Try adjusting your filters to see neighborhood crime distribution.
      </p>
    </div>
  </div>
);

const NeighborhoodAnalysis = ({ updateAreaAnalysis }) => {
  const { isLoading, error, rawData, filters, showCensusOverlay, selectedCensusMetric, census } = useCrimeData();

  const { neighborhoodData, insights, activeCrimeTypes, analysisData } = useMemo(() => {
    if (!rawData || rawData.length === 0) {
      return { neighborhoodData: [], insights: null, activeCrimeTypes: [], analysisData: null };
    }

    try {
      // Determine active crime types
      const activeCrimeTypes = filters.crimeTypes.length > 0 
        ? filters.crimeTypes 
        : Object.keys(CRIME_COLORS).filter(key => key !== 'default');

      // Filter data based on current filters
      const filteredData = rawData.filter(incident => {
        // Skip invalid incidents
        if (!incident) return false;
        
        // Date range filter
        if (filters.dateRange) {
          const { start, end } = filters.dateRange;
          if (!incident.reportDate || (start && incident.reportDate < start) || (end && incident.reportDate > end)) {
            return false;
          }
        }

        // Crime type filter
        if (filters.crimeTypes.length > 0 && !filters.crimeTypes.includes(incident.offense)) {
          return false;
        }

        // Shift filter
        if (filters.shifts.length > 0 && !filters.shifts.includes(incident.shift)) {
          return false;
        }

        return true;
      });

      // Get crime distribution by neighborhood
      const neighborhoodCrimes = filteredData.reduce((acc, incident) => {
        if (!incident) return acc;
        
        const neighborhood = incident.neighborhood || 'Unknown';
        if (!acc[neighborhood]) {
          acc[neighborhood] = {
            neighborhood,
            total: 0
          };
          // Only initialize counters for active crime types
          activeCrimeTypes.forEach(type => {
            acc[neighborhood][type] = 0;
          });
        }
        
        if (incident.offense && activeCrimeTypes.includes(incident.offense)) {
          acc[neighborhood][incident.offense] = (acc[neighborhood][incident.offense] || 0) + 1;
          acc[neighborhood].total += 1;
        }
        
        return acc;
      }, {});

      // Convert to array and sort by total crimes
      const neighborhoodData = Object.values(neighborhoodCrimes)
        .filter(item => {
          // Filter out unknown/empty neighborhoods and ensure it's a valid cluster
          return item.neighborhood !== 'Unknown' && 
                 item.neighborhood.trim() !== '' && 
                 item.neighborhood.toLowerCase().includes('cluster');
        })
        .sort((a, b) => b.total - a.total)
        .slice(0, 5); // Top 5 neighborhoods by total incidents

      if (neighborhoodData.length === 0) {
        return { neighborhoodData: [], insights: null, activeCrimeTypes: [], analysisData: null };
      }

      // Generate insights
      const insights = {
        highestCrime: {
          neighborhood: neighborhoodData[0].neighborhood,
          total: neighborhoodData[0].total
        },
        predominantType: Object.entries(neighborhoodData[0])
          .filter(([key]) => activeCrimeTypes.includes(key))
          .sort((a, b) => b[1] - a[1])[0] || ['Unknown', 0]
      };

      // Calculate additional insights
      const totalIncidents = filteredData.length || 1; // Avoid division by zero
      const topAreasTotal = neighborhoodData.reduce((sum, n) => sum + n.total, 0);
      const topAreasPercentage = ((topAreasTotal / totalIncidents) * 100).toFixed(1);

      // Calculate property crime percentage
      const propertyCrimes = ['THEFT/OTHER', 'THEFT F/AUTO', 'BURGLARY', 'MOTOR VEHICLE THEFT'];
      const propertyCrimeCount = filteredData.filter(incident => 
        incident && propertyCrimes.includes(incident.offense)
      ).length;
      const propertyCrimePercentage = ((propertyCrimeCount / totalIncidents) * 100).toFixed(1);

      // Update area analysis insights
      const topCluster = neighborhoodData[0];
      if (topCluster) {
        const topCrimeEntry = Object.entries(topCluster)
          .filter(([key]) => activeCrimeTypes.includes(key))
          .sort((a, b) => b[1] - a[1])[0] || ['Unknown', 0];

        // Store the analysis data but don't call updateAreaAnalysis here
        const analysisData = {
          topCluster: topCluster.neighborhood || 'Unknown',
          totalCrimes: topCluster.total || 0,
          topCrimeType: topCrimeEntry[0] || 'Unknown',
          topCrimeCount: topCrimeEntry[1] || 0,
          topClusters: neighborhoodData.map(n => n.neighborhood),
          topAreasPercentage,
          propertyCrimePercentage
        };

        return { neighborhoodData, insights, activeCrimeTypes, analysisData };
      }

      return { neighborhoodData, insights, activeCrimeTypes, analysisData: null };
    } catch (error) {
      console.error('Error processing neighborhood data:', error);
      return { neighborhoodData: [], insights: null, activeCrimeTypes: [], analysisData: null };
    }
  }, [rawData, filters]);

  // Move the updateAreaAnalysis call to useEffect
  useEffect(() => {
    if (analysisData) {
      try {
      updateAreaAnalysis?.(analysisData);
      } catch (error) {
        console.error('Error updating area analysis:', error);
      }
    }
  }, [analysisData, updateAreaAnalysis]);

  // Sample census data by neighborhood (in a real app, this would come from your backend)
  const neighborhoodCensusData = {
    'Cluster 1': { income: 143000, education: 88, poverty: 5.2, housing: 820000, diversity: 0.62 },
    'Cluster 2': { income: 128000, education: 84, poverty: 6.8, housing: 790000, diversity: 0.58 },
    'Cluster 3': { income: 108000, education: 76, poverty: 8.5, housing: 710000, diversity: 0.73 },
    'Cluster 4': { income: 119000, education: 79, poverty: 7.2, housing: 735000, diversity: 0.64 },
    'Cluster 5': { income: 132000, education: 82, poverty: 6.5, housing: 780000, diversity: 0.61 },
    'Cluster 6': { income: 97000, education: 71, poverty: 11.3, housing: 650000, diversity: 0.78 },
    'Cluster 7': { income: 86000, education: 65, poverty: 14.7, housing: 590000, diversity: 0.83 },
    'Cluster 8': { income: 92000, education: 68, poverty: 13.1, housing: 620000, diversity: 0.79 },
    'Cluster 9': { income: 76000, education: 59, poverty: 17.5, housing: 520000, diversity: 0.87 },
    'Cluster 10': { income: 82000, education: 62, poverty: 15.8, housing: 570000, diversity: 0.85 }
  };

  // Create color scale for different neighborhoods
  const NEIGHBORHOOD_COLORS = [
    '#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c',
    '#d0ed57', '#ffc658', '#ff8a65', '#ba68c8', '#4db6ac'
  ];

  // Format census value for display
  const formatCensusValue = (value, metric) => {
    if (value === undefined || value === null) return 'N/A';
    
    if (metric === 'income') {
      return `$${value.toLocaleString()}`;
    } else if (metric === 'housing') {
      return `$${value.toLocaleString()}`;
    } else if (metric === 'diversity') {
      return `${(value * 100).toFixed(1)}%`;
    } else {
      return `${value}%`;
    }
  };

  // Get correlation text
  const getCorrelationText = (metric, value, incidents, neighborhoods) => {
    if (value === undefined || value === null) return 'No data';
    
    // Find median incidents across neighborhoods to determine what counts as "high" or "low"
    let medianIncidents = 0;
    if (neighborhoods && neighborhoods.length > 0) {
      const sortedIncidents = [...neighborhoods].sort((a, b) => a.total - b.total);
      const midIndex = Math.floor(sortedIncidents.length / 2);
      medianIncidents = sortedIncidents.length % 2 !== 0
        ? sortedIncidents[midIndex].total
        : (sortedIncidents[midIndex - 1].total + sortedIncidents[midIndex].total) / 2;
    }

    const isHighCrime = incidents > medianIncidents * 1.2; // 20% above median
    const isLowCrime = incidents < medianIncidents * 0.8;  // 20% below median
    
    // Determine expected pattern based on demographic factors
    let expectedPattern = '';
    let isAnomaly = false;
    
    if (metric === 'income') {
      expectedPattern = value > 120000 ? 'low' : value < 90000 ? 'high' : 'moderate';
      isAnomaly = (expectedPattern === 'low' && isHighCrime) || (expectedPattern === 'high' && isLowCrime);
      
      if (isAnomaly) {
        return expectedPattern === 'low' ? 'Anomaly: High crime despite high income' : 'Anomaly: Low crime despite low income';
      } else {
        return value > 120000 ? 'Lower crime rate (expected)' : value < 90000 ? 'Higher crime rate (expected)' : 'Moderate correlation';
      }
    } else if (metric === 'education') {
      expectedPattern = value > 80 ? 'low' : value < 65 ? 'high' : 'moderate';
      isAnomaly = (expectedPattern === 'low' && isHighCrime) || (expectedPattern === 'high' && isLowCrime);
      
      if (isAnomaly) {
        return expectedPattern === 'low' ? 'Anomaly: High crime despite high education' : 'Anomaly: Low crime despite low education';
      } else {
        return value > 80 ? 'Lower violent crime (expected)' : value < 65 ? 'Higher crime rate (expected)' : 'Moderate correlation';
      }
    } else if (metric === 'poverty') {
      expectedPattern = value > 15 ? 'high' : value < 7 ? 'low' : 'moderate';
      isAnomaly = (expectedPattern === 'high' && isLowCrime) || (expectedPattern === 'low' && isHighCrime);
      
      if (isAnomaly) {
        return expectedPattern === 'high' ? 'Anomaly: Low crime despite high poverty' : 'Anomaly: High crime despite low poverty';
      } else {
        return value > 15 ? 'Higher crime rate (expected)' : value < 7 ? 'Lower crime rate (expected)' : 'Moderate correlation';
      }
    } else if (metric === 'housing') {
      expectedPattern = value > 750000 ? 'low' : 'high';
      isAnomaly = (expectedPattern === 'low' && isHighCrime) || (expectedPattern === 'high' && isLowCrime);
      
      if (isAnomaly) {
        return expectedPattern === 'low' ? 'Anomaly: High crime despite high housing values' : 'Anomaly: Low crime despite low housing values';
      } else {
        return value > 750000 ? 'Different pattern (expected)' : 'Higher violent crime (expected)';
      }
    }
    
    return 'Limited correlation';
  };

  // Get color for correlation indicator
  const getCorrelationIndicatorColor = (metric, value, incidents, neighborhoods) => {
    if (value === undefined || value === null) return '#9ca3af';
    
    // Find median incidents across neighborhoods to determine what counts as "high" or "low"
    let medianIncidents = 0;
    if (neighborhoods && neighborhoods.length > 0) {
      const sortedIncidents = [...neighborhoods].sort((a, b) => a.total - b.total);
      const midIndex = Math.floor(sortedIncidents.length / 2);
      medianIncidents = sortedIncidents.length % 2 !== 0
        ? sortedIncidents[midIndex].total
        : (sortedIncidents[midIndex - 1].total + sortedIncidents[midIndex].total) / 2;
    }

    const isHighCrime = incidents > medianIncidents * 1.2; // 20% above median
    const isLowCrime = incidents < medianIncidents * 0.8;  // 20% below median
    
    // Determine expected pattern
    let expectedPattern = '';
    let isAnomaly = false;
    
    if (metric === 'poverty') {
      expectedPattern = value > 15 ? 'high' : value < 7 ? 'low' : 'moderate';
      isAnomaly = (expectedPattern === 'high' && isLowCrime) || (expectedPattern === 'low' && isHighCrime);
      
      // Anomaly colors are purple for unexpected low crime, amber for unexpected high crime
      if (isAnomaly) {
        return expectedPattern === 'high' ? '#9333ea' : '#d97706';
      }
      
      return value > 15 ? '#ef4444' : value < 7 ? '#10b981' : '#f59e0b';
    } else if (metric === 'income' || metric === 'education' || metric === 'housing') {
      const thresholds = {
        'income': { high: 120000, low: 90000 },
        'education': { high: 80, low: 65 },
        'housing': { high: 750000, low: 600000 }
      };
      
      expectedPattern = value > thresholds[metric].high ? 'low' : value < thresholds[metric].low ? 'high' : 'moderate';
      isAnomaly = (expectedPattern === 'low' && isHighCrime) || (expectedPattern === 'high' && isLowCrime);
      
      // Anomaly colors
      if (isAnomaly) {
        return expectedPattern === 'low' ? '#d97706' : '#9333ea';
      }
      
      return value > thresholds[metric].high ? '#10b981' : value < thresholds[metric].low ? '#ef4444' : '#f59e0b';
    }
    
    return '#9ca3af'; // Gray default
  };

  // Get correlation tooltip - base information
  const getCorrelationTooltipBaseInfo = (metric, value, neighborhood) => {
    if (value === undefined || value === null) return 'No data available';
    
    switch(metric) {
      case 'income':
        return `Median income in ${neighborhood}: ${formatCensusValue(value, 'income')}`;
      case 'education':
        return `Higher education rate in ${neighborhood}: ${value}%`;
      case 'poverty':
        return `Poverty rate in ${neighborhood}: ${value}%`;
      case 'housing':
        return `Median housing value in ${neighborhood}: ${formatCensusValue(value, 'housing')}`;
      default:
        return `${metric.charAt(0).toUpperCase() + metric.slice(1)} in ${neighborhood}`;
    }
  };
  
  // Get correlation tooltip - explanation
  const getCorrelationTooltipExplanation = (metric, value, incidents, neighborhoods) => {
    if (value === undefined || value === null) return 'No data available for analysis';
    
    // Find median incidents across neighborhoods to determine what counts as "high" or "low"
    let medianIncidents = 0;
    if (neighborhoods && neighborhoods.length > 0) {
      const sortedIncidents = [...neighborhoods].sort((a, b) => a.total - b.total);
      const midIndex = Math.floor(sortedIncidents.length / 2);
      medianIncidents = sortedIncidents.length % 2 !== 0
        ? sortedIncidents[midIndex].total
        : (sortedIncidents[midIndex - 1].total + sortedIncidents[midIndex].total) / 2;
    }

    const isHighCrime = incidents > medianIncidents * 1.2; // 20% above median
    const isLowCrime = incidents < medianIncidents * 0.8;  // 20% below median
    
    // Determine if this is an anomaly case
    let isAnomaly = false;
    let expectedPattern = '';
    
    if (metric === 'income') {
      expectedPattern = value > 120000 ? 'low' : value < 90000 ? 'high' : 'moderate';
      isAnomaly = (expectedPattern === 'low' && isHighCrime) || (expectedPattern === 'high' && isLowCrime);
      
      if (isAnomaly) {
        if (expectedPattern === 'low') {
          return `This area has higher income (${formatCensusValue(value, 'income')}) which typically correlates with lower crime rates, but shows unusually high crime activity (${incidents} incidents). This could indicate a mixed-use area, commercial district, or special factors affecting crime patterns.`;
        } else {
          return `Despite lower income levels (${formatCensusValue(value, 'income')}), this area shows unexpectedly low crime rates (${incidents} incidents). This could suggest effective community policing, strong social cohesion, or other protective factors.`;
        }
      } else {
        return value > 120000 
          ? `Higher income neighborhoods (${formatCensusValue(value, 'income')}) typically experience lower crime rates, which is consistent with the data for this area.`
          : value < 90000 
            ? `Lower income areas (${formatCensusValue(value, 'income')}) often experience higher crime incidents, which is consistent with the data for this area.`
            : `Moderate income areas (${formatCensusValue(value, 'income')}) show mixed crime patterns with no strong correlation.`;
      }
    } else if (metric === 'education') {
      expectedPattern = value > 80 ? 'low' : value < 65 ? 'high' : 'moderate';
      isAnomaly = (expectedPattern === 'low' && isHighCrime) || (expectedPattern === 'high' && isLowCrime);
      
      if (isAnomaly) {
        if (expectedPattern === 'low') {
          return `This area has high education rates (${value}%) which typically correlates with lower violent crime, but shows unusually high crime activity (${incidents} incidents). This could indicate other socioeconomic factors at play.`;
        } else {
          return `Despite lower education rates (${value}%), this area shows unexpectedly low crime rates (${incidents} incidents). This could suggest strong community factors or targeted policing strategies.`;
        }
      } else {
        return value > 80 
          ? `Areas with higher education levels (${value}%) typically experience less violent crime, which aligns with the patterns seen in this neighborhood.`
          : value < 65 
            ? `Lower education rates (${value}%) correlate with more property and violent crime, which matches the patterns seen in this neighborhood.`
            : `Moderate education levels (${value}%) show variable correlation with crime with no strong pattern.`;
      }
    } else if (metric === 'poverty') {
      expectedPattern = value > 15 ? 'high' : value < 7 ? 'low' : 'moderate';
      isAnomaly = (expectedPattern === 'high' && isLowCrime) || (expectedPattern === 'low' && isHighCrime);
      
      if (isAnomaly) {
        if (expectedPattern === 'high') {
          return `Despite higher poverty rates (${value}%), this area shows unexpectedly low crime activity (${incidents} incidents). This might indicate effective community programs, strong social services, or other resilience factors.`;
        } else {
          return `This area has low poverty rates (${value}%) which typically correlates with lower crime, but shows unusually high crime activity (${incidents} incidents). This could indicate proximity to high-traffic areas or other external factors.`;
        }
      } else {
        return value > 15 
          ? `Higher poverty areas (${value}%) consistently show elevated crime levels, which matches the patterns in this neighborhood.`
          : value < 7 
            ? `Lower poverty neighborhoods (${value}%) typically have reduced crime incidents, which is consistent with this area's data.`
            : `Moderate poverty levels (${value}%) show mixed correlation with crime with no strong pattern.`;
      }
    } else if (metric === 'housing') {
      expectedPattern = value > 750000 ? 'low' : 'high';
      isAnomaly = (expectedPattern === 'low' && isHighCrime) || (expectedPattern === 'high' && isLowCrime);
      
      if (isAnomaly) {
        if (expectedPattern === 'low') {
          return `This area has high housing values (${formatCensusValue(value, 'housing')}) which typically correlates with different crime patterns, but shows unusually high crime activity (${incidents} incidents). This could be due to its location or mixed commercial/residential status.`;
        } else {
          return `Despite lower housing values (${formatCensusValue(value, 'housing')}), this area shows unexpectedly low crime rates (${incidents} incidents). This could indicate improving neighborhood conditions or effective community safety measures.`;
        }
      } else {
        return value > 750000 
          ? `High-value housing areas (${formatCensusValue(value, 'housing')}) show different crime patterns, often with less violent crime, which is consistent with this area's data.`
          : `Areas with lower housing values (${formatCensusValue(value, 'housing')}) tend to have higher violent crime rates, which matches the patterns in this neighborhood.`;
      }
    }
    
    return 'No significant correlation with crime patterns can be established with the available data.';
  };

  // Helper function to format cluster names - MOVED BEFORE IT'S USED
  const formatClusterName = (clusterName) => {
    if (!clusterName) return "Unknown";
    return clusterName.replace('Cluster', 'District').trim();
  };

  // Extract key insights for area summary
  const areaInsightsSummary = useMemo(() => {
    if (!analysisData || !neighborhoodData || neighborhoodData.length === 0) {
      return null;
    }
    
    // Determine active crime types for filtering
    const activeCrimeTypes = filters.crimeTypes.length > 0 
      ? filters.crimeTypes 
      : Object.keys(CRIME_COLORS).filter(key => key !== 'default');

    // Filter data based on current filters
    const filteredData = rawData.filter(incident => {
      // Skip invalid incidents
      if (!incident) return false;
      
      // Date range filter
      if (filters.dateRange) {
        const { start, end } = filters.dateRange;
        if (!incident.reportDate || (start && incident.reportDate < start) || (end && incident.reportDate > end)) {
          return false;
        }
      }

      // Crime type filter
      if (filters.crimeTypes.length > 0 && !filters.crimeTypes.includes(incident.offense)) {
        return false;
      }

      // Shift filter
      if (filters.shifts.length > 0 && !filters.shifts.includes(incident.shift)) {
        return false;
      }

      return true;
    });
    
    // Find top cluster and crime count - ensure we're using the filtered data
    const topCluster = neighborhoodData[0]; // Already sorted by total
    
    // Calculate top crime type
    const crimeTypeCounts = {};
    filteredData.forEach(incident => {
      if (incident && incident.offense) {
        crimeTypeCounts[incident.offense] = (crimeTypeCounts[incident.offense] || 0) + 1;
      }
    });
    
    const topCrimeEntry = Object.entries(crimeTypeCounts)
      .sort((a, b) => b[1] - a[1])[0] || ["None", 0];
    
    // Calculate percentage from top 5 neighborhoods
    const top5Neighborhoods = [...neighborhoodData].slice(0, 5); // Already sorted by total
      
    const top5Count = top5Neighborhoods.reduce((sum, n) => sum + n.total, 0);
    const totalIncidents = filteredData.length;
    const top5Percentage = totalIncidents > 0 ? ((top5Count / totalIncidents) * 100).toFixed(1) : "0";
    
    // Calculate property crime percentage
    const propertyCrimeTypes = ['THEFT/OTHER', 'THEFT F/AUTO', 'BURGLARY', 'MOTOR VEHICLE THEFT'];
    const propertyCrimeCount = filteredData.filter(i => i && propertyCrimeTypes.includes(i.offense)).length;
    const propertyCrimePercentage = totalIncidents > 0 ? ((propertyCrimeCount / totalIncidents) * 100).toFixed(1) : "0";
    
    return {
      topClusterName: formatClusterName(topCluster.neighborhood),
      topClusterCount: topCluster.total || 0,
      topCrimeType: topCrimeEntry[0] || "Unknown",
      topCrimeCount: topCrimeEntry[1] || 0,
      top5Percentage,
      propertyCrimePercentage
    };
  }, [neighborhoodData, analysisData, rawData, filters]);

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        {neighborhoodData && neighborhoodData.length > 0 && (
          <div className="flex space-x-4">
            <div className="bg-blue-50 px-3 py-1 rounded-full text-sm flex items-center">
              <svg className="w-4 h-4 mr-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Top area: {formatClusterName(neighborhoodData[0]?.neighborhood)}
            </div>
            <div className="bg-purple-50 px-3 py-1 rounded-full text-sm flex items-center">
              <svg className="w-4 h-4 mr-1 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Common crime: {insights?.predominantType?.[0] || (areaInsightsSummary?.topCrimeType || 'N/A')}
            </div>
          </div>
        )}
      </div>
      
      {isLoading ? (
        <div className="h-[500px] w-full flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="h-[500px] w-full flex items-center justify-center bg-gray-50 rounded-lg">
          <p className="text-red-500">{error}</p>
        </div>
      ) : !insights || neighborhoodData.length === 0 ? (
        <EmptyState />
      ) : (
      <div className="h-[500px] border border-gray-100 rounded-lg overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            layout="vertical"
            data={neighborhoodData}
            margin={{ top: 20, right: 150, left: 120, bottom: 40 }}
            barGap={0}
            barCategoryGap={10}
            className="neighborhood-chart"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis 
              type="number"
              tickFormatter={(value) => value.toLocaleString()}
              label={{ 
                value: 'Number of Incidents',
                position: 'bottom',
                offset: 5,
                style: { fill: '#666', fontWeight: 500, fontSize: 14 }
              }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis 
              dataKey="neighborhood" 
              type="category"
              width={110}
              tick={{ 
                fill: '#374151',
                fontSize: 13,
                fontWeight: 500
              }}
              tickFormatter={(value) => {
                // More readable format: "District 2" instead of "Cluster 2"
                return value.replace('Cluster ', 'District ');
              }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(229, 231, 235, 0.4)' }}
              wrapperStyle={{ zIndex: 1000 }}
            />
            <Legend 
              layout="vertical"
              align="right"
              verticalAlign="middle"
              wrapperStyle={{
                paddingLeft: '15px',
                right: 5,
                fontSize: '12px',
                lineHeight: '24px'
              }}
              iconType="circle"
              iconSize={10}
            />
            {activeCrimeTypes.map((crimeType, index) => (
              <Bar
                key={crimeType}
                dataKey={crimeType}
                stackId="a"
                fill={CRIME_COLORS[crimeType] || CRIME_COLORS.default}
                name={crimeType}
                barSize={38}
                animationDuration={1000 + (index * 150)}
                animationBegin={200 + (index * 100)}
                animationEasing="ease-out"
                radius={[0, 3, 3, 0]}
              >
                {/* Add value labels for segments that are large enough */}
                <LabelList
                  dataKey={crimeType}
                  position="center"
                  content={({ x, y, width, height, value }) => {
                    // Only show labels for segments with enough width
                    if (width < 30 || !value) return null;
                    return (
                      <text
                        x={x + width / 2}
                        y={y + height / 2}
                        fill="white"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{ fontSize: 11, fontWeight: 'bold', textShadow: '1px 1px 1px rgba(0,0,0,0.5)' }}
                      >
                        {value > 100 ? value : ''}
                      </text>
                    );
                  }}
                />
              </Bar>
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      )}
      
      {/* Consolidated Crime and Demographic Insights Section */}
      {census && neighborhoodData.length > 0 && areaInsightsSummary && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Area & Demographic Insights
          </h3>
          
          {/* Area & Crime Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            <div className="p-3 bg-white rounded-md border border-blue-50 hover:shadow-md transition-all duration-200">
              <p className="text-sm text-gray-800 flex items-center">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </span>
                <span>
                  <span className="font-medium text-blue-800">{areaInsightsSummary.topClusterName}</span>
                  {" recorded the highest number of incidents with "}
                  <span className="font-semibold text-blue-900">{areaInsightsSummary.topClusterCount.toLocaleString()}</span>
                  {" total crimes"}
                </span>
              </p>
            </div>
            <div className="p-3 bg-white rounded-md border border-blue-50 hover:shadow-md transition-all duration-200">
              <p className="text-sm text-gray-800 flex items-center">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-700 mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </span>
                <span>
                  <span className="font-medium text-blue-800">{areaInsightsSummary.topCrimeType}</span>
                  {" is the most frequent crime type with "}
                  <span className="font-semibold text-blue-900">{areaInsightsSummary.topCrimeCount.toLocaleString()}</span>
                  {" incidents"}
                </span>
              </p>
            </div>
            <div className="p-3 bg-white rounded-md border border-blue-50 hover:shadow-md transition-all duration-200">
              <p className="text-sm text-gray-800 flex items-center">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-700 mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </span>
                <span>
                  {"The top 5 neighborhoods account for "}
                  <span className="font-semibold text-blue-900">{areaInsightsSummary.top5Percentage}%</span>
                  {" of all reported incidents"}
                </span>
              </p>
            </div>
            <div className="p-3 bg-white rounded-md border border-blue-50 hover:shadow-md transition-all duration-200">
              <p className="text-sm text-gray-800 flex items-center">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </span>
                <span>
                  {"Property crimes make up "}
                  <span className="font-semibold text-blue-900">{areaInsightsSummary.propertyCrimePercentage}%</span>
                  {" of all incidents"}
                </span>
              </p>
            </div>
          </div>
          
          {/* Demographic Table */}
          <div>
            <h4 className="text-md font-medium text-blue-700 mb-2 flex items-center">
              <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Demographic Factors by Neighborhood
            </h4>
            <table className="w-full bg-white table-fixed">
              <thead className="bg-blue-100">
                <tr>
                  <th className="py-2 px-4 text-left text-xs font-medium text-blue-800 uppercase tracking-wider w-1/5">Neighborhood</th>
                  <th className="py-2 px-4 text-left text-xs font-medium text-blue-800 uppercase tracking-wider w-1/5">Incidents</th>
                  <th className="py-2 px-4 text-left text-xs font-medium text-blue-800 uppercase tracking-wider w-1/5 flex items-center">
                    {selectedCensusMetric === 'income' && <span className="inline-block mr-1 text-green-600">💰</span>}
                    {selectedCensusMetric === 'education' && <span className="inline-block mr-1 text-indigo-600">🎓</span>}
                    {selectedCensusMetric === 'poverty' && <span className="inline-block mr-1 text-red-600">📉</span>}
                    {selectedCensusMetric === 'housing' && <span className="inline-block mr-1 text-blue-600">🏘️</span>}
                    {selectedCensusMetric === 'race' && <span className="inline-block mr-1 text-purple-600">👪</span>}
                    {selectedCensusMetric.charAt(0).toUpperCase() + selectedCensusMetric.slice(1)}
                  </th>
                  <th className="py-2 px-4 text-left text-xs font-medium text-blue-800 uppercase tracking-wider w-2/5">Correlation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-100">
                {neighborhoodData
                  .filter(n => {
                    // Filter out neighborhoods with no census data
                    const censusValue = neighborhoodCensusData[n.neighborhood]?.[selectedCensusMetric];
                    return censusValue !== null && censusValue !== undefined && censusValue !== 'N/A';
                  })
                  .map((n, index) => {
                    const censusValue = neighborhoodCensusData[n.neighborhood]?.[selectedCensusMetric];
                    const formattedValue = formatCensusValue(censusValue, selectedCensusMetric);
                    
                    return (
                      <tr key={n.neighborhood} className={index % 2 === 0 ? 'bg-blue-50' : 'bg-white'}>
                        <td className="py-2 px-4 text-sm text-gray-700">{formatClusterName(n.neighborhood)}</td>
                        <td className="py-2 px-4 text-sm text-gray-700">{n.total}</td>
                        <td className="py-2 px-4 text-sm text-gray-700">{formattedValue}</td>
                        <td className="py-2 px-4 relative">
                          <div className="flex items-center">
                            <div className="group relative">
                              <span 
                                className="inline-block w-3 h-3 rounded-full mr-2 cursor-help"
                                style={{ 
                                  backgroundColor: getCorrelationIndicatorColor(selectedCensusMetric, censusValue, n.total, neighborhoodData)
                                }}
                              ></span>
                              {getCorrelationText(selectedCensusMetric, censusValue, n.total, neighborhoodData).includes('Anomaly') ? (
                                <span className="text-xs font-medium flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                  <span className="text-amber-600">{getCorrelationText(selectedCensusMetric, censusValue, n.total, neighborhoodData)}</span>
                                </span>
                              ) : (
                                <span className="text-xs text-gray-600">
                                  {getCorrelationText(selectedCensusMetric, censusValue, n.total, neighborhoodData)}
                                </span>
                              )}
                              <div className="invisible group-hover:visible absolute z-50 w-72 bg-gray-800 text-white text-xs p-2 rounded mt-1 -ml-2 shadow-lg" 
                                  style={{ 
                                    left: "0", 
                                    transform: index >= 3 ? "translateY(-100%)" : "", 
                                    bottom: index >= 3 ? "24px" : "", 
                                    top: index < 3 ? "24px" : ""
                                  }}>
                                <div className="font-medium mb-1">{getCorrelationTooltipBaseInfo(selectedCensusMetric, censusValue, n.neighborhood)}</div>
                                <div>{getCorrelationTooltipExplanation(selectedCensusMetric, censusValue, n.total, neighborhoodData)}</div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default NeighborhoodAnalysis; 