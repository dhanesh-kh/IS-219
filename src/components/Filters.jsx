import React from 'react';
import { useCrimeData } from '../utils/CrimeDataContext';
import { format, startOfDay, endOfDay } from 'date-fns';
import useChartData from '../utils/useChartData';

const StatCard = ({ icon, title, value }) => (
  <div className="flex items-center space-x-3 bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
    <div className="text-2xl bg-blue-50 text-blue-500 p-2 rounded-lg">{icon}</div>
    <div>
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</h3>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

const Filters = () => {
  const { 
    rawData, 
    filters, 
    filterData,
    crimeTypes,
    isLoading 
  } = useCrimeData();
  const { total } = useChartData();

  // Get unique crime types
  const uniqueCrimeTypes = [...new Set(rawData.map(item => item.offense))].sort();
  const shifts = ['DAY', 'EVENING', 'MIDNIGHT'];

  // Handle filter changes
  const handleCrimeTypeChange = (type) => {
    const newCrimeTypes = filters.crimeTypes.includes(type)
      ? filters.crimeTypes.filter(t => t !== type)
      : [...filters.crimeTypes, type];

    filterData({
      ...filters,
      crimeTypes: newCrimeTypes
    });
  };

  const handleShiftChange = (shift) => {
    const newShifts = filters.shifts.includes(shift)
      ? filters.shifts.filter(s => s !== shift)
      : [...filters.shifts, shift];

    filterData({
      ...filters,
      shifts: newShifts
    });
  };

  const handleDateRangeChange = (startOrEnd, value) => {
    let date = value ? new Date(value) : null;
    
    if (date) {
      date = startOrEnd === 'start' ? startOfDay(date) : endOfDay(date);
    }

    const newDateRange = {
      ...filters.dateRange,
      [startOrEnd]: date
    };

    filterData({
      ...filters,
      dateRange: newDateRange
    });
  };

  return (
    <div className="bg-gray-50 rounded-lg shadow-lg overflow-hidden">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-800">DC Crime Data Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Interactive visualization of crime incidents in Washington DC (2024)
        </p>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-white border-b border-gray-200">
        <StatCard
          icon="📊"
          title="Total Incidents"
          value={isLoading ? '-' : total.toLocaleString()}
        />
        <StatCard
          icon="🔍"
          title="Active Filters"
          value={filters.crimeTypes.length + filters.shifts.length + (filters.dateRange ? 1 : 0)}
        />
        <StatCard
          icon="📅"
          title="Time Range"
          value="2024"
        />
      </div>

      {/* Filters Section */}
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Filters</h2>
        
        {/* Date Range Filter */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-3 text-gray-700">Date Range</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.dateRange?.start ? format(filters.dateRange.start, 'yyyy-MM-dd') : ''}
                className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors duration-200 bg-white text-gray-700"
                onChange={(e) => handleDateRangeChange('start', e.target.value)}
                min="2024-01-01"
                max="2024-12-31"
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">End Date</label>
              <input
                type="date"
                value={filters.dateRange?.end ? format(filters.dateRange.end, 'yyyy-MM-dd') : ''}
                className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors duration-200 bg-white text-gray-700"
                onChange={(e) => handleDateRangeChange('end', e.target.value)}
                min="2024-01-01"
                max="2024-12-31"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Time of Day Filter */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-3 text-gray-700">Time of Day</h3>
          <div className="flex flex-wrap gap-3">
            {shifts.map(shift => {
              const isSelected = filters.shifts.includes(shift);
              return (
                <button
                  key={shift}
                  onClick={() => handleShiftChange(shift)}
                  disabled={isLoading}
                  className={`
                    px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                    ${isSelected 
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-200 transform scale-105' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-102'}
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                  `}
                >
                  {shift}
                </button>
              );
            })}
          </div>
        </div>

        {/* Crime Type Filter */}
        <div>
          <h3 className="text-sm font-medium mb-3 text-gray-700">Crime Types</h3>
          <div className="max-h-48 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
            {uniqueCrimeTypes.map(type => {
              const isChecked = filters.crimeTypes.includes(type);
              return (
                <label
                  key={type}
                  className={`
                    flex items-center p-2.5 rounded-lg cursor-pointer transition-all duration-200
                    ${isChecked ? 'bg-blue-50 border-2 border-blue-200' : 'hover:bg-gray-50 border-2 border-transparent'}
                  `}
                >
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleCrimeTypeChange(type)}
                      disabled={isLoading}
                      className="peer sr-only"
                    />
                    <div className={`
                      w-5 h-5 border-2 rounded transition-all duration-200
                      ${isChecked 
                        ? 'bg-blue-500 border-blue-500' 
                        : 'bg-white border-gray-300 peer-hover:border-blue-500'}
                    `}>
                      {isChecked && (
                        <svg className="w-full h-full text-white" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="ml-3 text-sm text-gray-700">{type}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Filters; 