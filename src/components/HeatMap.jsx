import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Circle, Popup, useMap, useMapEvents, Marker } from 'react-leaflet';
import { HeatmapLayer } from 'react-leaflet-heatmap-layer-v3';
import 'leaflet/dist/leaflet.css';
import ChartCard from './shared/ChartCard';
import { useCrimeData } from '../utils/CrimeDataContext';
import useChartData from '../utils/useChartData';
import { format } from 'date-fns';
import L from 'leaflet';
import CensusControls from './shared/CensusControls';

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

// Custom icon for markers
const crimeIcon = (type) => {
  // Define colors for different crime types
  const colors = {
    'HOMICIDE': '#e53e3e',
    'ASSAULT W/DANGEROUS WEAPON': '#dd6b20',
    'ROBBERY': '#d69e2e',
    'SEX ABUSE': '#805ad5',
    'BURGLARY': '#3182ce',
    'THEFT F/AUTO': '#38a169',
    'THEFT/OTHER': '#0d9488',
    'MOTOR VEHICLE THEFT': '#6366f1',
    'ARSON': '#e11d48',
    'default': '#718096'
  };

  const color = colors[type] || colors.default;

  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 10px; height: 10px; border-radius: 50%;"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5]
  });
};

// Census data overlay component
const CensusOverlay = ({ selectedMetric, censusData }) => {
  const map = useMap();
  const [overlay, setOverlay] = useState(null);
  const [legendControl, setLegendControl] = useState(null);

  useEffect(() => {
    if (!censusData || !selectedMetric) return;

    // Clean up any existing overlay
    if (overlay) {
      map.removeLayer(overlay);
    }

    // Clean up any existing legend
    if (legendControl) {
      map.removeControl(legendControl);
    }

    // Create enhanced color scales based on the selected metric
    const getColorForMetric = (value, metric) => {
      // Define more beautiful color scales with better transitions
      const colorScales = {
        'income': ['#f7fcf5', '#e5f5e0', '#c7e9c0', '#a1d99b', '#74c476', '#41ab5d', '#238b45', '#006d2c', '#00441b'], // Green (higher is better)
        'education': ['#f1eef6', '#d7b5d8', '#df65b0', '#dd1c77', '#980043'], // Purple to pink
        'poverty': ['#ffffcc', '#ffeda0', '#fed976', '#feb24c', '#fd8d3c', '#fc4e2a', '#e31a1c', '#bd0026', '#800026'], // Yellow to red
        'housing': ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'], // Blues
        'race': ['#f7f4f9', '#e7e1ef', '#d4b9da', '#c994c7', '#df65b0', '#e7298a', '#ce1256', '#980043', '#67001f']  // Purple to pink
      };
      
      // Get more precise color based on value
      const scale = colorScales[metric] || colorScales.income;
      const index = Math.min(Math.floor(value * scale.length), scale.length - 1);
      return scale[index];
    };

    // Create simplified DC neighborhood polygons with the same data
    const neighborhoods = [
      { 
        name: 'Northwest DC', 
        bounds: [
          [38.95, -77.08],
          [38.95, -77.00],
          [38.92, -77.00],
          [38.92, -77.08]
        ],
        metrics: {
          'income': 0.85,
          'education': 0.9,
          'poverty': 0.2,
          'housing': 0.8,
          'race': 0.6
        }
      },
      { 
        name: 'Northeast DC', 
        bounds: [
          [38.95, -77.00],
          [38.95, -76.9],
          [38.92, -76.9],
          [38.92, -77.00]
        ],
        metrics: {
          'income': 0.6,
          'education': 0.65,
          'poverty': 0.4,
          'housing': 0.55,
          'race': 0.8
        }
      },
      { 
        name: 'Southeast DC', 
        bounds: [
          [38.92, -77.00],
          [38.92, -76.9],
          [38.85, -76.9],
          [38.85, -77.00]
        ],
        metrics: {
          'income': 0.3,
          'education': 0.4,
          'poverty': 0.7,
          'housing': 0.25,
          'race': 0.9
        }
      },
      { 
        name: 'Southwest DC', 
        bounds: [
          [38.919, -77.079], // Slightly adjusted to prevent exact boundary overlap
          [38.919, -77.001], // Slightly adjusted to prevent exact boundary overlap
          [38.851, -77.001], // Slightly adjusted to prevent exact boundary overlap
          [38.851, -77.079]  // Slightly adjusted to prevent exact boundary overlap
        ],
        metrics: {
          'income': 0.7,
          'education': 0.75,
          'poverty': 0.3,
          'housing': 0.65,
          'race': 0.7
        }
      }, // Southwest DC bounds adjusted to prevent overlap issues and ensure accessibility
      { 
        name: 'Downtown DC', 
        bounds: [
          [38.905, -77.05],
          [38.905, -77.00],
          [38.89, -77.00],
          [38.89, -77.05]
        ],
        metrics: {
          'income': 0.9,
          'education': 0.85,
          'poverty': 0.15,
          'housing': 0.9,
          'race': 0.5
        }
      }
    ];
    
    // Create a layer group for all neighborhood polygons
    const layerGroup = L.layerGroup();
    
    // Add custom properties to the layer group to help with identification
    layerGroup.options = {
      className: 'census-overlay-group',
      censusLayer: true,
      censusMetric: selectedMetric
    };
    
    // Add each neighborhood polygon
    neighborhoods.forEach((hood, index) => {
      const value = hood.metrics[selectedMetric];
      const color = getColorForMetric(value, selectedMetric);
      
      // Calculate dynamic opacity based on value
      const dynamicOpacity = 0.4 + (value * 0.5); // Scale from 0.4 to 0.9
      
      // Special handling for Southwest DC to ensure it's accessible
      const isSpecialArea = hood.name === 'Southwest DC';
      
      const polygon = L.polygon(hood.bounds, {
        color: 'white',
        weight: 1.5,
        opacity: 0.8,
        fillColor: color,
        fillOpacity: dynamicOpacity,
        dashArray: '3',
        smoothFactor: 1,
        className: isSpecialArea ? 'neighborhood-polygon southwest-dc census-overlay' : 'neighborhood-polygon census-overlay',
        bubblingMouseEvents: false, // Ensure events don't bubble to layers below
        censusLayer: true, // Add a special property to easily identify census layers
        censusMetric: selectedMetric, // Store which metric this layer represents
        zIndexOffset: isSpecialArea ? 1000 : 10, // Give Southwest DC a higher z-index
        pane: 'overlayPane', // Use the overlay pane for better z-index handling
        interactive: true // Ensure the layer can receive events
      });
      
      // Add enhanced hover effect
      polygon.on('mouseover', (e) => {
        const layer = e.target;
        layer.setStyle({
          weight: 3,
          color: '#666',
          dashArray: '',
          fillOpacity: 0.9
        });
        // Explicitly bring this layer to front
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
          layer.bringToFront();
        }
      });
      
      polygon.on('mouseout', (e) => {
        const layer = e.target;
        layer.setStyle({
          weight: 1.5,
          color: 'white',
          dashArray: '3',
          fillOpacity: dynamicOpacity
        });
      });
      
      // Add click handler with information popup
      polygon.on('click', (e) => {
        // Create popup content
        const popupContent = `
          <div class="p-3">
            <h3 class="font-semibold text-gray-800">${hood.name}</h3>
            <div class="mt-2 text-sm font-medium">
              ${selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}: 
              <span class="text-blue-600">${getMetricDisplay(value, selectedMetric)}</span>
            </div>
            <p class="text-xs text-gray-600 mt-2">${getCorrelationText(selectedMetric)}</p>
          </div>
        `;
        
        // Create and open the popup
        L.popup()
          .setLatLng(e.latlng)
          .setContent(popupContent)
          .openOn(map);
      });
      
      // Still add the popup binding for hover behavior
      polygon.bindPopup(`
        <div class="p-3">
          <h3 class="font-semibold text-gray-800">${hood.name}</h3>
          <div class="mt-2 text-sm font-medium">
            ${selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}: 
            <span class="text-blue-600">${getMetricDisplay(value, selectedMetric)}</span>
          </div>
          <p class="text-xs text-gray-600 mt-2">${getCorrelationText(selectedMetric)}</p>
        </div>
      `);
      
      layerGroup.addLayer(polygon);
    });
    
    // Add the layer group to the map
    layerGroup.addTo(map);
    setOverlay(layerGroup);
    
    // Add an enhanced legend
    const legend = L.control({ position: 'bottomright' });
    
    legend.onAdd = function() {
      const div = L.DomUtil.create('div', 'info legend');
      div.style.backgroundColor = 'white';
      div.style.padding = '10px';
      div.style.border = '1px solid rgba(0,0,0,0.2)';
      div.style.borderRadius = '6px';
      div.style.boxShadow = '0 1px 5px rgba(0,0,0,0.4)';
      div.style.fontSize = '12px';
      div.style.lineHeight = '18px';
      
      // Add a title with better styling
      const metricTitle = selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1);
      let legendHtml = `
        <div style="margin-bottom:8px; border-bottom: 1px solid #eee; padding-bottom: 5px">
          <strong style="font-size: 14px; color: #333">${metricTitle} in DC</strong>
          <div style="font-size:10px; color:#666; margin-top:3px;">
            Color intensity indicates ${getMetricDescription(selectedMetric)}
          </div>
        </div>
      `;
      
      // Create a smoother gradient display
      const grades = [0.1, 0.3, 0.5, 0.7, 0.9];
      
      // Loop through our grades and generate a label with a colored square for each interval
      for (let i = 0; i < grades.length; i++) {
        const color = getColorForMetric(grades[i], selectedMetric);
        legendHtml +=
          '<div style="display:flex; align-items:center; margin-top:5px;">' +
          `<span style="display:block; width:15px; height:15px; margin-right:8px; background:${color}; border-radius: 2px; border: 1px solid rgba(0,0,0,0.1)"></span> ` +
          `<span style="color:#444">${getLegendLabel(grades[i], selectedMetric)}</span>` +
          '</div>';
      }
      
      div.innerHTML = legendHtml;
      return div;
    };
    
    legend.addTo(map);
    setLegendControl(legend);
    
    // Return cleanup function
    return () => {
      console.log('CensusOverlay component cleanup');
      if (overlay) {
        try {
          map.removeLayer(overlay);
        } catch (e) {
          console.warn('Error removing overlay layer:', e);
        }
      }
      
      if (legendControl) {
        try {
          map.removeControl(legendControl);
        } catch (e) {
          console.warn('Error removing legend control:', e);
        }
      }
      
      // Also clean up any elements that might have been added to the DOM
      const legends = document.querySelectorAll('.info.legend');
      legends.forEach(legend => {
        legend.remove();
      });
      
      // Clean up any other layers that might be associated with this overlay
      map.eachLayer(layer => {
        if (layer.options && 
            (layer.options.className === 'census-overlay' || 
             layer.options.censusLayer === true)) {
          try {
            map.removeLayer(layer);
          } catch (e) {
            console.warn('Error removing census layer:', e);
          }
        }
      });
    };
  }, [map, censusData, selectedMetric]);
  
  return null;
};

