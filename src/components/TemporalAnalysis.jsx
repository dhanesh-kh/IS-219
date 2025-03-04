import React, { useState, useMemo, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell
} from 'recharts';
import { format, isBefore, startOfToday, parseISO } from 'date-fns';
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
  const { isLoading, error, rawData } = useCrimeData();
  const chartData = useChartData();
  const [selectedView, setSelectedView] = useState('trends'); // trends, patterns, distribution

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

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Temporal Analysis</h2>
          
          {/* View Selector */}
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
              onClick={() => setSelectedView('distribution')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedView === 'distribution'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Time Distribution
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
        <div className="h-[400px]">
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
            <ResponsiveContainer>
              <BarChart
                data={Object.values(timePatterns)
                  .filter(pattern => typeof pattern.timeBlock === 'number')
                  .sort((a, b) => a.timeBlock - b.timeBlock)}
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
                      const percentage = ((data.count / chartData.total) * 100).toFixed(1);
                      const timeRange = data.label;
                      return (
                        <div className="bg-white p-3 border border-gray-200 shadow-lg rounded">
                          <p className="font-semibold">{timeRange}</p>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm">
                              <span className="text-gray-600">Incidents: </span>
                              <span className="font-medium">{data.count.toLocaleString()}</span>
                            </p>
                            <p className="text-sm">
                              <span className="text-gray-600">Percentage: </span>
                              <span className="font-medium">{percentage}%</span>
                            </p>
                            <p className="text-sm text-gray-500">
                              {percentage > 15 ? 'High activity period' : 
                               percentage > 10 ? 'Moderate activity period' : 
                               'Low activity period'}
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="count"
                  name="Incident Count"
                  radius={[4, 4, 0, 0]}
                >
                  {Object.values(timePatterns)
                    .filter(pattern => typeof pattern.timeBlock === 'number')
                    .sort((a, b) => a.timeBlock - b.timeBlock)
                    .map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={getTimeBlockColor(entry.timeBlock)}
                      />
                    ))
                  }
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {selectedView === 'distribution' && (
            <ResponsiveContainer>
              <BarChart
                data={['DAY', 'EVENING', 'MIDNIGHT'].map(shift => {
                  const shiftData = chartData.timeDistribution.find(d => d.shift === shift);
                  return {
                    shift,
                    count: shiftData ? shiftData.count : 0,
                    percentage: shiftData ? ((shiftData.count / chartData.total) * 100).toFixed(1) : '0.0',
                    weight: TIME_WEIGHTS[shift]
                  };
                })}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="shift"
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
                        <div className="bg-white p-3 border border-gray-200 shadow-lg rounded">
                          <p className="font-semibold">{data.shift}</p>
                          <p className="text-sm">Incidents: {data.count}</p>
                          <p className="text-sm">Percentage: {data.percentage}%</p>
                          <p className="text-sm">Weight Multiplier: {data.weight}x</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="count"
                  name="Incident Count"
                  radius={[4, 4, 0, 0]}
                >
                  {['DAY', 'EVENING', 'MIDNIGHT'].map(shift => (
                    <Cell key={shift} fill={TIME_COLORS[shift]} />
                  ))}
                </Bar>
              </BarChart>
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
              This visualization breaks down crime incidents by 4-hour time blocks throughout the day.
              It helps identify which times of day typically see higher crime activity.
            </p>
          )}
          {selectedView === 'distribution' && (
            <p className="text-gray-700">
              Time weights are used in risk calculations, with higher weights assigned to evening and midnight hours
              due to potentially increased risk during these periods.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemporalAnalysis; 