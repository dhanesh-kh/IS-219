import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { useCrimeData } from '../utils/CrimeDataContext';

// Crime color mapping
const CRIME_COLORS = {
  'HOMICIDE': '#e53e3e',
  'ASSAULT W/DANGEROUS WEAPON': '#dd6b20',
  'SEX ABUSE': '#805ad5',
  'ROBBERY': '#d69e2e',
  'BURGLARY': '#3182ce',
  'THEFT F/AUTO': '#38a169',
  'THEFT/OTHER': '#0d9488',
  'MOTOR VEHICLE THEFT': '#6366f1',
  'ARSON': '#e11d48',
  'UNKNOWN': '#718096',
  'default': '#718096'
};

// Crime severity weights
const CRIME_WEIGHTS = {
  'HOMICIDE': 10,
  'ASSAULT W/DANGEROUS WEAPON': 8,
  'SEX ABUSE': 8,
  'ROBBERY': 7,
  'BURGLARY': 5,
  'MOTOR VEHICLE THEFT': 4,
  'THEFT F/AUTO': 3,
  'THEFT/OTHER': 2,
  'ARSON': 6,
  'UNKNOWN': 1,
  'default': 1
};

const CrimeTypeChart = () => {
  const { crimeTypes, rawData, census, showCensusOverlay, selectedCensusMetric } = useCrimeData();
  // Always sort by count (frequency) since the UI element has been removed
  const [sortBy] = useState('count'); 
  const [chartOrientation, setChartOrientation] = useState('horizontal'); // 'vertical' or 'horizontal'
  
  // Enhanced debug logging only in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Raw Crime Types Data:', crimeTypes);
      
      // Check what keys are in the objects
      if (crimeTypes && crimeTypes.length > 0) {
        console.log('Crime Type object keys:', Object.keys(crimeTypes[0]));
      }
      
      // Check for Unknown values
      const unknownTypes = crimeTypes?.filter(type =>
        type.offense === 'UNKNOWN' || type.offense === 'Unknown'
      );
      
      if (unknownTypes && unknownTypes.length > 0) {
        console.log('Found Unknown crime types:', unknownTypes);
      }
    }
  }, [crimeTypes]);

  // Sample correlation data (in a real app, this would come from analysis)
  const censusCorrelations = {
    'income': {
      'HOMICIDE': -0.78,
      'ASSAULT W/DANGEROUS WEAPON': -0.72,
      'SEX ABUSE': -0.65,
      'ROBBERY': -0.70,
      'BURGLARY': -0.58,
      'MOTOR VEHICLE THEFT': -0.52,
      'THEFT F/AUTO': -0.47,
      'THEFT/OTHER': -0.42,
      'ARSON': -0.61,
      'UNKNOWN': 0
    },
    'education': {
      'HOMICIDE': -0.82,
      'ASSAULT W/DANGEROUS WEAPON': -0.75,
      'SEX ABUSE': -0.68,
      'ROBBERY': -0.72,
      'BURGLARY': -0.60,
      'MOTOR VEHICLE THEFT': -0.56,
      'THEFT F/AUTO': -0.48,
      'THEFT/OTHER': -0.40,
      'ARSON': -0.63,
      'UNKNOWN': 0
    },
    'poverty': {
      'HOMICIDE': 0.84,
      'ASSAULT W/DANGEROUS WEAPON': 0.79,
      'SEX ABUSE': 0.65,
      'ROBBERY': 0.74,
      'BURGLARY': 0.62,
      'MOTOR VEHICLE THEFT': 0.58,
      'THEFT F/AUTO': 0.50,
      'THEFT/OTHER': 0.48,
      'ARSON': 0.66,
      'UNKNOWN': 0
    },
    'housing': {
      'HOMICIDE': -0.75,
      'ASSAULT W/DANGEROUS WEAPON': -0.68,
      'SEX ABUSE': -0.60,
      'ROBBERY': -0.65,
      'BURGLARY': -0.72,
      'MOTOR VEHICLE THEFT': -0.67,
      'THEFT F/AUTO': -0.54,
      'THEFT/OTHER': -0.52,
      'ARSON': -0.59,
      'UNKNOWN': 0
    },
    'race': {
      'HOMICIDE': 0.35,
      'ASSAULT W/DANGEROUS WEAPON': 0.32,
      'SEX ABUSE': 0.15,
      'ROBBERY': 0.28,
      'BURGLARY': 0.22,
      'MOTOR VEHICLE THEFT': 0.18,
      'THEFT F/AUTO': 0.10,
      'THEFT/OTHER': 0.08,
      'ARSON': 0.12,
      'UNKNOWN': 0
    }
  };

  // Calculate total for percentages
  const total = rawData?.length || 0;

  // Prepare chart data
  const chartData = useMemo(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Preparing chart data with crime types:', crimeTypes);
    }
    
    if (!crimeTypes || crimeTypes.length === 0) {
      return [];
    }

    try {
      // Transform crimeTypes into the format we need
      let data = crimeTypes.map(type => {
        // Ensure we have the correct property names
        const offenseValue = type.offense || type.type || 'UNKNOWN';
        const count = type.count || 0;
        
        // Format offense name for display (make more readable)
        const formattedOffense = offenseValue
          .split('/')
          .join(' / ')
          .replace('W/', 'WITH ')
          .replace('F/AUTO', 'FROM AUTO');
          
        return {
          offense: offenseValue, // Keep original for references
          formattedOffense, // Use for display
          count: count,
          percentage: ((count / (total || 1)) * 100).toFixed(1),
          weight: CRIME_WEIGHTS[offenseValue] || CRIME_WEIGHTS.default
        };
      });
      
      // Sort based on user preference
      if (sortBy === 'count') {
        data.sort((a, b) => b.count - a.count);
      } else if (sortBy === 'alphabetical') {
        data.sort((a, b) => a.formattedOffense.localeCompare(b.formattedOffense));
      } else if (sortBy === 'severity') {
        data.sort((a, b) => b.weight - a.weight);
      }

      // Add correlation data if census overlay is enabled
      if (showCensusOverlay && selectedCensusMetric && census) {
        data = data.map(item => ({
          ...item,
          correlation: censusCorrelations[selectedCensusMetric]?.[item.offense] || 0
        }));
      }

      // Limit to top 10 crimes for better visualization if there are many types
      if (data.length > 10 && sortBy === 'count') {
        data = data.slice(0, 10);
      }

      return data;
    } catch (error) {
      console.error('Error processing crime type data:', error);
      return [];
    }
  }, [crimeTypes, sortBy, showCensusOverlay, selectedCensusMetric, census, total]);

  const getCorrelationColor = (value) => {
    if (value === 0) return '#9ca3af'; // Gray for no correlation
    if (value > 0) return value > 0.5 ? '#ef4444' : '#f87171'; // Red shades for positive
    return value < -0.5 ? '#10b981' : '#34d399'; // Green shades for negative
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
      
    return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <div className="flex items-center mb-2">
            <div
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: CRIME_COLORS[data.offense] || CRIME_COLORS.default }}
            ></div>
            <p className="font-semibold text-gray-800">{data.formattedOffense}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-1">
            <div className="bg-blue-50 p-1.5 rounded">
              <p className="text-xs text-gray-500">Count</p>
              <p className="font-semibold text-gray-900">{data.count.toLocaleString()}</p>
            </div>
            <div className="bg-blue-50 p-1.5 rounded">
              <p className="text-xs text-gray-500">Percentage</p>
              <p className="font-semibold text-gray-900">{data.percentage}%</p>
            </div>
          </div>
          
          <div className="mt-1 bg-gray-50 p-1.5 rounded">
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">Severity Index</p>
              <div className="flex items-center">
                {Array.from({ length: Math.min(data.weight, 5) }).map((_, i) => (
                  <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span className="ml-1 text-xs text-gray-700">{data.weight}/10</span>
              </div>
            </div>
          </div>
          
          {showCensusOverlay && data.correlation !== undefined && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-700 font-medium mb-1">
                {selectedCensusMetric.charAt(0).toUpperCase() + selectedCensusMetric.slice(1)} Correlation
              </p>
              <div className="flex items-center">
                <span
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: getCorrelationColor(data.correlation) }}
                ></span>
                <span className="text-sm font-medium">
                  {data.correlation > 0 ? '+' : ''}{data.correlation.toFixed(2)}
                </span>
                <span className="ml-1 text-xs text-gray-500">
                  ({data.correlation > 0 ? 'positive' : data.correlation < 0 ? 'negative' : 'no'})
                </span>
              </div>
              <p className="text-xs mt-1 text-gray-500">
                {data.correlation > 0 ?
                  `Higher ${selectedCensusMetric} areas tend to have more ${data.formattedOffense.toLowerCase()} incidents` :
                  data.correlation < 0 ?
                  `Lower ${selectedCensusMetric} areas tend to have more ${data.formattedOffense.toLowerCase()} incidents` :
                  `No clear relationship between ${selectedCensusMetric} and ${data.formattedOffense.toLowerCase()}`
                }
          </p>
        </div>
          )}
      </div>
    );
  }
    
  return null;
};

  return (
    <>
      <div className="flex flex-wrap justify-between items-center mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center">
            <button 
              className={`p-1 mr-2 rounded ${chartOrientation === 'vertical' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
              onClick={() => setChartOrientation('vertical')}
              title="Vertical bars"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v10M12 4v13M16 10v7M20 7v10" />
              </svg>
            </button>
            <button 
              className={`p-1 rounded ${chartOrientation === 'horizontal' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
              onClick={() => setChartOrientation('horizontal')}
              title="Horizontal bars"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {(!chartData || chartData.length === 0) ? (
        <div className="h-[400px] flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center p-6">
            <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
            <h3 className="mt-2 text-base font-medium text-gray-700">No Crime Data Available</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your filters to see crime type distribution.
            </p>
          </div>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={450}>
            {chartOrientation === 'vertical' ? (
              <BarChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 70
                }}
                barSize={chartData.length > 6 ? 40 : 60}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="formattedOffense"
                  angle={-35}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 11, fill: '#4b5563' }}
                  tickMargin={10}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#4b5563' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={{ stroke: '#e5e7eb' }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(224, 231, 255, 0.2)' }} />
                {/* Legend removed as requested */}
                
                {/* Define gradient for correlation background */}
                <defs>
                  <linearGradient id="correlationGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.1} />
                    <stop offset="50%" stopColor="#ffffff" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                
                <Bar
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                  fill={showCensusOverlay ? "#6366f1" : "#3b82f6"}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={showCensusOverlay ? "#6366f1" : CRIME_COLORS[entry.offense] || CRIME_COLORS.default}
                      stroke={showCensusOverlay ? getCorrelationColor(entry.correlation) : undefined}
                      strokeWidth={showCensusOverlay ? 2 : 0}
                    />
                  ))}
                </Bar>
                
                {/* Add correlation reference line when overlay is active */}
                {showCensusOverlay && (
                  <ReferenceLine
                    y={0}
                    stroke="#9ca3af"
                    strokeDasharray="3 3" 
                    isFront={true}
                  />
                )}
              </BarChart>
            ) : (
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{
                  top: 20,
                  right: 30,
                  left: 150,
                  bottom: 20
                }}
                barSize={20}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#4b5563' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  type="category"
                  dataKey="formattedOffense"
                  tick={{ fontSize: 11, fill: '#4b5563' }}
                  width={140}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={{ stroke: '#e5e7eb' }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(224, 231, 255, 0.2)' }} />
                {/* Legend removed as requested */}
                
                <Bar
                  dataKey="count"
                  radius={[0, 4, 4, 0]}
                  fill={showCensusOverlay ? "#6366f1" : "#3b82f6"}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`}
                      fill={showCensusOverlay ? "#6366f1" : CRIME_COLORS[entry.offense] || CRIME_COLORS.default}
                      stroke={showCensusOverlay ? getCorrelationColor(entry.correlation) : undefined}
                      strokeWidth={showCensusOverlay ? 2 : 0}
                    />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
          
          {/* Legend for correlation colors when overlay is enabled */}
          {showCensusOverlay && (
            <div className="mt-2 pt-3 border-t border-gray-200">
              <p className="text-xs font-medium text-gray-700 mb-2">
                Correlation with {selectedCensusMetric.charAt(0).toUpperCase() + selectedCensusMetric.slice(1)}:
              </p>
              <div className="flex items-center justify-center space-x-6 text-xs">
                <div className="flex items-center">
                  <span className="w-3 h-3 rounded-full bg-red-500 mr-1"></span>
                  <span>Strong Positive</span>
                </div>
                <div className="flex items-center">
                  <span className="w-3 h-3 rounded-full bg-gray-400 mr-1"></span>
                  <span>No Correlation</span>
                </div>
                <div className="flex items-center">
                  <span className="w-3 h-3 rounded-full bg-green-500 mr-1"></span>
                  <span>Strong Negative</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                {selectedCensusMetric === 'poverty' ?
                  'Positive correlation means crime is more common in higher poverty areas' :
                  'Negative correlation means crime is more common in lower ' + selectedCensusMetric + ' areas'}
              </p>
            </div>
          )}
        </>
      )}
    </>
  );
};

export default CrimeTypeChart; 