// Helper function to display metric values
const getMetricDisplay = (value, metric) => {
  if (metric === 'income') {
    // Scale from 0-1 to a realistic income range
    const income = Math.round(70000 + (value * 150000));
    return `$${income.toLocaleString()}`;
  } else if (metric === 'education') {
    // Scale to percentage with higher education
    return `${Math.round(value * 100)}% with bachelor's or higher`;
  } else if (metric === 'poverty') {
    // Scale to percentage below poverty line
    return `${Math.round(value * 100)}% below poverty line`;
  } else if (metric === 'housing') {
    // Scale to housing price
    const price = Math.round(300000 + (value * 1200000));
    return `$${price.toLocaleString()} median value`;
  } else if (metric === 'race') {
    // Scale to diversity index
    return `${Math.round(value * 100)}% diversity index`;
  }
  
  return `${Math.round(value * 100)}%`;
};

// Get appropriate legend label based on metric
const getLegendLabel = (value, metric) => {
  if (metric === 'income') {
    const income = Math.round(70000 + (value * 150000));
    return `$${income.toLocaleString()}`;
  } else if (metric === 'education' || metric === 'poverty' || metric === 'race') {
    return `${Math.round(value * 100)}%`;
  } else if (metric === 'housing') {
    const price = Math.round(300000 + (value * 1200000));
    return `$${price.toLocaleString()}`;
  }
  
  return `${Math.round(value * 100)}%`;
};

