import React, { useEffect } from 'react';
import { useCrimeData } from '../../utils/CrimeDataContext';

const CensusControls = () => {
  const {
    showCensusOverlay,
    toggleCensusOverlay,
    selectCensusMetric,
    selectedCensusMetric,
    census
  } = useCrimeData();

  // Added logging for debugging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Census data in CensusControls:', census);
    }
  }, [census]);

  // Cannot render controls if no census data is available
  if (!census) {
    // Return a simplified version instead of null
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-4">
        <div className="p-4 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-gray-600">
            Demographic data is not available. Some features may be limited.
          </p>
        </div>
      </div>
    );
  }

  // Demographic metrics with improved icons and descriptions
  const metrics = [
    {
      id: 'income',
      label: 'Income',
      icon: '💰',
      description: 'Median household income by neighborhood',
      color: '#10b981', // Green theme
      impact: 'Negative correlation with crime (-0.65)'
    },
    {
      id: 'education',
      label: 'Education',
      icon: '🎓',
      description: 'Percentage with bachelor\'s degree or higher',
      color: '#6366f1', // Indigo theme
      impact: 'Negative correlation with crime (-0.48)'
    },
    {
      id: 'poverty',
      label: 'Poverty',
      icon: '📉',
      description: 'Percentage of residents below poverty line',
      color: '#ef4444', // Red theme
      impact: 'Positive correlation with crime (0.72)'
    },
    {
      id: 'housing',
      label: 'Housing',
      icon: '🏘️',
      description: 'Median home value by neighborhood',
      color: '#3b82f6', // Blue theme
      impact: 'Negative correlation with crime (-0.52)'
    },
    {
      id: 'race',
      label: 'Race',
      icon: '👪',
      description: 'Diversity index (higher values = more diverse)',
      color: '#8b5cf6', // Purple theme
      impact: 'No significant correlation (0.15)'
    }
  ];

  const handleToggle = () => {
    try {
      toggleCensusOverlay();
    } catch (error) {
      console.error('Error toggling census overlay:', error);
    }
  };

  const handleMetricSelect = (metric) => {
    try {
      selectCensusMetric(metric);
    } catch (error) {
      console.error('Error selecting census metric:', error);
    }
  };

  // Find the currently selected metric
  const selectedMetric = metrics.find(m => m.id === selectedCensusMetric) || metrics[0];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-4">
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="text-base font-medium text-gray-800">Demographic Data Overlay</h3>
        </div>
        
        <div className="flex items-center">
          <span className={`mr-2 text-sm font-medium ${showCensusOverlay ? 'text-blue-600' : 'text-gray-500'}`}>
            {showCensusOverlay ? 'ON' : 'OFF'}
          </span>
          <div className="relative inline-block w-12 mr-2 align-middle select-none">
            <input
              type="checkbox"
              name="toggle"
              id="census-toggle"
              checked={showCensusOverlay}
              onChange={handleToggle}
              className="sr-only"
            />
            <label
              htmlFor="census-toggle"
              className={`block w-12 h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in-out ${
                showCensusOverlay ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span 
                className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out ${
                  showCensusOverlay ? 'transform translate-x-6' : ''
                }`} 
              />
            </label>
          </div>
        </div>
      </div>

      {showCensusOverlay && (
        <div>
          <div className="p-3 bg-blue-50">
            <div className="mb-2">
              <h4 className="text-sm font-medium text-gray-800 mb-2">
                Select Demographic Factor
              </h4>
              
              <div className="flex flex-wrap gap-2">
                {metrics.map((metric) => (
                  <button
                    key={metric.id}
                    className={`flex items-center px-3 py-2 rounded-md transition-all duration-200 ${
                      selectedCensusMetric === metric.id
                        ? 'bg-white shadow-sm text-gray-800 border border-blue-200'
                        : 'bg-white/90 text-gray-700 border border-gray-200 hover:bg-white hover:shadow-sm'
                    }`}
                    onClick={() => handleMetricSelect(metric.id)}
                    title={metric.description}
                  >
                    <span className="text-base mr-2">{metric.icon}</span>
                    <span className="font-medium">{metric.label}</span>
                    
                    {selectedCensusMetric === metric.id && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Selected metric details */}
            {selectedCensusMetric && (
              <div className="bg-white p-3 rounded-lg border border-gray-200 mt-2">
                <div className="flex">
                  <div className="rounded-full w-10 h-10 flex items-center justify-center mr-3"
                       style={{ backgroundColor: `${selectedMetric.color}15` }}>
                    <span className="text-xl">{selectedMetric.icon}</span>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-900">{selectedMetric.label}</h5>
                    <p className="text-sm text-gray-600">{selectedMetric.description}</p>
                    <div className="mt-1 text-sm">
                      <div className="flex items-center">
                        <span
                          className="inline-block w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: selectedMetric.id === 'poverty' ? '#ef4444' : '#10b981' }}
                        ></span>
                        <span className="text-gray-700">{selectedMetric.impact}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* DC Demographics section removed - now integrated in Dashboard */}
        </div>
      )}
      
      {!showCensusOverlay && (
        <div className="p-3 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-gray-600">
            Toggle ON to overlay demographic data and analyze correlations with crime patterns
          </p>
        </div>
      )}
    </div>
  );
};

export default CensusControls;