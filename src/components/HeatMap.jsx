import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Popup, useMap } from 'react-leaflet';
import { HeatmapLayer } from 'react-leaflet-heatmap-layer-v3';
import 'leaflet/dist/leaflet.css';
import ChartCard from './shared/ChartCard';
import { useCrimeData } from '../utils/CrimeDataContext';
import useChartData from '../utils/useChartData';
import { format } from 'date-fns';

// Crime severity weights (moved from HotspotAnalysis)
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

// Map Reset Component
const MapReset = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 12);
  }, [map, center]);
  return null;
};

const CRIME_COLORS = {
  'THEFT F/AUTO': '#FF5252',
  'THEFT/OTHER': '#FF4081',
  'ASSAULT W/DANGEROUS WEAPON': '#E040FB',
  'ROBBERY': '#7C4DFF',
  'BURGLARY': '#536DFE',
  'MOTOR VEHICLE THEFT': '#448AFF',
  'HOMICIDE': '#F44336',
  'default': '#2196F3'
};

// Memoized circle component for better performance
const CrimeCircle = React.memo(({ point, getCrimeColor }) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseOver = useCallback((e) => {
    e.target.setStyle({ fillOpacity: 0.9, weight: 2 });
    setIsHovered(true);
  }, []);

  const handleMouseOut = useCallback((e) => {
    e.target.setStyle({ fillOpacity: 0.6, weight: 1 });
    setIsHovered(false);
  }, []);

  return (
    <Circle
      center={[point.lat, point.lng]}
      radius={100}
      pathOptions={{
        color: getCrimeColor(point.offense),
        fillColor: getCrimeColor(point.offense),
        fillOpacity: 0.6,
        weight: 1
      }}
      eventHandlers={{
        mouseover: handleMouseOver,
        mouseout: handleMouseOut
      }}
    >
      {isHovered && (
        <Popup>
          <div className="p-2">
            <h3 className="font-semibold">{point.offense}</h3>
            <p className="text-sm text-gray-600">
              {format(new Date(point.reportDate), 'MMM dd, yyyy HH:mm')}
            </p>
            <p className="text-sm text-gray-600">
              Shift: {point.shift}
            </p>
          </div>
        </Popup>
      )}
    </Circle>
  );
});

