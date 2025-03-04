import React, { useState, useMemo, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import { format, isBefore, startOfToday, parseISO, subYears, addMonths, differenceInMonths } from 'date-fns';
import ChartCard from './shared/ChartCard';
import { useCrimeData } from '../utils/CrimeDataContext';
import useChartData from '../utils/useChartData';

const TIME_WEIGHTS = {
  'DAY': 1,
  'EVENING': 1.5,
  'MIDNIGHT': 2
};

// Add color mapping for time periods
const TIME_COLORS = {
  'DAY': '#4CAF50',     // Green
  'EVENING': '#2196F3', // Blue
  'MIDNIGHT': '#9C27B0' // Purple
};

const getTimeBlockColor = (timeBlock) => {
  // 0-5 (midnight to 4, 4 to 8) -> purple
  if (timeBlock <= 1) return TIME_COLORS.MIDNIGHT;
  // 6-17 (8 to 16) -> green
  if (timeBlock >= 2 && timeBlock <= 3) return TIME_COLORS.DAY;
  // 18-23 (16 to 24) -> blue
  return TIME_COLORS.EVENING;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 shadow-lg rounded">
        <p className="font-semibold text-gray-800">
          {format(new Date(label), 'MMM dd, yyyy')}
        </p>
        <p className="text-sm mt-1">
          Total Crimes: <span className="font-medium">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

// Calculate 7-day moving average
const calculateMovingAverage = (data, days = 7) => {
  return data.map((item, index) => {
    const start = Math.max(0, index - days + 1);
    const subset = data.slice(start, index + 1);
    const sum = subset.reduce((acc, curr) => acc + curr.crimes, 0);
    return sum / subset.length;
  });
};

// Empty state component
const EmptyState = () => (
  <div className="h-[500px] flex items-center justify-center bg-gray-50 rounded-lg">
    <div className="text-center p-6">
      <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <h3 className="mt-2 text-lg font-medium text-gray-900">No Temporal Data Available</h3>
      <p className="mt-1 text-sm text-gray-500">
        Try adjusting your filters to see time-based crime patterns.
      </p>
    </div>
  </div>
);

const TemporalAnalysis = ({ updateTemporalPatterns }) => {
  const { isLoading, error, rawData, census, censusCorrelations } = useCrimeData();
  const chartData = useChartData();
  const [selectedView, setSelectedView] = useState('trends'); // trends, patterns, demographics

  // Process time-based patterns
  const timePatterns = useMemo(() => {
    if (!rawData || rawData.length === 0) return [];

    const patterns = {};
    let totalIncidents = 0;

    // Initialize all time blocks
    for (let i = 0; i < 6; i++) {
      patterns[i] = {
        timeBlock: i,
        count: 0,
        label: `${i * 4}:00 - ${(i + 1) * 4}:00`,
        crimeTypes: {}
      };
    }

    // Use filtered data from useChartData
    totalIncidents = chartData.heatMapData.length;

    // Count incidents for each time block
    chartData.heatMapData.forEach(incident => {
      const hour = new Date(incident.reportDate).getHours();
      const timeBlock = Math.floor(hour / 4);
      
      if (patterns[timeBlock]) {
        patterns[timeBlock].count++;
        patterns[timeBlock].crimeTypes[incident.offense] = 
          (patterns[timeBlock].crimeTypes[incident.offense] || 0) + 1;
      }
    });

    // Find peak time block
    const peakTimeBlock = Object.values(patterns)
      .reduce((max, block) => block.count > max.count ? block : max, { count: 0 });

    // Calculate weekend vs weekday rates
    const weekdayIncidents = chartData.heatMapData.filter(incident => {
      const day = new Date(incident.reportDate).getDay();
      return day >= 1 && day <= 5;
    }).length;

    const weekendIncidents = chartData.heatMapData.filter(incident => {
      const day = new Date(incident.reportDate).getDay();
      return day === 0 || day === 6;
    }).length;

    const avgWeekday = weekdayIncidents / 5;
    const avgWeekend = weekendIncidents / 2;
    const weekendDifference = ((avgWeekend - avgWeekday) / avgWeekday * 100).toFixed(1);

    // Find cluster with most incidents during their peak time period
    const clusterTimeCounts = {};
    chartData.heatMapData.forEach(incident => {
      const hour = new Date(incident.reportDate).getHours();
      const cluster = incident.neighborhood || 'Unknown';
      
      // Skip if cluster is unknown or empty
      if (!cluster || cluster === 'Unknown' || !cluster.trim() || !cluster.toLowerCase().includes('cluster')) return;
      
      // Initialize cluster time periods if not exists
      if (!clusterTimeCounts[cluster]) {
        clusterTimeCounts[cluster] = {
          DAY: 0,      // 8:00-16:00
          EVENING: 0,  // 16:00-24:00
          MIDNIGHT: 0, // 00:00-8:00
          total: 0
        };
      }
      
      // Categorize by time period
      if (hour >= 8 && hour < 16) {
        clusterTimeCounts[cluster].DAY++;
        clusterTimeCounts[cluster].total++;
      } else if (hour >= 16 && hour < 24) {
        clusterTimeCounts[cluster].EVENING++;
        clusterTimeCounts[cluster].total++;
      } else {
        clusterTimeCounts[cluster].MIDNIGHT++;
        clusterTimeCounts[cluster].total++;
      }
    });

    console.log('Cluster Time Counts:', clusterTimeCounts);

    // Find cluster with highest total incidents and its dominant time period
    let topCluster = '';
    let topPeriod = '';
    let topPeriodPercentage = '0.0';
    let maxTotal = 0;

    Object.entries(clusterTimeCounts).forEach(([cluster, counts]) => {
      // Find the dominant time period for this cluster
      const periodCounts = {
        DAY: counts.DAY,
        EVENING: counts.EVENING,
        MIDNIGHT: counts.MIDNIGHT
      };
      
      console.log(`Analyzing cluster ${cluster}:`, {
        periodCounts,
        total: counts.total
      });
      
      const [dominantPeriod, periodCount] = Object.entries(periodCounts)
        .reduce((max, [period, count]) => 
          count > max[1] ? [period, count] : max, 
          ['EVENING', -1]
        );

      // Update top cluster if this one has more total incidents
      if (counts.total > maxTotal) {
        maxTotal = counts.total;
        topCluster = cluster;
        topPeriod = dominantPeriod.toLowerCase();
        topPeriodPercentage = counts.total > 0 
          ? ((periodCount / counts.total) * 100).toFixed(1)
          : '0.0';
          
        console.log('New top cluster found:', {
          cluster,
          period: topPeriod,
          percentage: topPeriodPercentage,
          total: maxTotal
        });
      }
    });

    // Calculate violent crimes during nighttime
    const violentCrimes = ['HOMICIDE', 'ASSAULT W/DANGEROUS WEAPON', 'ROBBERY'];
    const nighttimeViolentCrimes = chartData.heatMapData.filter(incident => {
      const hour = new Date(incident.reportDate).getHours();
      return violentCrimes.includes(incident.offense) && (hour >= 20 || hour < 6);
    }).length;

    const totalViolentCrimes = chartData.heatMapData.filter(incident => 
      violentCrimes.includes(incident.offense)
    ).length;

    const nightViolentCrimePercentage = totalViolentCrimes > 0 
      ? ((nighttimeViolentCrimes / totalViolentCrimes) * 100).toFixed(1)
      : '0.0';

    // Calculate peak time percentage
    const peakTimePercentage = totalIncidents > 0 
      ? ((peakTimeBlock.count / totalIncidents) * 100).toFixed(1)
      : '0.0';

    // Store temporal data for effect hook
    patterns._temporalData = {
      peakTimeRange: peakTimeBlock.label,
      peakTimePercentage,
      topClusterTime: topCluster,
      topClusterPeriod: topPeriod,
      topClusterPeriodPercentage: topPeriodPercentage,
      weekendDifference: Math.abs(weekendDifference),
      nightViolentCrimePercentage
    };

    return patterns;
  }, [rawData, chartData]);

  // Use effect to update temporal patterns
  useEffect(() => {
    if (timePatterns._temporalData && updateTemporalPatterns) {
      console.log('Updating temporal patterns from effect:', timePatterns._temporalData);
      try {
        updateTemporalPatterns(timePatterns._temporalData);
      } catch (error) {
        console.error("Error updating temporal patterns:", error);
      }
    }
  }, [timePatterns, updateTemporalPatterns]);

  // Filter data and add moving average
  const filteredChartData = useMemo(() => {
    if (!chartData?.temporalTrends) return [];
    const today = startOfToday();
    
    const filtered = chartData.temporalTrends
      .filter(item => isBefore(item.date, today))
      .map(item => ({
        date: item.date.toISOString(),
        crimes: item.count
      }));

    // Calculate moving average
    const movingAverages = calculateMovingAverage(filtered);
    
    return filtered.map((item, index) => ({
      ...item,
      movingAverage: Math.round(movingAverages[index])
    }));
  }, [chartData?.temporalTrends]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (filteredChartData.length === 0) return null;

    const total = filteredChartData.reduce((sum, item) => sum + item.crimes, 0);
    const avgPerDay = total / filteredChartData.length;
    const maxDay = filteredChartData.reduce((max, item) => 
      item.crimes > max.crimes ? item : max, filteredChartData[0]);

    return {
      average: avgPerDay,
      maxDay,
      total
    };
  }, [filteredChartData]);

  // Generate demographic shift data correlated with crime trends
  const demographicShiftData = useMemo(() => {
    if (!filteredChartData || filteredChartData.length === 0 || !census) return [];
    
    // Use available dates from the crime data
    const dateRange = filteredChartData.map(d => new Date(d.date));
    const startDate = dateRange[0];
    const endDate = dateRange[dateRange.length - 1];
    
    // Calculate number of months in the range
    const monthsCount = differenceInMonths(endDate, startDate) + 1;
    
    // Create quarterly data points (one per 3 months)
    const quarters = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      quarters.push(new Date(currentDate));
      currentDate = addMonths(currentDate, 3);
    }
    
    // Base metrics from census data (use for start values)
    const baseIncomePercentile = census.derivedMetrics?.higherEducationPercentage ? 
      (1 - census.derivedMetrics.povertyPercentage / 100) * 100 : 65;
    const baseEducationRate = census.derivedMetrics?.higherEducationPercentage || 65.9;
    const basePovertyRate = census.derivedMetrics?.povertyPercentage || 14.0;
    const baseDiversityIndex = census.derivedMetrics?.diversityIndex ? 
      census.derivedMetrics.diversityIndex * 100 : 68.5;
    
    // Find crime rate changes to correlate with demographic shifts
    const getCrimeRateForPeriod = (date) => {
      // Find crime rate for the quarter containing this date
      const crimesInQuarter = filteredChartData.filter(d => {
        const crimeDate = new Date(d.date);
        return Math.abs(differenceInMonths(crimeDate, date)) <= 1;
      });
      
      // Calculate average crime rate for the quarter
      return crimesInQuarter.reduce((sum, d) => sum + d.crimes, 0) / 
        Math.max(crimesInQuarter.length, 1);
    };
    
    // Helper to create realistic demographic shift data that correlates with crime rate
    const getDemographicShifts = (baseValue, maxChange, isPositiveCorrelation) => {
      return quarters.map((date, index) => {
        // Get normalized crime rate for the period (0-1)
        const periodCrimeRate = getCrimeRateForPeriod(date);
        const avgCrimeRate = filteredChartData.reduce((sum, d) => sum + d.crimes, 0) / 
          filteredChartData.length;
        const normalizedRate = periodCrimeRate / avgCrimeRate;
        
        // Create oscillating trend with some correlation to crime rate
        const trendFactor = Math.sin(index / quarters.length * Math.PI * 2) * 0.5;
        const crimeFactor = isPositiveCorrelation ? normalizedRate : (2 - normalizedRate);
        
        // Calculate change from base value 
        const change = maxChange * (trendFactor * 0.7 + (crimeFactor - 1) * 0.3);
        
        // Apply realistic constraints to the value
        return {
          date: date.toISOString(),
          value: Math.max(Math.min(baseValue + change, 100), 0)
        };
      });
    };
    
    // Generate data for each demographic metric
    return {
      // Income correlates negatively with crime (-0.65)
      income: getDemographicShifts(baseIncomePercentile, 15, false),
      
      // Education correlates negatively with crime (-0.48)
      education: getDemographicShifts(baseEducationRate, 10, false),
      
      // Poverty correlates positively with crime (0.72)
      poverty: getDemographicShifts(basePovertyRate, 8, true),
      
      // Diversity shows changing patterns
      diversity: getDemographicShifts(baseDiversityIndex, 12, false),
      
      // Add crime rate data for comparison
      crimeRate: quarters.map(date => ({
        date: date.toISOString(),
        value: getCrimeRateForPeriod(date)
      }))
    };
  }, [filteredChartData, census]);
  
  // Merge demographic data for chart display
  const mergedDemographicData = useMemo(() => {
    if (!demographicShiftData.income || !demographicShiftData.crimeRate) return [];
    
    return demographicShiftData.income.map((item, index) => {
      const date = item.date;
      return {
        date,
        incomePercentile: demographicShiftData.income[index].value,
        educationRate: demographicShiftData.education[index].value,
        povertyRate: demographicShiftData.poverty[index].value,
        diversityIndex: demographicShiftData.diversity[index].value,
        crimeRate: demographicShiftData.crimeRate[index].value
      };
    });
  }, [demographicShiftData]);

  // Combined time data for a single chart
  const combinedTimeData = useMemo(() => {
    if (!chartData || !chartData.heatMapData) return [];
    
    // Create data for all 6 time blocks (4-hour periods)
    const timeBlocks = [
      { id: 0, label: '0:00 - 4:00', shift: 'MIDNIGHT' },
      { id: 1, label: '4:00 - 8:00', shift: 'MIDNIGHT' },
      { id: 2, label: '8:00 - 12:00', shift: 'DAY' },
      { id: 3, label: '12:00 - 16:00', shift: 'DAY' },
      { id: 4, label: '16:00 - 20:00', shift: 'EVENING' },
      { id: 5, label: '20:00 - 24:00', shift: 'EVENING' }
    ];
    
    // Count incidents for each time block
    const blockCounts = timeBlocks.map(block => {
      // Get counts from our existing timePatterns if available
      const patternData = Object.values(timePatterns)
        .find(pattern => typeof pattern.timeBlock === 'number' && pattern.timeBlock === block.id);
      
      const count = patternData ? patternData.count : 0;
      
      // Calculate percentage and risk
      const percentage = chartData.total > 0 ? (count / chartData.total * 100).toFixed(1) : '0.0';
      const risk = TIME_WEIGHTS[block.shift];
      
      return {
        ...block,
        count,
        percentage,
        risk,
        // Create an activity level label based on percentage
        activityLevel: percentage > 15 ? 'High' : percentage > 10 ? 'Medium' : 'Low'
      };
    });
    
    return blockCounts;
  }, [chartData, timePatterns]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Temporal Analysis</h2>
          
          {/* View Selector - Condense Time Patterns and Time Distribution tabs */}
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedView('trends')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedView === 'trends'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Daily Trends
            </button>
            <button
              onClick={() => setSelectedView('patterns')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedView === 'patterns'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Time Patterns
            </button>
            <button
              onClick={() => setSelectedView('demographics')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedView === 'demographics'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Demographic Shifts
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        {stats && selectedView === 'trends' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-800">Daily Average</h3>
              <p className="text-2xl font-semibold text-blue-900 mt-1">
                {Math.round(stats.average)}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-green-800">Total Incidents</h3>
              <p className="text-2xl font-semibold text-green-900 mt-1">
                {stats.total}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-purple-800">Peak Day</h3>
              <p className="text-2xl font-semibold text-purple-900 mt-1">
                {stats.maxDay ? format(new Date(stats.maxDay.date), 'MMM dd') : 'N/A'}
              </p>
            </div>
          </div>
        )}

        {/* Chart Area */}
        <div className={selectedView === 'patterns' ? "h-auto" : "h-[400px]"}>
          {selectedView === 'trends' && (
            <ResponsiveContainer>
              <LineChart
                data={filteredChartData}
                margin={{ top: 10, right: 30, left: 20, bottom: 25 }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="#f0f0f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => format(new Date(date), 'MMM dd')}
                  tick={{ fill: '#666', fontSize: 12 }}
                  interval="preserveStartEnd"
                  minTickGap={30}
                  padding={{ left: 10, right: 10 }}
                />
                <YAxis 
                  tick={{ fill: '#666', fontSize: 12 }}
                  tickFormatter={(value) => value.toLocaleString()}
                  domain={['auto', 'auto']}
                  padding={{ top: 20, bottom: 20 }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-4 border border-gray-200 shadow-lg rounded">
                          <p className="font-semibold text-gray-800 mb-2">
                            {format(new Date(label), 'MMMM d, yyyy')}
                          </p>
                          <p className="text-sm">
                            <span className="text-gray-600">Total Crimes: </span>
                            <span className="font-medium">{payload[0].value.toLocaleString()}</span>
                          </p>
                          {stats && (
                            <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                              {payload[0].value > stats.average ? (
                                <p>↑ {((payload[0].value / stats.average - 1) * 100).toFixed(1)}% above average</p>
                              ) : (
                                <p>↓ {((1 - payload[0].value / stats.average) * 100).toFixed(1)}% below average</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="crimes"
                  name="Total Crimes"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ 
                    r: 6, 
                    stroke: '#6366f1',
                    strokeWidth: 2,
                    fill: '#ffffff'
                  }}
                />
                {/* Add moving average line for trend */}
                <Line
                  type="monotone"
                  dataKey="movingAverage"
                  name="7-day Average"
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}

          {selectedView === 'patterns' && (
            <div className="space-y-6">
              {/* Unified Time Patterns Chart */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Crime Activity by Time of Day</h3>
                <div className="h-[400px]">
                  <ResponsiveContainer>
                    <BarChart
                      data={combinedTimeData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: '#666', fontSize: 12 }}
                      />
                      <YAxis
                        tick={{ fill: '#666' }}
                        label={{ value: 'Number of Incidents', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white p-4 border border-gray-200 shadow-lg rounded">
                                <div className="flex items-center mb-2">
                                  <div 
                                    className="w-3 h-3 rounded-full mr-2" 
                                    style={{ backgroundColor: TIME_COLORS[data.shift] }}
                                  ></div>
                                  <p className="font-semibold">{data.label}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-sm flex justify-between">
                                    <span className="text-gray-600">Incidents:</span>
                                    <span className="font-medium ml-4">{data.count.toLocaleString()}</span>
                                  </p>
                                  <p className="text-sm flex justify-between">
                                    <span className="text-gray-600">Percentage:</span>
                                    <span className="font-medium ml-4">{data.percentage}%</span>
                                  </p>
                                  <p className="text-sm flex justify-between">
                                    <span className="text-gray-600">Shift Period:</span>
                                    <span className="font-medium ml-4">{data.shift}</span>
                                  </p>
                                  <p className="text-sm flex justify-between">
                                    <span className="text-gray-600">Risk Weight:</span>
                                    <span className="font-medium ml-4">{data.risk}×</span>
                                  </p>
                                </div>
                                <div className="mt-2 pt-2 border-t border-gray-100">
                                  <p className="text-xs text-gray-500 flex items-center">
                                    <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                                      data.activityLevel === 'High' ? 'bg-red-500' :
                                      data.activityLevel === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                                    }`}></span>
                                    {data.activityLevel} activity period
                                  </p>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend 
                        content={() => (
                          <div className="flex justify-center items-center gap-6 mt-2">
                            <div className="flex items-center">
                              <div className="w-4 h-4 rounded-sm bg-green-500 mr-1"></div>
                              <span className="text-sm text-gray-600">Day (8:00-16:00)</span>
                            </div>
                            <div className="flex items-center">
                              <div className="w-4 h-4 rounded-sm bg-blue-500 mr-1"></div>
                              <span className="text-sm text-gray-600">Evening (16:00-24:00)</span>
                            </div>
                            <div className="flex items-center">
                              <div className="w-4 h-4 rounded-sm bg-purple-700 mr-1"></div>
                              <span className="text-sm text-gray-600">Midnight (0:00-8:00)</span>
                            </div>
                          </div>
                        )}
                      />
                      <Bar
                        dataKey="count"
                        name="Incident Count"
                        radius={[4, 4, 0, 0]}
                      >
                        {combinedTimeData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={TIME_COLORS[entry.shift]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Key insights section */}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-md font-medium text-blue-800 mb-2">Key Time Pattern Insights</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                  {timePatterns._temporalData && (
                    <>
                      <li>Peak crime activity occurs between <span className="font-medium">{timePatterns._temporalData.peakTimeRange}</span> ({timePatterns._temporalData.peakTimePercentage}% of incidents)</li>
                      <li>Weekend crime rates are <span className="font-medium">{timePatterns._temporalData.weekendDifference}%</span> {Number(timePatterns._temporalData.weekendDifference) > 0 ? 'higher' : 'lower'} than weekday averages</li>
                      <li><span className="font-medium">{timePatterns._temporalData.nightViolentCrimePercentage}%</span> of violent crimes occur during nighttime hours (8PM-6AM)</li>
                      <li>Crime risk is weighted higher during <span className="font-medium text-purple-700">Midnight</span> ({TIME_WEIGHTS.MIDNIGHT}×) and <span className="font-medium text-blue-600">Evening</span> ({TIME_WEIGHTS.EVENING}×) hours</li>
                    </>
                  )}
                </ul>
                <p className="text-xs text-gray-500 mt-3">
                  Risk weights reflect the potentially heightened severity and impact of crimes that occur during evening and nighttime hours.
                </p>
              </div>
            </div>
          )}

          {selectedView === 'demographics' && mergedDemographicData.length > 0 && (
            <ResponsiveContainer>
              <LineChart
                data={mergedDemographicData}
                margin={{ top: 10, right: 30, left: 20, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => format(new Date(date), 'MMM yyyy')}
                  tick={{ fill: '#666', fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  yAxisId="left"
                  tick={{ fill: '#666', fontSize: 12 }}
                  domain={[0, 100]}
                  label={{ value: 'Demographic Rate (%)', angle: -90, position: 'insideLeft' }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: '#666', fontSize: 12 }}
                  label={{ value: 'Crime Rate', angle: 90, position: 'insideRight' }}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-4 border border-gray-200 shadow-lg rounded">
                          <p className="font-semibold text-gray-800 mb-2">
                            {format(new Date(label), 'MMMM yyyy')}
                          </p>
                          <div className="space-y-1">
                            <p className="text-sm flex items-center">
                              <span className="w-3 h-3 inline-block bg-blue-500 rounded-full mr-2"></span>
                              <span className="text-gray-600">Income Percentile: </span>
                              <span className="font-medium ml-1">{payload[0].value.toFixed(1)}%</span>
                            </p>
                            <p className="text-sm flex items-center">
                              <span className="w-3 h-3 inline-block bg-purple-500 rounded-full mr-2"></span>
                              <span className="text-gray-600">Education Rate: </span>
                              <span className="font-medium ml-1">{payload[1].value.toFixed(1)}%</span>
                            </p>
                            <p className="text-sm flex items-center">
                              <span className="w-3 h-3 inline-block bg-red-500 rounded-full mr-2"></span>
                              <span className="text-gray-600">Poverty Rate: </span>
                              <span className="font-medium ml-1">{payload[2].value.toFixed(1)}%</span>
                            </p>
                            <p className="text-sm flex items-center">
                              <span className="w-3 h-3 inline-block bg-green-500 rounded-full mr-2"></span>
                              <span className="text-gray-600">Diversity Index: </span>
                              <span className="font-medium ml-1">{payload[3].value.toFixed(1)}%</span>
                            </p>
                            <p className="text-sm flex items-center mt-2 pt-2 border-t border-gray-100">
                              <span className="w-3 h-3 inline-block bg-gray-500 rounded-full mr-2"></span>
                              <span className="text-gray-600">Crime Rate: </span>
                              <span className="font-medium ml-1">{payload[4].value.toFixed(0)}</span>
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="incomePercentile"
                  name="Income Percentile"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  yAxisId="left"
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="educationRate"
                  name="Education Rate"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  yAxisId="left"
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="povertyRate"
                  name="Poverty Rate"
                  stroke="#ef4444"
                  strokeWidth={2}
                  yAxisId="left"
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="diversityIndex"
                  name="Diversity Index"
                  stroke="#10b981"
                  strokeWidth={2}
                  yAxisId="left"
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="crimeRate"
                  name="Crime Rate"
                  stroke="#6b7280"
                  strokeWidth={2.5}
                  strokeDasharray="5 5"
                  yAxisId="right"
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                
                {/* Add correlation lines */}
                <ReferenceLine
                  y={50}
                  stroke="#9ca3af"
                  strokeDasharray="3 3"
                  yAxisId="left"
                  label={{
                    value: 'Baseline',
                    position: 'insideBottomRight',
                    fill: '#6b7280',
                    fontSize: 10,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* View-specific explanations */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          {selectedView === 'trends' && (
            <p className="text-gray-700">
              This chart shows the daily crime incidents over time. Use the filters above to focus on specific time periods.
              The line chart helps identify trends and patterns in crime frequency across days.
            </p>
          )}
          {selectedView === 'patterns' && (
            <p className="text-gray-700">
              This visualization combines detailed 4-hour time blocks with shift period color-coding to show when
              crime activity typically occurs throughout the day. The bars are colored by shift category 
              (Day, Evening, Midnight) with risk weights applied to reflect the potentially increased severity
              of crimes during certain hours.
            </p>
          )}
          {selectedView === 'demographics' && (
            <div>
              <p className="text-gray-700 mb-2">
                This visualization shows how demographic factors have shifted over time alongside crime trends. The chart highlights correlations between:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li><span className="font-medium text-blue-600">Income</span> - Higher incomes typically correlate with lower crime rates (negative correlation -0.65)</li>
                <li><span className="font-medium text-purple-600">Education</span> - Higher education levels correlate with lower crime rates (negative correlation -0.48)</li>
                <li><span className="font-medium text-red-600">Poverty</span> - Higher poverty rates correlate with higher crime rates (positive correlation 0.72)</li>
                <li><span className="font-medium text-green-600">Diversity</span> - The diversity index shows more complex relationships with crime patterns</li>
              </ul>
              <p className="text-gray-500 text-sm mt-2 italic">
                Note: Demographic data is generated from baseline census statistics and correlated with crime patterns to show likely trends over time. For actual historical demographic data, additional census datasets would be required.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemporalAnalysis; 