// Sample correlation text
const getCorrelationText = (metric) => {
  const correlations = {
    'income': 'Strong negative correlation with violent crime (-0.65)',
    'education': 'Moderate negative correlation with property crime (-0.48)',
    'poverty': 'Strong positive correlation with all crime types (0.72)',
    'housing': 'Moderate negative correlation with theft (-0.52)',
    'race': 'No significant correlation with crime patterns (0.15)'
  };
  
  return correlations[metric] || '';
};

// Component for updating map events
const MapEventHandler = ({ onBoundsChange }) => {
  const map = useMapEvents({
    moveend: () => {
      const bounds = map.getBounds();
      onBoundsChange?.(bounds);
    },
    zoomend: () => {
      const bounds = map.getBounds();
      onBoundsChange?.(bounds);
    },
    click: (e) => {
      // First check if this click is handled by a polygon - if so, don't proceed
      // Leaflet automatically handles propagation when clickable objects are present
      
      // Only handle clicks outside of polygons
      // This is determined by checking if the event was stopped by a polygon click handler
      if (e.originalEvent.defaultPrevented || e.originalEvent._stopped) {
        return;
      }
      
      const { lat, lng } = e.latlng;
      
      // Check if click is inside a defined neighborhood
      const neighborhoods = [
        { 
          name: 'Northwest DC', 
          bounds: [
            [38.95, -77.08],
            [38.95, -77.00],
            [38.92, -77.00],
            [38.92, -77.08]
          ],
          metrics: {
            'income': 0.85,
            'education': 0.9,
            'poverty': 0.2,
            'housing': 0.8,
            'race': 0.6
          }
        },
        { 
          name: 'Northeast DC', 
          bounds: [
            [38.95, -77.00],
            [38.95, -76.9],
            [38.92, -76.9],
            [38.92, -77.00]
          ],
          metrics: {
            'income': 0.6,
            'education': 0.65,
            'poverty': 0.4,
            'housing': 0.55,
            'race': 0.8
          }
        },
        { 
          name: 'Southeast DC', 
          bounds: [
            [38.92, -77.00],
            [38.92, -76.9],
            [38.85, -76.9],
            [38.85, -77.00]
          ],
          metrics: {
            'income': 0.3,
            'education': 0.4,
            'poverty': 0.7,
            'housing': 0.25,
            'race': 0.9
          }
        },
        { 
          name: 'Southwest DC', 
          bounds: [
            [38.919, -77.079],
            [38.919, -77.001],
            [38.851, -77.001],
            [38.851, -77.079]
          ],
          metrics: {
            'income': 0.7,
            'education': 0.75,
            'poverty': 0.3,
            'housing': 0.65,
            'race': 0.7
          }
        },
        { 
          name: 'Downtown DC', 
          bounds: [
            [38.905, -77.05],
            [38.905, -77.00],
            [38.89, -77.00],
            [38.89, -77.05]
          ],
          metrics: {
            'income': 0.9,
            'education': 0.85,
            'poverty': 0.15,
            'housing': 0.9,
            'race': 0.5
          }
        }
      ];

      // Find which neighborhood contains this point
      const neighborhood = neighborhoods.find(hood => {
        const [[maxLat, minLng], [maxLat2, maxLng], [minLat, maxLng2], [minLat2, minLng2]] = hood.bounds;
        return lat <= Math.max(maxLat, maxLat2) && lat >= Math.min(minLat, minLat2) && 
               lng >= Math.min(minLng, minLng2) && lng <= Math.max(maxLng, maxLng2);
      });
      
      if (neighborhood) {
        // If click is inside a defined neighborhood, show detailed data
        const tooltipContent = `
          <div class="p-3">
            <h3 class="font-semibold text-gray-800">${neighborhood.name}</h3>
            <div class="mt-2 text-sm">
              <div><span class="text-gray-600">Education:</span> ${Math.round(neighborhood.metrics.education * 100)}%</div>
              <div><span class="text-gray-600">Poverty:</span> ${Math.round(neighborhood.metrics.poverty * 100)}%</div>
              <div><span class="text-gray-600">Housing:</span> $${Math.round(300000 + (neighborhood.metrics.housing * 1200000)).toLocaleString()}</div>
              <div><span class="text-gray-600">Income:</span> $${Math.round(70000 + (neighborhood.metrics.income * 150000)).toLocaleString()}</div>
            </div>
          </div>
        `;
        
        L.popup()
          .setLatLng(e.latlng)
          .setContent(tooltipContent)
          .openOn(map);
      } else {
        // If click is outside all defined neighborhoods, show a more informative message
        const outsideAreaContent = `
          <div class="p-3">
            <h3 class="font-semibold text-gray-800">Outside Defined Areas</h3>
            <p class="mt-2 text-sm text-gray-600">
              Click on one of the colored regions to see detailed demographic information for that neighborhood.
            </p>
            <p class="mt-1 text-xs text-gray-500">
              Citywide statistics are displayed in the legend.
            </p>
          </div>
        `;
        
        L.popup()
          .setLatLng(e.latlng)
          .setContent(outsideAreaContent)
          .openOn(map);
      }
    }
  });
  
  return null;
};