const HeatMap = ({ updateKeyInsights }) => {
  const { isLoading, error, rawData } = useCrimeData();
  const { heatMapData } = useChartData();
  const [key, setKey] = useState(0);
  const [viewMode, setViewMode] = useState('heatmap');
  const [showRiskPanel, setShowRiskPanel] = useState(false);

  const center = useMemo(() => ({
    lat: 38.9072,
    lng: -77.0369
  }), []);

  const getCrimeColor = useCallback((offense) => {
    return CRIME_COLORS[offense] || CRIME_COLORS.default;
  }, []);

  // Calculate risk-based heatmap points and hotspots
  const locationScores = useMemo(() => {
    const scores = heatMapData.reduce((acc, point) => {
      const locationKey = point.block || 'Unknown Location';
      if (!acc[locationKey]) {
        acc[locationKey] = {
          count: 0,
          riskScore: 0,
          lat: point.lat,
          lng: point.lng,
          incidents: []
        };
      }
      
      // Calculate risk score based on crime type and time of day
      const crimeWeight = CRIME_WEIGHTS[point.offense] || 1;
      const timeWeight = point.shift === 'MIDNIGHT' ? 1.5 : 
                        point.shift === 'EVENING' ? 1.2 : 1;
      const riskContribution = crimeWeight * timeWeight;
      
      acc[locationKey].count++;
      acc[locationKey].riskScore += riskContribution;
      acc[locationKey].incidents.push({
        offense: point.offense,
        shift: point.shift,
        date: point.reportDate
      });
      
      return acc;
    }, {});

    // Update key insights with the calculated scores
    updateKeyInsights?.(scores);

    return scores;
  }, [heatMapData, updateKeyInsights]);

  // Reset map when data changes
  useEffect(() => {
    setKey(prev => prev + 1);
  }, [heatMapData, locationScores]);

  const TIME_COLORS = {
    'DAY': '#4CAF50',     // Green
    'EVENING': '#2196F3', // Blue
    'MIDNIGHT': '#9C27B0' // Purple
  };

  const TIME_ORDER = ['DAY', 'EVENING', 'MIDNIGHT'];

  return (
    <div className="flex flex-col h-[800px]">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Crime Distribution Map</h2>
      <div className="relative h-[600px]">
        {/* View Mode Toggle */}
        <div className="absolute top-2 right-2 z-[1000] bg-white rounded-lg shadow-md">
          <div className="p-2 flex space-x-2">
            <button
              onClick={() => setViewMode('heatmap')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'heatmap'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Heatmap
            </button>
            <button
              onClick={() => setViewMode('markers')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'markers'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Markers
            </button>
          </div>
        </div>

        {/* Map */}
        {!isLoading && !error && (
          <MapContainer
            key={key}
            center={center}
            zoom={12}
            className="h-[600px] w-full rounded-lg"
            preferCanvas={true}
          >
            <MapReset center={center} />
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {viewMode === 'markers' && heatMapData.map((point, index) => (
              <CrimeCircle
                key={`${point.lat}-${point.lng}-${index}`}
                point={point}
                getCrimeColor={getCrimeColor}
              />
            ))}

            {viewMode === 'heatmap' && Object.entries(locationScores).length > 0 && (
              <HeatmapLayer
                points={Object.values(locationScores).map(data => ({
                  lat: data.lat,
                  lng: data.lng,
                  count: data.count,
                  riskScore: data.riskScore
                }))}
                longitudeExtractor={m => m.lng}
                latitudeExtractor={m => m.lat}
                intensityExtractor={m => m.riskScore}
                radius={20}
                max={Math.max(...Object.values(locationScores).map(data => data.riskScore))}
                minOpacity={0.2}
                blur={15}
                gradient={{
                  0.4: '#fee2e2',
                  0.6: '#ef4444',
                  0.8: '#7f1d1d',
                  1.0: '#450a0a'
                }}
              />
            )}
          </MapContainer>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="h-[600px] w-full flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="h-[600px] w-full flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-red-500">{error}</p>
          </div>
        )}
      </div>

      {/* Risk Analysis Panel */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-800">High-Risk Areas Analysis</h3>
        </div>
        <div className="overflow-x-auto">
          <div className="flex space-x-3 pb-2">
            {Object.entries(locationScores)
              .sort(([, a], [, b]) => b.riskScore - a.riskScore)
              .slice(0, 5)
              .map(([location, data], index) => {
                const timeColor = data.incidents.reduce((acc, incident) => {
                  acc[incident.shift] = (acc[incident.shift] || 0) + 1;
                  return acc;
                }, {});
                
                const mostCommonShift = Object.entries(timeColor)
                  .sort((a, b) => b[1] - a[1])[0][0];

                return (
                  <div 
                    key={location}
                    className="flex-shrink-0 w-64 bg-gray-50 rounded-lg border border-gray-100 overflow-hidden hover:border-gray-200 transition-colors"
                  >
                    <div 
                      className="p-3 border-l-4"
                      style={{ borderLeftColor: TIME_COLORS[mostCommonShift] }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-500">#{index + 1}</span>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs font-medium px-2 py-1 bg-white rounded-full shadow-sm">
                            Risk Score: {Math.round(data.riskScore)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-800 break-words line-clamp-2">
                          {location}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{data.count} incidents</span>
                          <span className="flex items-center" 
                                style={{ color: TIME_COLORS[mostCommonShift] }}>
                            <span className="w-2 h-2 rounded-full mr-1" 
                                  style={{ backgroundColor: TIME_COLORS[mostCommonShift] }}></span>
                            {mostCommonShift}
                          </span>
                        </div>

                        <div className="flex space-x-1 mt-1">
                          {TIME_ORDER.map(shift => (
                            <div
                              key={shift}
                              className="h-1 rounded-full"
                              style={{
                                backgroundColor: TIME_COLORS[shift],
                                width: `${((timeColor[shift] || 0) / data.count) * 100}%`,
                                opacity: 0.7
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Risk scores are calculated based on crime type severity (1-10x) and time of day weights (1-2x)
        </p>
      </div>
    </div>
  );
};

export default React.memo(HeatMap); 