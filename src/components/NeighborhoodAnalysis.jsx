import React, { useMemo, useEffect } from 'react';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
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

const NeighborhoodAnalysis = ({ updateAreaAnalysis }) => {
  const { isLoading, error, rawData, filters } = useCrimeData();

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
        // Date range filter
        if (filters.dateRange) {
          const { start, end } = filters.dateRange;
          if (incident.reportDate < start || incident.reportDate > end) {
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
          .sort((a, b) => b[1] - a[1])[0]
      };

      // Calculate additional insights
      const totalIncidents = filteredData.length;
      const topAreasTotal = neighborhoodData.reduce((sum, n) => sum + n.total, 0);
      const topAreasPercentage = ((topAreasTotal / totalIncidents) * 100).toFixed(1);

      // Calculate property crime percentage
      const propertyCrimes = ['THEFT/OTHER', 'THEFT F/AUTO', 'BURGLARY', 'MOTOR VEHICLE THEFT'];
      const propertyCrimeCount = filteredData.filter(incident => 
        propertyCrimes.includes(incident.offense)
      ).length;
      const propertyCrimePercentage = ((propertyCrimeCount / totalIncidents) * 100).toFixed(1);

      // Update area analysis insights
      const topCluster = neighborhoodData[0];
      if (topCluster) {
        const topCrimeEntry = Object.entries(topCluster)
          .filter(([key]) => activeCrimeTypes.includes(key))
          .sort((a, b) => b[1] - a[1])[0];

        // Store the analysis data but don't call updateAreaAnalysis here
        const analysisData = {
          topCluster: topCluster.neighborhood,
          totalCrimes: topCluster.total,
          topCrimeType: topCrimeEntry[0],
          topCrimeCount: topCrimeEntry[1],
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
      updateAreaAnalysis?.(analysisData);
    }
  }, [analysisData, updateAreaAnalysis]);

  if (isLoading) {
    return (
      <div className="h-[600px] w-full flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[600px] w-full flex items-center justify-center bg-gray-50 rounded-lg">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!insights || neighborhoodData.length === 0) {
    return (
      <div className="h-[600px] w-full flex items-center justify-center bg-gray-50 rounded-lg">
        <p className="text-gray-600">No neighborhood data available for analysis.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Crime Distribution by Neighborhood</h2>
      <div className="h-[600px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            layout="vertical"
            data={neighborhoodData}
            margin={{ top: 20, right: 120, left: 100, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis 
              type="number"
              tickFormatter={(value) => value.toLocaleString()}
              label={{ 
                value: 'Number of Incidents',
                position: 'bottom',
                offset: 0
              }}
            />
            <YAxis 
              dataKey="neighborhood" 
              type="category"
              width={90}
              tick={{ 
                fill: '#666',
                fontSize: 13
              }}
              tickFormatter={(value) => value.replace('Cluster ', '#')}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              layout="vertical"
              align="right"
              verticalAlign="middle"
              wrapperStyle={{
                paddingLeft: '10px',
                right: 0,
                fontSize: '12px'
              }}
            />
            {activeCrimeTypes.map(crimeType => (
              <Bar
                key={crimeType}
                dataKey={crimeType}
                stackId="a"
                fill={CRIME_COLORS[crimeType]}
                name={crimeType}
                barSize={40}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default NeighborhoodAnalysis; 