// Empty state component
const EmptyState = () => (
  <div className="h-[400px] flex items-center justify-center bg-gray-50 rounded-lg">
    <div className="text-center p-6">
      <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
      </svg>
      <h3 className="mt-2 text-lg font-medium text-gray-900">No Data Available</h3>
      <p className="mt-1 text-sm text-gray-500">
        Try adjusting your filters to see more data.
      </p>
    </div>
  </div>
);

// Helper function to get neighborhood-specific metrics
const getNeighborhoodMetric = (lat, lng, metricName, isCurrency = false) => {
  // Define neighborhoods and their bounding boxes
  const neighborhoods = [
    { 
      name: 'Northwest DC', 
      bounds: [
        [38.95, -77.08],
        [38.95, -77.00],
        [38.92, -77.00],
        [38.92, -77.08]
      ],
      metrics: {
        'income': 0.85,
        'education': 0.9,
        'poverty': 0.2,
        'housing': 0.8,
        'race': 0.6
      }
    },
    { 
      name: 'Northeast DC', 
      bounds: [
        [38.95, -77.00],
        [38.95, -76.9],
        [38.92, -76.9],
        [38.92, -77.00]
      ],
      metrics: {
        'income': 0.6,
        'education': 0.65,
        'poverty': 0.4,
        'housing': 0.55,
        'race': 0.8
      }
    },
    { 
      name: 'Southeast DC', 
      bounds: [
        [38.92, -77.00],
        [38.92, -76.9],
        [38.85, -76.9],
        [38.85, -77.00]
      ],
      metrics: {
        'income': 0.3,
        'education': 0.4,
        'poverty': 0.7,
        'housing': 0.25,
        'race': 0.9
      }
    },
    { 
      name: 'Southwest DC', 
      bounds: [
        [38.919, -77.079],
        [38.919, -77.001],
        [38.851, -77.001],
        [38.851, -77.079]
      ],
      metrics: {
        'income': 0.7,
        'education': 0.75,
        'poverty': 0.3,
        'housing': 0.65,
        'race': 0.7
      }
    },
    { 
      name: 'Downtown DC', 
      bounds: [
        [38.905, -77.05],
        [38.905, -77.00],
        [38.89, -77.00],
        [38.89, -77.05]
      ],
      metrics: {
        'income': 0.9,
        'education': 0.85,
        'poverty': 0.15,
        'housing': 0.9,
        'race': 0.5
      }
    }
  ];
  
  // Find which neighborhood the point belongs to
  const neighborhood = neighborhoods.find(hood => {
    const [[maxLat, minLng], [maxLat2, maxLng], [minLat, maxLng2], [minLat2, minLng2]] = hood.bounds;
    return lat <= Math.max(maxLat, maxLat2) && lat >= Math.min(minLat, minLat2) && 
           lng >= Math.min(minLng, minLng2) && lng <= Math.max(maxLng, maxLng2);
  });
  
  if (!neighborhood) {
    // Default to citywide average if not in any defined neighborhood
    if (metricName === 'education') return '65.9';
    if (metricName === 'poverty') return '14.0';
    if (metricName === 'housing') return isCurrency ? (715500).toLocaleString() : '715,500';
    if (metricName === 'income') return isCurrency ? (108210).toLocaleString() : '108,210';
    return 'N/A';
  }
  
  const value = neighborhood.metrics[metricName];
  
  if (metricName === 'education') {
    return Math.round(value * 100).toString();
  } else if (metricName === 'poverty') {
    return Math.round(value * 100).toString();
  } else if (metricName === 'housing') {
    const price = Math.round(300000 + (value * 1200000));
    return isCurrency ? price.toLocaleString() : price.toString();
  } else if (metricName === 'income') {
    const income = Math.round(70000 + (value * 150000));
    return isCurrency ? income.toLocaleString() : income.toString();
  }
  
  return Math.round(value * 100).toString();
};

