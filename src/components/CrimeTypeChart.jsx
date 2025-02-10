import React from 'react';
import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell
} from 'recharts';
import ChartCard from './shared/ChartCard';
import { useCrimeData } from '../utils/CrimeDataContext';

// Crime type colors
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

// Crime severity weights
const CRIME_WEIGHTS = {
  'HOMICIDE': 10,
  'ASSAULT W/DANGEROUS WEAPON': 8,
  'ROBBERY': 7,
  'BURGLARY': 6,
  'MOTOR VEHICLE THEFT': 5,
  'THEFT F/AUTO': 4,
  'THEFT/OTHER': 3,
  'default': 2
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-4 border border-gray-200 shadow-lg rounded">
        <p className="font-semibold text-gray-800 mb-2">{data.type}</p>
        <div className="space-y-2">
          <p className="text-sm">
            <span className="text-gray-600">Incidents: </span>
            <span className="font-medium">{data.count.toLocaleString()}</span>
          </p>
          <p className="text-sm">
            <span className="text-gray-600">Percentage: </span>
            <span className="font-medium">{data.percentage}%</span>
          </p>
          <p className="text-sm">
            <span className="text-gray-600">Risk Weight: </span>
            <span className="font-medium">{data.weight}x</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const CrimeTypeChart = () => {
  const { isLoading, error, crimeTypes, rawData } = useCrimeData();

  // Calculate total for percentages
  const total = rawData.length;

  // Prepare data with both count and weight information
  const data = crimeTypes
    .map(type => ({
      type: type.type,
      count: type.count,
      percentage: ((type.count / total) * 100).toFixed(1),
      weight: CRIME_WEIGHTS[type.type] || CRIME_WEIGHTS.default
    }))
    .sort((a, b) => b.count - a.count); // Sort by count descending

  return (
    <div>
      <ChartCard
        title="Crime Type Distribution"
        isLoading={isLoading}
        error={error}
        height="h-[600px]"
      >
        <div className="h-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              layout="vertical"
              data={data}
              margin={{ top: 20, right: 40, left: 120, bottom: 40 }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#f0f0f0" 
                horizontal={false}
              />
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
                dataKey="type"
                type="category"
                width={160}
                tick={{
                  fill: '#666',
                  fontSize: 12
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="count"
                fill="#6366f1"
                radius={[0, 4, 4, 0]}
                barSize={35}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={entry.type}
                    fill={CRIME_COLORS[entry.type] || CRIME_COLORS.default}
                  />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-gray-700 text-sm md:text-base leading-relaxed">
          Crime types are assigned different risk weights based on severity, ranging from 10x for homicide to 3x for general theft.
          These weights are used in risk calculations to identify high-risk areas.
        </p>
      </div>
    </div>
  );
};

export default CrimeTypeChart; 