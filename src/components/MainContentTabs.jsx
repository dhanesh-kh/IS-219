import React, { useState } from 'react';
import HeatMap from './HeatMap';
import TemporalAnalysis from './TemporalAnalysis';
import NeighborhoodAnalysis from './NeighborhoodAnalysis';

const MainContentTabs = ({ updateKeyInsights, updateAreaAnalysis, updateTemporalPatterns }) => {
  // If activeTab was previously set to 'crimeTypes', default to 'heatMap' instead
  const [activeTab, setActiveTab] = useState('heatMap');

  const tabs = [
    { id: 'heatMap', label: 'Heat', icon: <MapIcon className="w-4 h-4" />, dotColor: 'bg-green-600' },
    { id: 'temporal', label: 'Temporal Analysis', icon: <ClockIcon className="w-4 h-4" />, dotColor: 'bg-purple-600' },
    { id: 'neighborhood', label: 'Area & Crime Analysis', icon: <BuildingIcon className="w-4 h-4" />, dotColor: 'bg-orange-600' }
  ];

  // Get the appropriate tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'heatMap':
        return (
          <div className="bg-white p-4 rounded-lg">
            <HeatMap updateKeyInsights={updateKeyInsights} />
          </div>
        );
      case 'temporal':
        return (
          <div className="bg-white p-4 rounded-lg">
            <TemporalAnalysis updateTemporalPatterns={updateTemporalPatterns} />
          </div>
        );
      case 'neighborhood':
        return (
          <div className="bg-white p-4 rounded-lg">
            <NeighborhoodAnalysis updateAreaAnalysis={updateAreaAnalysis} />
          </div>
        );
      default:
        return <div>Select a tab to view content</div>;
    }
  };

  return (
    <div>
      {/* Tab Navigation */}
      <div className="mb-4 border-b border-gray-200">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center px-6 py-2 text-sm font-medium whitespace-nowrap
                transition-all duration-200 ease-in-out relative
                ${activeTab === tab.id
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'}
              `}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              <span className={`mr-2 ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'}`}>{tab.icon}</span>
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {renderTabContent()}
      </div>
    </div>
  );
};

// SVG Icon Components
const GraphIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75c-1.036 0-1.875-.84-1.875-1.875V8.625zM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75C3.84 21.75 3 20.91 3 19.875v-6.75z" />
  </svg>
);

const MapIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M8.161 2.58a1.875 1.875 0 011.678 0l4.993 2.498c.106.052.23.052.336 0l3.869-1.935A1.875 1.875 0 0121.75 4.82v12.485c0 .71-.401 1.36-1.037 1.677l-4.875 2.437a1.875 1.875 0 01-1.676 0l-4.994-2.497a.375.375 0 00-.336 0l-3.868 1.935A1.875 1.875 0 012.25 19.18V6.695c0-.71.401-1.36 1.036-1.677l4.875-2.437zM9 6a.75.75 0 01.75.75V15a.75.75 0 01-1.5 0V6.75A.75.75 0 019 6zm6.75 3a.75.75 0 00-1.5 0v8.25a.75.75 0 001.5 0V9z" clipRule="evenodd" />
  </svg>
);

const ClockIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
  </svg>
);

const BuildingIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.006 3.705a.75.75 0 00-.512-1.41L6 6.838V3a.75.75 0 00-.75-.75h-1.5A.75.75 0 003 3v4.93l-1.006.365a.75.75 0 00.512 1.41l16.5-6z" />
    <path fillRule="evenodd" d="M3.019 11.115L18 5.667V9.09l4.006 1.456a.75.75 0 11-.512 1.41l-.494-.18v8.475h.75a.75.75 0 010 1.5H2.25a.75.75 0 010-1.5H3v-9.129l.019-.006zM18 20.25v-9.565l1.5.545v9.02H18zm-9-6a.75.75 0 00-.75.75v4.5c0 .414.336.75.75.75h3a.75.75 0 00.75-.75V15a.75.75 0 00-.75-.75H9z" clipRule="evenodd" />
  </svg>
);

export default MainContentTabs;