// Helper function to get neighborhood name from coordinates
const getNeighborhoodName = (lat, lng) => {
  // Define neighborhoods and their bounding boxes (same as in getNeighborhoodMetric)
  const neighborhoods = [
    { 
      name: 'Northwest DC', 
      bounds: [
        [38.95, -77.08],
        [38.95, -77.00],
        [38.92, -77.00],
        [38.92, -77.08]
      ]
    },
    { 
      name: 'Northeast DC', 
      bounds: [
        [38.95, -77.00],
        [38.95, -76.9],
        [38.92, -76.9],
        [38.92, -77.00]
      ]
    },
    { 
      name: 'Southeast DC', 
      bounds: [
        [38.92, -77.00],
        [38.92, -76.9],
        [38.85, -76.9],
        [38.85, -77.00]
      ]
    },
    { 
      name: 'Southwest DC', 
      bounds: [
        [38.919, -77.079],
        [38.919, -77.001],
        [38.851, -77.001],
        [38.851, -77.079]
      ]
    },
    { 
      name: 'Downtown DC', 
      bounds: [
        [38.905, -77.05],
        [38.905, -77.00],
        [38.89, -77.00],
        [38.89, -77.05]
      ]
    }
  ];
  
  // Find which neighborhood the point belongs to
  const neighborhood = neighborhoods.find(hood => {
    const [[maxLat, minLng], [maxLat2, maxLng], [minLat, maxLng2], [minLat2, minLng2]] = hood.bounds;
    return lat <= Math.max(maxLat, maxLat2) && lat >= Math.min(minLat, minLat2) && 
           lng >= Math.min(minLng, minLng2) && lng <= Math.max(maxLng, maxLng2);
  });
  
  return neighborhood ? neighborhood.name : 'Other DC Area';
};

// Helper function to get descriptions of metrics for legend
const getMetricDescription = (metric) => {
  switch(metric) {
    case 'income':
      return 'higher income levels';
    case 'education':
      return 'higher education levels';
    case 'poverty':
      return 'higher poverty rates';
    case 'housing':
      return 'higher housing values';
    case 'race':
      return 'diversity index';
    default:
      return 'demographic values';
  }
};

