import React, { useState, useEffect } from 'react';
import { useCrimeData } from '../utils/CrimeDataContext';
import { format, parseISO, subDays, subMonths, startOfMonth, endOfMonth, isValid } from 'date-fns';

// Enhanced crime type categories with icons and descriptions
const crimeCategories = {
  'Violent': {
    crimes: ['HOMICIDE', 'ASSAULT W/DANGEROUS WEAPON', 'SEX ABUSE', 'ROBBERY'],
    icon: '🔪',
    description: 'Crimes against persons involving violence or threat of violence',
    color: 'red'
  },
  'Property': {
    crimes: ['BURGLARY', 'THEFT F/AUTO', 'THEFT/OTHER', 'MOTOR VEHICLE THEFT'],
    icon: '🏠',
    description: 'Crimes involving theft or damage to property',
    color: 'blue'
  },
  'Other': {
    crimes: ['ARSON'],
    icon: '📋',
    description: 'Other types of criminal incidents',
    color: 'purple'
  }
};

// Enhanced date preset options with more intuitive options
const datePresets = [
  { id: 'last7', label: 'Last 7 days', getRange: (today) => ({ start: format(subDays(today, 7), 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') }) },
  { id: 'last30', label: 'Last 30 days', getRange: (today) => ({ start: format(subDays(today, 30), 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') }) },
  { id: 'thisMonth', label: 'This month', getRange: (today) => ({ start: format(startOfMonth(today), 'yyyy-MM-dd'), end: format(endOfMonth(today), 'yyyy-MM-dd') }) },
  { id: 'last3months', label: 'Last 3 months', getRange: (today) => ({ start: format(subMonths(today, 3), 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') }) },
  { id: 'last6months', label: 'Last 6 months', getRange: (today) => ({ start: format(subMonths(today, 6), 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') }) },
];

// Helper function to get category for a crime type
const getCategoryForCrimeType = (type) => {
  for (const [category, data] of Object.entries(crimeCategories)) {
    if (data.crimes.includes(type)) return category;
  }
  return 'Other';
};

const Filters = () => {
  const { 
    rawData, 
    filterData,
    filters,
    isLoading,
    toggleCensusOverlay,
    selectCensusMetric,
    showCensusOverlay,
    selectedCensusMetric
  } = useCrimeData();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCrimeTypes, setSelectedCrimeTypes] = useState([]);
  const [selectedShifts, setSelectedShifts] = useState([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [activeFilterCount, setActiveFilterCount] = useState(0);
  const [selectedDatePreset, setSelectedDatePreset] = useState(null);
  const [activeDateFilters, setActiveDateFilters] = useState(false);
  const [activeCrimeTypeFilters, setActiveCrimeTypeFilters] = useState(false);
  const [activeTimeFilters, setActiveTimeFilters] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvancedDateFilter, setShowAdvancedDateFilter] = useState(false);
  const [showAdvancedCrimeFilter, setShowAdvancedCrimeFilter] = useState(false);

  // Get unique crime types from data
  const uniqueCrimeTypes = React.useMemo(() => {
    if (!rawData.length) return [];
    
    const types = new Set();
    rawData.forEach(incident => {
      if (incident.offense) {
        types.add(incident.offense);
      }
    });
    
    return Array.from(types).sort();
  }, [rawData]);

  // Organize crime types by category for better UI organization
  const categorizedCrimeTypes = React.useMemo(() => {
    const categorized = {};
    
    uniqueCrimeTypes.forEach(type => {
      const category = getCategoryForCrimeType(type);
      if (!categorized[category]) categorized[category] = [];
      categorized[category].push(type);
    });
    
    return categorized;
  }, [uniqueCrimeTypes]);

  // Enhanced time of day options with more intuitive labels and icons
  const shifts = [
    { id: 'DAY', label: 'Day', time: '8am-4pm', icon: '☀️', description: 'Incidents occurring during daylight hours (8am-4pm)', color: 'yellow' },
    { id: 'EVENING', label: 'Evening', time: '4pm-12am', icon: '🌆', description: 'Incidents occurring during evening hours (4pm-12am)', color: 'orange' },
    { id: 'MIDNIGHT', label: 'Night', time: '12am-8am', icon: '🌙', description: 'Incidents occurring during overnight hours (12am-8am)', color: 'indigo' }
  ];

  // Census data options with improved descriptions
  const censusOptions = [
    { id: 'income', label: 'Income', description: 'Median household income by neighborhood', icon: '💰' },
    { id: 'education', label: 'Education', description: 'Educational attainment levels', icon: '🎓' },
    { id: 'poverty', label: 'Poverty', description: 'Poverty rates and economic indicators', icon: '📉' },
    { id: 'housing', label: 'Housing', description: 'Housing values and occupancy data', icon: '🏘️' },
    { id: 'race', label: 'Race', description: 'Racial and ethnic demographic data', icon: '👪' }
  ];

  // Apply filters
  const applyFilters = () => {
    // Track which filter types are active for visual feedback
    const hasDateFilter = startDate || endDate;
    const hasCrimeTypeFilter = selectedCrimeTypes.length > 0;
    const hasTimeFilter = selectedShifts.length > 0;
    
    setActiveDateFilters(hasDateFilter);
    setActiveCrimeTypeFilters(hasCrimeTypeFilter);
    setActiveTimeFilters(hasTimeFilter);
    
    // Convert string dates to Date objects if they're valid
    const dateRange = {
      start: startDate && isValid(parseISO(startDate)) ? parseISO(startDate) : null,
      end: endDate && isValid(parseISO(endDate)) ? parseISO(endDate) : null
    };

    filterData({
      dateRange: dateRange.start || dateRange.end ? dateRange : null,
      crimeTypes: selectedCrimeTypes,
      shifts: selectedShifts.map(shift => shift.id || shift)
    });

    // Count active filters for the filter badge
    let count = 0;
    if (hasDateFilter) count++;
    if (hasCrimeTypeFilter) count++;
    if (hasTimeFilter) count++;
    setActiveFilterCount(count);
  };

  // Reset all filters
  const resetAllFilters = () => {
    // Show confirmation dialog for better UX
    if (activeFilterCount > 0 && window.confirm("Are you sure you want to reset all filters?")) {
      setStartDate('');
      setEndDate('');
      setSelectedCrimeTypes([]);
      setSelectedShifts([]);
      setSelectedDatePreset(null);
      setActiveDateFilters(false);
      setActiveCrimeTypeFilters(false);
      setActiveTimeFilters(false);
      setShowAdvancedDateFilter(false);
      setShowAdvancedCrimeFilter(false);

      filterData({
        dateRange: null,
        crimeTypes: [],
        shifts: []
      });
      
      setActiveFilterCount(0);
    }
  };

  // Apply a date preset with clear visual feedback
  const applyDatePreset = (presetId) => {
    const today = new Date();
    const preset = datePresets.find(p => p.id === presetId);
    
    if (preset) {
      const range = preset.getRange(today);
      setStartDate(range.start);
      setEndDate(range.end);
      setSelectedDatePreset(presetId);
      setActiveDateFilters(true);
    }
  };

  // Toggle crime type selection with improved state management
  const toggleCrimeType = (type) => {
    setSelectedCrimeTypes(prev => {
      const newSelection = prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type];
      
      // Update active status
      setActiveCrimeTypeFilters(newSelection.length > 0);
      return newSelection;
    });
  };

  // Toggle category selection with better feedback
  const toggleCategory = (category) => {
    const typesInCategory = categorizedCrimeTypes[category] || [];
    
    // Check if all types in this category are already selected
    const allSelected = typesInCategory.every(type => selectedCrimeTypes.includes(type));
    
    setSelectedCrimeTypes(prev => {
      let newSelection;
      
      if (allSelected) {
        // If all selected, deselect them all
        newSelection = prev.filter(type => !typesInCategory.includes(type));
      } else {
        // Otherwise, select all in category that aren't already selected
        const newTypes = typesInCategory.filter(type => !prev.includes(type));
        newSelection = [...prev, ...newTypes];
      }
      
      // Update active status
      setActiveCrimeTypeFilters(newSelection.length > 0);
      return newSelection;
    });
  };

  // Toggle shift selection with improved user feedback
  const toggleShift = (shiftId) => {
    const shiftObj = shifts.find(s => s.id === shiftId) || shiftId;
    
    setSelectedShifts(prev => {
      const normalizedPrev = prev.map(s => typeof s === 'string' ? s : s.id);
      
      let newSelection;
      if (normalizedPrev.includes(shiftId)) {
        newSelection = prev.filter(s => (typeof s === 'string' ? s !== shiftId : s.id !== shiftId));
      } else {
        newSelection = [...prev, shiftObj];
      }
      
      // Update active status
      setActiveTimeFilters(newSelection.length > 0);
      return newSelection;
    });
  };

  // Select all crime types
  const selectAllCrimeTypes = () => {
    setSelectedCrimeTypes(uniqueCrimeTypes);
    setActiveCrimeTypeFilters(true);
  };

  // Clear all crime types
  const clearCrimeTypes = () => {
    setSelectedCrimeTypes([]);
    setActiveCrimeTypeFilters(false);
  };

  // Helper to clear date range
  const clearDateRange = () => {
    setStartDate('');
    setEndDate('');
    setSelectedDatePreset(null);
    setActiveDateFilters(false);
  };

  // Check if category has active selections
  const getCategoryActiveStatus = (category) => {
    const typesInCategory = categorizedCrimeTypes[category] || [];
    const selectedInCategory = typesInCategory.filter(type => selectedCrimeTypes.includes(type));
    return selectedInCategory.length > 0;
  };

  // Get count of selected crime types in a category
  const getSelectedCountForCategory = (category) => {
    const typesInCategory = categorizedCrimeTypes[category] || [];
    return typesInCategory.filter(type => selectedCrimeTypes.includes(type)).length;
  };

  // Filter crime types based on search term
  const filteredCrimeTypes = (types) => {
    if (!searchTerm) return types;
    return types.filter(type => 
      type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Handle selecting a demographic overlay
  const handleDemographicSelection = (metric) => {
    selectCensusMetric(metric);
  };

  // Apply filters when selections change
  useEffect(() => {
    applyFilters();
  }, [selectedCrimeTypes, selectedShifts, startDate, endDate]);

  // Initialize state from filters
  useEffect(() => {
    if (filters) {
      // Set date filters if available
      if (filters.dateRange?.start) {
        setStartDate(format(filters.dateRange.start, 'yyyy-MM-dd'));
        setActiveDateFilters(true);
      }
      
      if (filters.dateRange?.end) {
        setEndDate(format(filters.dateRange.end, 'yyyy-MM-dd'));
        setActiveDateFilters(true);
      }
      
      // Set crime type filters if available
      if (filters.crimeTypes?.length > 0) {
        setSelectedCrimeTypes(filters.crimeTypes);
        setActiveCrimeTypeFilters(true);
      }
      
      // Set time filters if available
      if (filters.shifts?.length > 0) {
        // Convert string shifts to objects if possible
        const normalizedShifts = filters.shifts.map(shift =>
          typeof shift === 'string'
            ? shifts.find(s => s.id === shift) || shift
            : shift
        );
        setSelectedShifts(normalizedShifts);
        setActiveTimeFilters(true);
      }

      // Count initial active filters
      let count = 0;
      if (filters.dateRange?.start || filters.dateRange?.end) count++;
      if (filters.crimeTypes?.length > 0) count++;
      if (filters.shifts?.length > 0) count++;
      setActiveFilterCount(count);
    }
  }, []);

  // Calculate min and max dates for the date picker from the available data
  const dateRange = React.useMemo(() => {
    if (!rawData.length) return { min: '', max: '' };
    
    const dates = rawData
      .map(incident => incident.reportDate)
      .filter(Boolean)
      .sort((a, b) => a - b);
    
    if (dates.length === 0) return { min: '', max: '' };
    
    return {
      min: format(dates[0], 'yyyy-MM-dd'),
      max: format(dates[dates.length - 1], 'yyyy-MM-dd')
    };
  }, [rawData]);

  // Format date for display
  const formatDisplayDate = (dateString) => {
    if (!dateString) return '';
    const date = parseISO(dateString);
    return format(date, 'MMM d, yyyy');
  };

  return (
    <div className="bg-white p-5">
      {/* Enhanced header with filter count and reset button */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-50 rounded-full p-1.5">
            <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
          {activeFilterCount > 0 && (
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {activeFilterCount} active
            </span>
          )}
        </div>
        <div className="text-sm font-medium text-gray-500">
          {rawData.length.toLocaleString()} incidents found • Data from {formatDisplayDate(dateRange.min)} to {formatDisplayDate(dateRange.max)}
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={resetAllFilters}
            className="text-red-600 text-sm hover:text-red-800 transition flex items-center bg-red-50 hover:bg-red-100 px-2 py-1 rounded"
          >
            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Reset All
          </button>
        )}
      </div>

      {/* Main Filter Areas - Compact Layout */}
      <div className="flex flex-wrap -mx-2">
        {/* Enhanced Date Filters */}
        <div className="w-full md:w-1/2 lg:w-1/4 px-2 mb-4">
          <div className="flex items-center mb-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-1.5 ${activeDateFilters ? 'bg-blue-100' : 'bg-gray-50'}`}>
              <svg className={`h-3.5 w-3.5 ${activeDateFilters ? 'text-blue-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className={`text-sm font-medium ${activeDateFilters ? 'text-blue-800' : 'text-gray-700'}`}>Date</span>
            {activeDateFilters && (
              <span className="ml-auto bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                {startDate && endDate ? `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}` : 'Active'}
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap gap-1 mb-2">
            {datePresets.slice(0, 3).map(preset => (
              <button
                key={preset.id}
                onClick={() => applyDatePreset(preset.id)}
                className={`text-xs py-1.5 px-2.5 rounded-md transition-all duration-200 border ${
                  selectedDatePreset === preset.id
                    ? 'bg-blue-100 border-blue-200 text-blue-700 font-medium shadow-sm'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {preset.label}
              </button>
            ))}
            <button
              onClick={() => setShowAdvancedDateFilter(!showAdvancedDateFilter)}
              className={`text-xs py-1.5 px-2.5 rounded-md border transition-all duration-200 ${
                showAdvancedDateFilter
                  ? 'bg-indigo-100 border-indigo-200 text-indigo-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Custom...
            </button>
          </div>
          
          {showAdvancedDateFilter && (
            <div className="mt-2 border rounded-md p-2 bg-white shadow-sm border-blue-100">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-gray-600 mb-1 font-medium">Start</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => {
                      setStartDate(e.target.value);
                      setSelectedDatePreset(null);
                    }}
                    className="w-full rounded-md border-gray-200 shadow-sm text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 mb-1 font-medium">End</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => {
                      setEndDate(e.target.value);
                      setSelectedDatePreset(null);
                    }}
                    className="w-full rounded-md border-gray-200 shadow-sm text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Enhanced Time of Day */}
        <div className="w-full md:w-1/2 lg:w-1/4 px-2 mb-4">
          <div className="flex items-center mb-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-1.5 ${activeTimeFilters ? 'bg-blue-100' : 'bg-gray-50'}`}>
              <svg className={`h-3.5 w-3.5 ${activeTimeFilters ? 'text-blue-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className={`text-sm font-medium ${activeTimeFilters ? 'text-blue-800' : 'text-gray-700'}`}>Time</span>
            {activeTimeFilters && (
              <span className="ml-auto bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                {selectedShifts.length === 1 ? selectedShifts[0].label || 'Active' : `${selectedShifts.length} selected`}
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {shifts.map(shift => {
              const isSelected = selectedShifts.filter(s =>
                typeof s === 'object' ? s.id === shift.id : s === shift.id
              ).length > 0;
              
              return (
                <button
                  key={shift.id}
                  onClick={() => toggleShift(shift.id)}
                  className={`
                    relative flex flex-col items-center justify-center rounded-md p-2 transition-all duration-200 border text-xs
                    ${isSelected
                      ? 'bg-gradient-to-b from-blue-50 to-blue-100 border-blue-200 text-blue-800 shadow-sm'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}
                  `}
                >
                  <span className="text-lg mb-0.5">{shift.id === 'DAY' ? '☀️' : shift.id === 'EVENING' ? '🌆' : '🌙'}</span>
                  <span className={`text-xs ${isSelected ? 'font-medium' : ''}`}>{shift.label}</span>
                  <span className="text-[10px] text-gray-500">{shift.time}</span>
                  
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Enhanced Crime Types */}
        <div className="w-full md:w-1/2 lg:w-1/4 px-2 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-1.5 ${activeCrimeTypeFilters ? 'bg-blue-100' : 'bg-gray-50'}`}>
                <svg className={`h-3.5 w-3.5 ${activeCrimeTypeFilters ? 'text-blue-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <span className={`text-sm font-medium ${activeCrimeTypeFilters ? 'text-blue-800' : 'text-gray-700'}`}>Crime Types</span>
            </div>
            {activeCrimeTypeFilters && (
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                {selectedCrimeTypes.length}
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-3 gap-2 mb-2">
            {Object.entries(crimeCategories).map(([category, data]) => {
              const activeCount = getSelectedCountForCategory(category);
              const isActive = getCategoryActiveStatus(category);
              const totalCount = data.crimes.length;
              
              return (
                <button
                  key={category}
                  onClick={() => toggleCategory(category)}
                  className={`
                    relative flex flex-col items-center justify-center rounded-md p-2 transition-all duration-200 border text-xs
                    ${isActive
                      ? 'bg-gradient-to-b from-blue-50 to-blue-100 border-blue-200 text-blue-700 shadow-sm'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}
                  `}
                >
                  <span className="text-lg mb-0.5">{data.icon}</span>
                  <span className={`text-xs ${isActive ? 'font-medium' : ''}`}>{category}</span>
                  
                  {/* Selection indicator */}
                  {activeCount > 0 && (
                    <div className="absolute top-1 right-1 flex items-center justify-center bg-blue-500 text-white rounded-full text-[8px] w-4 h-4">
                      {activeCount}
                    </div>
                  )}
                  
                  {/* Progress bar indicating selection ratio */}
                  <div className="w-full bg-gray-200 rounded-full h-1 mt-1 overflow-hidden">
                    <div
                      className="bg-blue-500 h-1"
                      style={{ width: `${(activeCount / totalCount) * 100}%` }}
                    ></div>
                  </div>
                </button>
              );
            })}
          </div>
          
          <div className="text-center">
            <button
              onClick={() => setShowAdvancedCrimeFilter(!showAdvancedCrimeFilter)}
              className={`
                text-xs px-3 py-1 rounded-md border transition-all duration-200
                ${showAdvancedCrimeFilter
                  ? 'bg-indigo-100 border-indigo-200 text-indigo-700 font-medium'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}
              `}
            >
              {showAdvancedCrimeFilter ? 'Hide details' : 'Show details'}
            </button>
          </div>
          
          {showAdvancedCrimeFilter && (
            <div className="mt-2 border rounded-md p-2 bg-white shadow-sm border-blue-100 max-h-48 overflow-y-auto">
              <div className="flex justify-between mb-2">
                <div className="flex space-x-1">
                  <button
                    onClick={selectAllCrimeTypes}
                    className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-md border border-blue-200 hover:bg-blue-100 transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={clearCrimeTypes}
                    className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    Clear
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-1.5 pointer-events-none">
                    <svg className="w-3 h-3 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="text-xs border border-gray-200 rounded-md pl-6 pr-2 py-1 w-24 focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
                  />
                </div>
              </div>
              
              {/* Improved crime type selection */}
              <div className="space-y-1 divide-y divide-gray-100">
                {Object.entries(categorizedCrimeTypes).map(([category, crimes]) => (
                  <div key={category} className="pt-1 first:pt-0">
                    {filteredCrimeTypes(crimes).map(type => (
                      <label key={type} className="flex items-center text-xs py-0.5 hover:bg-blue-50 rounded px-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedCrimeTypes.includes(type)}
                          onChange={() => toggleCrimeType(type)}
                          className="rounded text-blue-600 focus:ring-blue-500 h-3 w-3"
                        />
                        <span className="ml-1.5 text-xs truncate">{type}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Enhanced Demographics */}
        <div className="w-full md:w-1/2 lg:w-1/4 px-2 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-1.5 ${showCensusOverlay ? 'bg-purple-100' : 'bg-gray-50'}`}>
                <svg className={`h-3.5 w-3.5 ${showCensusOverlay ? 'text-purple-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className={`text-sm font-medium ${showCensusOverlay ? 'text-purple-800' : 'text-gray-700'}`}>Demographics</span>
            </div>
            <label className="inline-flex items-center">
              <span className="text-xs text-gray-500 mr-2">Enable</span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={showCensusOverlay}
                  onChange={() => toggleCensusOverlay(!showCensusOverlay)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer dark:bg-gray-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </div>
            </label>
          </div>
          
          <div className={`grid grid-cols-5 gap-2 transition-opacity duration-300 ${showCensusOverlay ? "" : "opacity-50 pointer-events-none"}`}>
            {censusOptions.map(option => {
              const isSelected = selectedCensusMetric === option.id;
              
              return (
                <button
                  key={option.id}
                  onClick={() => handleDemographicSelection(option.id)}
                  className={`
                    relative flex flex-col items-center justify-center rounded-md p-2 transition-all duration-200 border text-xs
                    ${isSelected
                      ? 'bg-gradient-to-b from-purple-50 to-purple-100 border-purple-200 text-purple-700 shadow-sm'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}
                  `}
                  disabled={!showCensusOverlay}
                >
                  <span className="text-lg mb-0.5">{option.icon}</span>
                  <span className={`text-[10px] ${isSelected ? 'font-medium' : ''}`}>{option.label}</span>
                  
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Filters; 