const HeatMap = ({ updateKeyInsights }) => {
  const { 
    heatMapData, 
    rawData,
    filteredRawData,
    isLoading, 
    showCensusOverlay, 
    selectedCensusMetric,
    census,
    filters
  } = useCrimeData();
  
  // Use filteredRawData if available, otherwise fall back to rawData
  const displayData = filteredRawData || rawData;
  
  const [visibleMarkers, setVisibleMarkers] = useState([]);
  const [locationScores, setLocationScores] = useState({});
  const [currentBounds, setCurrentBounds] = useState(null);
  const [hasData, setHasData] = useState(true);
  const [activeOverlays, setActiveOverlays] = useState([]);
  
  const mapRef = useRef(null);
  
  // Define the indicator class function within the component scope
  // This function determines the appropriate indicator color based on demographic metric values
  const getIndicatorClass = (metric, value, riskScore) => {
    // For income: high income in high-risk area is unusual (red)
    let result = 'bg-gray-400'; // Default value
    
    if (metric === 'income') {
      // Make sure we're handling numeric values
      const numericValue = typeof value === 'number' ? value : parseInt(value.replace(/[^0-9]/g, ''), 10);
      console.log(`Income value: ${value}, parsed: ${numericValue}`);
      
      if (numericValue > 75000) {
        result = 'bg-red-500';  // High income in high-risk area = unusual
      } else if (numericValue > 50000) {
        result = 'bg-gray-400'; // Medium income
      } else {
        result = 'bg-green-500'; // Low income in high-risk area = expected
      }
    }
    // For poverty: high poverty in high-risk area is expected (green)
    else if (metric === 'poverty') {
      // Make sure we're handling numeric values
      const numericValue = typeof value === 'number' ? value : parseInt(value, 10);
      console.log(`Poverty value: ${value}, parsed: ${numericValue}`);
      
      if (numericValue > 20) {
        result = 'bg-green-500'; // High poverty in high-risk area = expected
      } else if (numericValue > 10) {
        result = 'bg-gray-400'; // Medium poverty
      } else {
        result = 'bg-red-500';  // Low poverty in high-risk area = unusual
      }
    }
    
    console.log(`Indicator for ${metric}: ${value} -> ${result}`);
    return result;
  };
  
  // Effect to manually clean up any remaining map overlays when toggling off census data
  useEffect(() => {
    console.log('Census overlay state changed:', showCensusOverlay);
    
    if (!showCensusOverlay) {
      // Clean up any lingering legends
      const legends = document.querySelectorAll('.info.legend');
      legends.forEach(legend => {
        legend.remove();
      });
      
      // Get the map instance - mapRef.current might not have the _leaflet_id property
      // for accessing the actual Leaflet map instance
      const mapContainer = document.querySelector('.leaflet-container');
      if (mapContainer && mapContainer._leaflet_id) {
        const mapInstance = window.L && window.L.map && window.L.map._layers ? 
                           window.L.map._layers[mapContainer._leaflet_id] : null;
                           
        // Fallback to using mapRef if we couldn't get the instance directly
        const map = mapInstance || (mapRef.current && mapRef.current._map) || mapRef.current;
        
        if (map && map.eachLayer) {
          // Remove any orphaned overlays that might remain
          map.eachLayer(layer => {
            // Check for neighborhood polygons
            if (layer._path && 
                (layer.options && layer.options.className === 'neighborhood-polygon' || 
                 layer._path.classList && layer._path.classList.contains('neighborhood-polygon'))) {
              map.removeLayer(layer);
            }
            
            // Check for choropleth/census layers (GeoJSON layers often have these properties)
            if (layer.feature && layer.feature.properties && layer.feature.properties.censusMetric) {
              map.removeLayer(layer);
            }
            
            // Check for any layer with a feature property (possibly a GeoJSON layer)
            if (layer.feature && layer.options && layer.options.style && 
                (layer.options.className === 'census-overlay' || 
                 layer.options.censusLayer === true)) {
              map.removeLayer(layer);
            }
          });
        } else {
          console.warn("Could not access map instance for layer cleanup");
        }
      } else {
        console.warn("Could not find Leaflet container for cleanup");
      }
      
      // Force a re-render of the map to ensure overlay is removed
      const forceRedraw = document.querySelector('.leaflet-map-pane');
      if (forceRedraw) {
        forceRedraw.style.display = 'none';
        setTimeout(() => {
          forceRedraw.style.display = '';
        }, 10);
      }
    }
  }, [showCensusOverlay]);
  
  // Make sure handleBoundsChange uses displayData (filtered data when available)
  const handleBoundsChange = useCallback((bounds) => {
    if (!bounds) return;
    
    setCurrentBounds(bounds);
    
    if (!displayData || displayData.length === 0) {
      setVisibleMarkers([]);
      return;
    }
    
    try {
      // Filter markers to only show those in the current view
      const visible = displayData.filter(incident => {
        if (!incident || !incident.latitude || !incident.longitude) return false;
        
        return bounds.contains([incident.latitude, incident.longitude]);
      });
      
      // Limit to 1000 markers for performance
      setVisibleMarkers(visible.slice(0, 1000));
    } catch (error) {
      console.error('Error filtering visible markers:', error);
      setVisibleMarkers([]);
    }
  }, [displayData]); // Use displayData instead of rawData
  
  // Force recalculation when filtered data changes
  useEffect(() => {
    if (currentBounds) {
      // When displayData changes due to filters, update the visible markers
      handleBoundsChange(currentBounds);
    }
  }, [displayData, currentBounds, handleBoundsChange]);
  
  // Update the risk score calculation to use displayData
  useEffect(() => {
    // If we have no data, clear everything
    if (!displayData || displayData.length === 0) {
      setLocationScores({});
      setHasData(false);
      return;
    }
    
    setHasData(true);
    
    try {
      // Calculate risk scores for locations based on the filtered data
      const scoresByLocation = displayData.reduce((acc, incident) => {
        if (!incident || !incident.block) return acc;
        
        const locationKey = incident.block;
        
        if (!acc[locationKey]) {
          acc[locationKey] = {
            count: 0,
            offenses: {},
            lat: incident.latitude,
            lng: incident.longitude,
            riskScore: 0
          };
        }
        
        acc[locationKey].count += 1;
        
        // Handle potentially undefined offense
        const offense = incident.offense || 'Unknown';
        if (!acc[locationKey].offenses[offense]) {
          acc[locationKey].offenses[offense] = 0;
        }
        acc[locationKey].offenses[offense] += 1;
        
        return acc;
      }, {});
      
      // Calculate risk scores with appropriate weights
      const crimeWeights = {
        'HOMICIDE': 10,
        'ASSAULT W/DANGEROUS WEAPON': 8,
        'SEX ABUSE': 8,
        'ROBBERY': 7,
        'BURGLARY': 5,
        'MOTOR VEHICLE THEFT': 4,
        'THEFT F/AUTO': 3,
        'THEFT/OTHER': 2,
        'ARSON': 6
      };
      
      Object.keys(scoresByLocation).forEach(location => {
        const locationData = scoresByLocation[location];
        let weightedScore = 0;
        
        Object.entries(locationData.offenses).forEach(([offense, count]) => {
          const weight = crimeWeights[offense] || 1;
          weightedScore += count * weight;
        });
        
        // Apply a multiplier based on total count (frequency)
        locationData.riskScore = weightedScore * (1 + Math.log(locationData.count) / 10);
      });
      
      // Update the state
      setLocationScores(scoresByLocation);
      
      // Notify parent component about high-risk areas
      if (updateKeyInsights) {
        const highRiskLocations = Object.entries(scoresByLocation)
          .sort((a, b) => b[1].riskScore - a[1].riskScore)
          .slice(0, 5)
          .map(([location, data]) => ({
            location,
            riskScore: Math.round(data.riskScore),
            count: data.count
          }));
          
        updateKeyInsights({
          highRiskAreas: highRiskLocations
        });
      }
    } catch (error) {
      console.error('Error calculating risk scores:', error);
    }
  }, [displayData, updateKeyInsights]); // Use displayData as dependency
  
  // Update visible markers when map bounds change
  useEffect(() => {
    if (currentBounds && !isLoading) {
      handleBoundsChange(currentBounds);
    }
  }, [currentBounds, handleBoundsChange, isLoading]);
  
  const heatmapOptions = {
    radius: 20,
    blur: 15,
    maxZoom: 17,
    // More intuitive color gradient from low (yellow) to high (red) severity
    gradient: {
      0.1: '#ffe082', // Light yellow - low severity
      0.3: '#ffb74d', // Orange - moderate severity
      0.5: '#ff9800', // Dark orange - medium severity
      0.7: '#f57c00', // Amber - high severity
      0.9: '#d32f2f'  // Red - highest severity
    },
    // Adjust max based on the crime weights (1-10 scale from dataProcessing.js)
    max: 10
  };
  
  // Check if there's any heat map data
  const hasHeatMapData = heatMapData && heatMapData.length > 0;
  
  // Helper function to get the most likely neighborhood for a location
  const getLocationNeighborhood = (locationStr) => {
    // Try to extract coordinates from location or incident data
    let lat = 38.9072;  // Default to DC center coordinates
    let lng = -77.0369;
    
    // Check if we can get coords from displayData (filtered data) first
    for (const incident of displayData) {
      if (incident && incident.block === locationStr && incident.latitude && incident.longitude) {
        lat = incident.latitude;
        lng = incident.longitude;
        break;
      }
    }
    
    // Find the neighborhood
    return getNeighborhoodName(lat, lng);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center mb-4">
      </div>

      {/* Census Controls - Always show the toggle, we no longer need the hideDemographics prop */}
      {census && <CensusControls />}

      <div className="rounded-lg overflow-hidden" style={{ height: '500px' }}>
        {isLoading ? (
          <div className="h-full flex items-center justify-center bg-gray-100">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : !hasData || !hasHeatMapData ? (
          <EmptyState />
        ) : (
          <MapContainer
            center={[38.8977, -77.0365]}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            ref={mapRef}
            whenCreated={(mapInstance) => {
              if (mapInstance && mapInstance.getBounds) {
                setCurrentBounds(mapInstance.getBounds());
                handleBoundsChange(mapInstance.getBounds());
              }
            }}
          >
            {/* Custom Legend Component for Crime Heatmap */}
            {/* Crime severity legend removed as requested */}
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {hasHeatMapData && (
              <HeatmapLayer
                points={heatMapData.map(point => ({
                  lat: point.lat,
                  lng: point.lng,
                  intensity: point.weight
                }))}
                longitudeExtractor={m => m.lng}
                latitudeExtractor={m => m.lat}
                intensityExtractor={m => m.intensity}
                {...heatmapOptions}
              />
            )}
            
            {/* Add census data overlay when enabled */}
            {showCensusOverlay && census && (
              <CensusOverlay
                selectedMetric={selectedCensusMetric}
                censusData={census}
              />
            )}
            
            {visibleMarkers.map((incident, index) => 
              incident && incident.latitude && incident.longitude ? (
                <Marker
                  key={`${incident.ccn || index}-${index}`}
                  position={[incident.latitude, incident.longitude]}
                  icon={crimeIcon(incident.offense)}
                >
                  <Popup>
                    <div className="max-w-xs">
                      <h3 className="font-semibold text-gray-800">{incident.offense || 'Unknown'}</h3>
                      <p className="text-sm text-gray-600">
                        {incident.block || 'Unknown location'}<br />
                        {incident.reportDate ? 
                          `${incident.reportDate.toLocaleDateString()} ${incident.reportDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 
                          'Unknown date'
                        }
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Method: {incident.method || 'Unknown'}
                      </p>
                      
                      {/* Add census context data to popup */}
                      {census && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-xs font-medium text-gray-700">
                            Demographic Context: 
                            <span className="ml-1 text-blue-600">
                              {getNeighborhoodName(incident.latitude, incident.longitude)}
                            </span>
                          </p>
                          <div className="grid grid-cols-2 gap-x-2 text-xs mt-1">
                            <span className="text-gray-600">Education:</span>
                            <span>{getNeighborhoodMetric(incident.latitude, incident.longitude, 'education')}%</span>
                            
                            <span className="text-gray-600">Poverty:</span>
                            <span>{getNeighborhoodMetric(incident.latitude, incident.longitude, 'poverty')}%</span>
                            
                            <span className="text-gray-600">Housing:</span>
                            <span>${getNeighborhoodMetric(incident.latitude, incident.longitude, 'housing', true)}</span>
                            
                            <span className="text-gray-600">Income:</span>
                            <span>${getNeighborhoodMetric(incident.latitude, incident.longitude, 'income', true)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ) : null
            )}
            
            <MapEventHandler onBoundsChange={handleBoundsChange} />
          </MapContainer>
        )}
      </div>
      
      {/* High-Risk Areas Analysis */}
      <div className="mt-6">
        <h3 className="text-lg font-bold text-gray-800 mb-2">High-Risk Areas Analysis</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          {Object.keys(locationScores).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No risk data available with current filters. 
              <br />Try adjusting your filters to see high-risk areas.
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {Object.entries(locationScores)
                  .sort(([, a], [, b]) => b.riskScore - a.riskScore)
                  .slice(0, 5)
                  .map(([location, data], index) => {
                    // Get actual metrics for this location
                    const neighborhood = getLocationNeighborhood(location);
                    const incomeValue = getNeighborhoodMetric(data.lat, data.lng, 'income', true);
                    const povertyValue = getNeighborhoodMetric(data.lat, data.lng, 'poverty');
                    const educationValue = getNeighborhoodMetric(data.lat, data.lng, 'education');
                    
                    // Determine correlation level based on actual metrics for this location
                    const incomeClass = getIndicatorClass('income', incomeValue, data.riskScore);
                    const povertyClass = getIndicatorClass('poverty', povertyValue, data.riskScore);
                    
                    return (
                      <div 
                        key={location} 
                        className={`p-3 rounded-lg ${
                          index === 0 ? 'bg-red-50 border border-red-100' : 'bg-white border border-gray-200'
                        }`}
                      >
                        <div className="flex items-start">
                          <div className={`rounded-full w-6 h-6 flex items-center justify-center text-xs text-white ${
                            index === 0 ? 'bg-red-500' : 'bg-blue-500'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="ml-2">
                            <h4 className="text-xs font-semibold truncate max-w-[120px]">{location}</h4>
                            <div className="flex items-center mt-1">
                              <div className="text-xs font-semibold">
                                Risk Score: <span className={index === 0 ? 'text-red-600' : 'text-blue-600'}>
                                  {Math.round(data.riskScore)}
                                </span>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {data.count} incidents
                            </div>
                            
                            {/* Enhanced demographic context */}
                            <div className="mt-2 pt-1 border-t border-gray-100">
                              <div className="text-xs text-gray-500 mb-1">Area demographics:</div>
                              <div className="grid grid-cols-2 gap-1 text-xs">
                                <div className="flex items-center">
                                  <span className={`inline-block w-2 h-2 rounded-full mr-1 ${incomeClass}`}></span>
                                  <span>Income:</span>
                                </div>
                                <span className="font-medium">${incomeValue.toLocaleString()}</span>
                                
                                <div className="flex items-center">
                                  <span className={`inline-block w-2 h-2 rounded-full mr-1 ${povertyClass}`}></span>
                                  <span>Poverty:</span>
                                </div>
                                <span className="font-medium">{povertyValue}%</span>
                                
                                <div className="flex items-center col-span-2 mt-1">
                                  <span className="text-[10px] text-gray-500 leading-tight">
                                    {neighborhood}, {educationValue}% higher education
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
              <p className="text-sm text-gray-600 mt-4">
                Crime types are assigned different risk weights (based on severity), ranging from 10× (homicide) to 1× for general theft. 
                These weights are used in risk calculations for specific high-crime areas.
              </p>
              <div className="mt-1 text-xs text-gray-500 flex flex-wrap gap-2">
                <div className="flex items-center">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1"></span>
                  <span>Unusual pattern (high income or low poverty in high-risk area)</span>
                </div>
                <div className="flex items-center">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                  <span>Expected pattern (low income or high poverty in high-risk area)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function to get correlation color
const getCorrelationColor = (metric, neighborhood) => {
  // Find the neighborhood's metrics
  const neighborhoods = [
    { name: 'Northwest DC', income: 0.85, poverty: 0.2 },
    { name: 'Northeast DC', income: 0.6, poverty: 0.4 },
    { name: 'Southeast DC', income: 0.3, poverty: 0.7 },
    { name: 'Southwest DC', income: 0.7, poverty: 0.3 },
    { name: 'Downtown DC', income: 0.9, poverty: 0.15 }
  ];
  
  const hood = neighborhoods.find(h => h.name === neighborhood) || neighborhoods[0];
  
  // For income, higher values mean lower crime (negative correlation)
  if (metric === 'income') {
    const value = hood.income;
    if (value > 0.75) return '#10b981'; // Strong negative (green) - less crime in high income areas
    if (value > 0.5) return '#34d399';  // Moderate negative
    if (value > 0.25) return '#9ca3af'; // Neutral/no correlation
    return '#ef4444';                   // Strong positive correlation (red) - more crime in low income areas
  }
  
  // For poverty, higher values mean higher crime (positive correlation)
  if (metric === 'poverty') {
    const value = hood.poverty;
    if (value > 0.6) return '#ef4444';  // Strong positive (red) - more crime in high poverty areas
    if (value > 0.4) return '#f87171';  // Moderate positive
    if (value > 0.2) return '#9ca3af';  // Neutral/no correlation
    return '#10b981';                   // Strong negative (green) - less crime in low poverty areas
  }
  
  return '#9ca3af'; // Gray default for no correlation
};

// Helper function to get tooltip text for correlation
const getCorrelationTooltip = (metric, neighborhood) => {
  // Find the neighborhood's metrics
  const neighborhoods = [
    { name: 'Northwest DC', income: 0.85, poverty: 0.2 },
    { name: 'Northeast DC', income: 0.6, poverty: 0.4 },
    { name: 'Southeast DC', income: 0.3, poverty: 0.7 },
    { name: 'Southwest DC', income: 0.7, poverty: 0.3 },
    { name: 'Downtown DC', income: 0.9, poverty: 0.15 }
  ];
  
  const hood = neighborhoods.find(h => h.name === neighborhood) || neighborhoods[0];
  
  if (metric === 'income') {
    const value = hood.income;
    if (value > 0.75) return 'Strong negative correlation - High income areas tend to have less crime';
    if (value > 0.5) return 'Moderate negative correlation - Higher income areas tend to have less crime';
    if (value > 0.25) return 'No significant correlation between income and crime in this area';
    return 'Strong positive correlation - Lower income areas tend to have more crime';
  }
  
  if (metric === 'poverty') {
    const value = hood.poverty;
    if (value > 0.6) return 'Strong positive correlation - High poverty areas tend to have more crime';
    if (value > 0.4) return 'Moderate positive correlation - Higher poverty areas tend to have more crime';
    if (value > 0.2) return 'No significant correlation between poverty and crime in this area';
    return 'Strong negative correlation - Lower poverty areas tend to have less crime';
  }
  
  return 'No significant correlation';
};

export default HeatMap; 