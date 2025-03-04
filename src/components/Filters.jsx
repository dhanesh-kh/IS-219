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
  const resetFilters = () => {
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
  const toggleShift = (shift) => {
    const shiftId = typeof shift === 'string' ? shift : shift.id;
    
    setSelectedShifts(prev => {
      const normalizedPrev = prev.map(s => typeof s === 'string' ? s : s.id);
      
      let newSelection;
      if (normalizedPrev.includes(shiftId)) {
        newSelection = prev.filter(s => (typeof s === 'string' ? s !== shiftId : s.id !== shiftId));
      } else {
        // Find the full shift object if available
        const shiftObj = shifts.find(s => s.id === shiftId) || shiftId;
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

  // Clear date range filter
  const clearDateRange = () => {
    setStartDate('');
    setEndDate('');
    setSelectedDatePreset(null);
    setActiveDateFilters(false);
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
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6 animate-fadeIn">
      {/* Header Section with Status and Controls */}
      <div className="flex flex-wrap items-center justify-between mb-6">
        <div>
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-800">Filters</h2>
            {activeFilterCount > 0 && (
              <span className="ml-2 px-2.5 py-1 text-xs bg-blue-100 text-blue-800 rounded-full font-medium">
                {activeFilterCount} active
              </span>
            )}
          </div>
          
          {/* Active Filter Summary - Shows what's currently filtered */}
          <p className="text-sm text-gray-600 mt-1">
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading data...
              </span>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center">
                  <div className="flex">
                    <span className="font-medium">{rawData.length.toLocaleString()}</span>
                    <span className="ml-1">incidents found</span>
                  </div>
                  {dateRange.min && dateRange.max &&
                    <span className="text-gray-500 ml-1">· Data from {formatDisplayDate(dateRange.min)} to {formatDisplayDate(dateRange.max)}</span>
                  }
                </div>
                
                {activeFilterCount > 0 && (
                  <div className="flex flex-wrap gap-2 items-center mt-2 text-xs">
                    <span className="text-gray-500">Currently showing:</span>
                    
                    {activeDateFilters && (
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDisplayDate(startDate)} to {formatDisplayDate(endDate)}
                      </span>
                    )}
                    
                    {activeCrimeTypeFilters && (
                      <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-100 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {selectedCrimeTypes.length} crime types
                      </span>
                    )}
                    
                    {activeTimeFilters && (
                      <span className="bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-100 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {selectedShifts.length} time periods
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </p>
        </div>
        
        <div className="flex sm:mt-0">
          <button
            onClick={resetFilters}
            disabled={activeFilterCount === 0 || isLoading}
            className={`filter-btn text-red-600 border-red-100 bg-red-50 ${
              activeFilterCount === 0 || isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-100 hover:text-red-700'
            }`}
            title="Reset all filters to their default values"
            aria-label="Reset all filters"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Reset All</span>
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Date Range - Simplified Design with Fewer Calendar Icons */}
        <div className={`filter-section hover:shadow-md transition-all duration-200 ${activeDateFilters ? 'border-blue-300 bg-blue-50/10' : ''}`}>
          <div className="flex justify-between items-center mb-2">
            <h3 className="filter-section-title flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Date Range
              {activeDateFilters && (
                <div className="ml-2 inline-flex items-center">
                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
                  <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full font-medium">
                    Active
                  </span>
                </div>
              )}
            </h3>
            
            <div className="flex items-center gap-1.5">
              {dateRange.min && dateRange.max && (
                <span className="text-xs text-gray-500">
                  Available: {formatDisplayDate(dateRange.min)} - {formatDisplayDate(dateRange.max)}
                </span>
              )}
              {(startDate || endDate) && (
                <button
                  onClick={clearDateRange}
                  className="text-xs py-1 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded flex items-center border border-transparent hover:border-red-100"
                  title="Clear date range"
                  aria-label="Clear date range"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear
                </button>
              )}
            </div>
          </div>
          
          {/* Active date range summary */}
          {(startDate || endDate) && (
            <div className="my-3 bg-blue-100 p-3 rounded-md text-sm text-blue-800 flex items-center border border-blue-200">
              <div className="p-2 bg-blue-200 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold">Current Date Filter:</div>
                <div>
                  {startDate && endDate
                    ? `${formatDisplayDate(startDate)} to ${formatDisplayDate(endDate)}`
                    : startDate
                      ? `From ${formatDisplayDate(startDate)} onwards`
                      : endDate
                        ? `Up to ${formatDisplayDate(endDate)}`
                        : 'All dates'
                  }
                  {selectedDatePreset && (
                    <span className="ml-2 text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                      {datePresets.find(p => p.id === selectedDatePreset)?.label}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Quick Date Presets - Simplified design */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium text-gray-700">Quick Select:</h4>
              <div className="h-px flex-grow mx-2 bg-gray-200"></div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {datePresets.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => applyDatePreset(preset.id)}
                  className={`group relative py-2 px-2 rounded-md transition-all duration-200 ${
                    selectedDatePreset === preset.id
                      ? 'bg-blue-500 text-white font-medium shadow-md transform -translate-y-0.5'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-blue-50 hover:border-blue-200 hover:shadow-sm'
                  }`}
                  title={`Set date range to ${preset.label}`}
                >
                  <span className="text-xs font-medium">{preset.label}</span>
                  
                  {/* Selection indicator */}
                  {selectedDatePreset === preset.id && (
                    <div className="absolute top-0 right-0 p-1">
                      <div className="bg-white text-blue-600 rounded-full p-0.5 w-4 h-4 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
          
          {/* Custom Date Range Selector - Simplified */}
          <div className="border-t border-gray-200 pt-3 mt-3">
            <h4 className="text-xs font-medium text-gray-700 mb-2">Custom Date Range:</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="start-date" className="block text-xs font-medium text-gray-700 mb-1.5">
                  Start Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    id="start-date"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:ring-opacity-50 transition-all"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setSelectedDatePreset(null);
                    }}
                    min={dateRange.min}
                    max={dateRange.max || endDate}
                    aria-label="Start date"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="end-date" className="block text-xs font-medium text-gray-700 mb-1.5">
                  End Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    id="end-date"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:ring-opacity-50 transition-all"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setSelectedDatePreset(null);
                    }}
                    min={startDate || dateRange.min}
                    max={dateRange.max}
                    aria-label="End date"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Time of Day - Simplified and More Intuitive */}
        <div className={`filter-section hover:shadow-md transition-all duration-200 ${activeTimeFilters ? 'border-yellow-300 bg-yellow-50/10' : ''}`}>
          <div className="flex justify-between items-center mb-2">
            <h3 className="filter-section-title flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Time of Day
              {activeTimeFilters && (
                <div className="ml-2 inline-flex items-center">
                  <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full mr-1"></span>
                  <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full font-medium">
                    Active
                  </span>
                </div>
              )}
            </h3>
            
            {selectedShifts.length > 0 && (
              <button
                onClick={() => setSelectedShifts([])}
                className="text-xs py-1 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded flex items-center border border-transparent hover:border-red-100"
                title="Clear time of day filters"
                aria-label="Clear time of day filters"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear
              </button>
            )}
          </div>
          
          {/* Active time filter indicator */}
          {activeTimeFilters && (
            <div className="mb-3 bg-yellow-100 p-3 rounded-md text-sm text-yellow-800 flex items-center border border-yellow-200">
              <div className="p-2 bg-yellow-200 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold">Showing incidents during:</div>
                <div>
                  {selectedShifts.map(s => typeof s === 'object' ? `${s.label} (${s.time})` : s).join(', ')}
                </div>
              </div>
            </div>
          )}
          
          {/* Simplified time period buttons with clear, consistent design */}
          <div className="grid grid-cols-3 gap-3">
            {shifts.map(shift => {
              const isSelected = selectedShifts.some(s =>
                (typeof s === 'string' && s === shift.id) ||
                (typeof s === 'object' && s.id === shift.id)
              );
              
              // Use SVG icons instead of emojis for more consistent appearance
              let icon;
              if (shift.id === 'DAY') {
                icon = (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                );
              } else if (shift.id === 'EVENING') {
                icon = (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                );
              } else {
                icon = (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                );
              }
              
              return (
                <button
                  key={shift.id}
                  onClick={() => toggleShift(shift)}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all duration-200
                    ${isSelected
                      ? 'bg-yellow-100 border-yellow-400 text-yellow-800 shadow-sm transform -translate-y-0.5'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-yellow-50 hover:border-yellow-300'}`}
                  title={shift.description}
                  aria-pressed={isSelected}
                >
                  <div className={`mb-1 ${isSelected ? 'text-yellow-600' : 'text-gray-500'}`}>
                    {icon}
                  </div>
                  <div className="font-medium text-sm">{shift.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{shift.time}</div>
                  
                  {isSelected && (
                    <div className="absolute top-0 right-0 m-1">
                      <div className="bg-yellow-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Demographic Data Overlay - Enhanced for better UX */}
      <div className="mt-6 p-5 rounded-lg border-2 bg-white shadow-sm transition-all duration-300 ease-in-out
        hover:shadow-md"
        style={{
          borderColor: showCensusOverlay ? '#22c55e' : '#e5e7eb',
          background: showCensusOverlay ? 'linear-gradient(to right, rgba(240, 253, 244, 0.3), rgba(187, 247, 208, 0.15))' : 'white'
        }}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <div className={`p-2 rounded-full mr-3 ${showCensusOverlay ? 'bg-green-100' : 'bg-gray-100'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${showCensusOverlay ? 'text-green-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold flex items-center">
                Demographic Data Overlay
                {showCensusOverlay && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full font-medium inline-flex items-center">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>
                    ON
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-600 mt-0.5">
                {showCensusOverlay
                  ? `Showing ${censusOptions.find(o => o.id === selectedCensusMetric)?.label || 'Income'} data overlay on map`
                  : 'Enable to see demographic data on the map'}
              </p>
            </div>
          </div>

          {/* Enhanced toggle switch */}
          <div className="flex items-center">
            <span className="text-xs text-gray-500 mr-2">{showCensusOverlay ? 'Enabled' : 'Disabled'}</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showCensusOverlay}
                onChange={toggleCensusOverlay}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-green-300 rounded-full
                peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-['']
                after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300
                after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500">
              </div>
            </label>
          </div>
        </div>

        {showCensusOverlay && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
            <h4 className="text-sm font-medium text-green-800 mb-2">Currently Showing:</h4>
            <div className="flex items-center">
              <div className="p-1.5 bg-green-100 rounded-full mr-2">
                {selectedCensusMetric === 'income' && <span className="text-lg">💰</span>}
                {selectedCensusMetric === 'education' && <span className="text-lg">🎓</span>}
                {selectedCensusMetric === 'poverty' && <span className="text-lg">📉</span>}
                {selectedCensusMetric === 'housing' && <span className="text-lg">🏘️</span>}
                {selectedCensusMetric === 'race' && <span className="text-lg">👪</span>}
              </div>
              <div>
                <div className="font-medium">
                  {censusOptions.find(o => o.id === selectedCensusMetric)?.label || 'Income'}
                </div>
                <div className="text-xs text-green-700">
                  {censusOptions.find(o => o.id === selectedCensusMetric)?.description || ''}
                </div>
              </div>
            </div>
            
            {/* Enhanced legend */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center p-2 rounded bg-white">
                <div className="flex items-center mr-2">
                  <span className="w-3 h-3 rounded-full bg-green-200 mr-1"></span>
                  <span className="w-3 h-3 rounded-full bg-green-400 mr-1"></span>
                  <span className="w-3 h-3 rounded-full bg-green-600 mr-1"></span>
                </div>
                <span className="text-xs">Demographic intensity (low to high)</span>
              </div>
              <div className="flex items-center p-2 rounded bg-white">
                <div className="flex items-center mr-2">
                  <span className="w-3 h-3 rounded-full bg-red-300 mr-1"></span>
                  <span className="w-3 h-3 rounded-full bg-yellow-300 mr-1"></span>
                  <span className="w-3 h-3 rounded-full bg-green-300 mr-1"></span>
                </div>
                <span className="text-xs">Crime density (high to low)</span>
              </div>
            </div>
          </div>
        )}

        {/* Improved demographic selection controls */}
        <div className={showCensusOverlay ? '' : 'opacity-60 pointer-events-none'}>
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Select Demographic Factor:
          </h4>
          
          {/* Card-style factor selection */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {censusOptions.map(option => (
              <button
                key={option.id}
                onClick={() => selectCensusMetric(option.id)}
                className={`relative py-3 px-2 rounded-lg border-2 flex flex-col items-center justify-center
                  transition-all duration-300 hover:shadow ${
                  selectedCensusMetric === option.id
                    ? 'border-green-500 bg-green-50 text-green-800'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-green-200 hover:bg-green-50/30'
                }`}
                disabled={!showCensusOverlay}
                aria-pressed={selectedCensusMetric === option.id}
                title={option.description}
              >
                <span className="text-2xl mb-1">{option.icon}</span>
                <span className="text-sm font-medium">{option.label}</span>
                
                {/* Better selection indicator */}
                {selectedCensusMetric === option.id && (
                  <div className="absolute top-1 right-1">
                    <div className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Enhanced Crime Types Section */}
      <div className={`mt-6 p-5 rounded-lg border ${activeCrimeTypeFilters ? 'border-purple-300 bg-purple-50/10' : 'border-gray-200'}`}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="filter-section-title text-base">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Crime Types
            {activeCrimeTypeFilters && (
              <div className="ml-2 inline-flex items-center">
                <span className="inline-block w-2 h-2 bg-purple-500 rounded-full mr-1"></span>
                <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full font-medium">
                  {selectedCrimeTypes.length} selected
                </span>
              </div>
            )}
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={selectAllCrimeTypes}
              className="filter-btn bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100 text-xs py-1 px-2"
              aria-label="Select all crime types"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
              Select All
            </button>
            <button
              onClick={clearCrimeTypes}
              disabled={selectedCrimeTypes.length === 0}
              className={`filter-btn bg-red-50 text-red-700 border-red-100 text-xs py-1 px-2 ${
                selectedCrimeTypes.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-100'
              }`}
              aria-label="Clear all crime type selections"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear
            </button>
          </div>
        </div>
        
        {/* Crime categories as tabs - Improved visual design */}
        <div className="mb-3">
          <div className="flex flex-wrap border-b border-gray-200">
            {Object.entries(crimeCategories).map(([category, info]) => {
              const types = categorizedCrimeTypes[category] || [];
              const allSelected = types.length > 0 && types.every(type => selectedCrimeTypes.includes(type));
              const someSelected = types.some(type => selectedCrimeTypes.includes(type));
              const selectedCount = types.filter(type => selectedCrimeTypes.includes(type)).length;
              
              let activeClass;
              if (allSelected) activeClass = `border-${info.color}-500 bg-${info.color}-50 text-${info.color}-800 font-medium`;
              else if (someSelected) activeClass = `border-${info.color}-300 text-${info.color}-700`;
              else activeClass = 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300';
              
              return (
                <button
                  key={category}
                  onClick={() => toggleCategory(category)}
                  className={`mr-1 mb-1 py-2 px-4 border-b-2 text-sm flex items-center ${activeClass} transition-all`}
                  title={`${category} - ${info.description}${allSelected ? ' (Click to deselect all)' : someSelected ? ' (Some selected)' : ' (Click to select all)'}`}
                  aria-label={`${category} crime category - ${selectedCount} of ${types.length} types selected`}
                >
                  <span className="mr-2">{info.icon}</span>
                  {category}
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800">
                    {selectedCount}/{types.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Crime type buttons with improved visual design and organization */}
        <div className={`crime-types-grid ${showAdvancedFilters ? 'max-h-60 overflow-y-auto pr-2 thin-scrollbar' : ''}`}>
          {Object.entries(categorizedCrimeTypes).map(([category, types]) => {
            const categoryInfo = crimeCategories[category] || { color: 'gray', icon: '📋' };
            const selectedCount = types.filter(type => selectedCrimeTypes.includes(type)).length;
            
            return (
              <div key={category}
                className={`mb-4 last:mb-0 ${
                  selectedCount > 0
                    ? `bg-${categoryInfo.color}-50 p-3 rounded-lg border border-${categoryInfo.color}-200 shadow-sm`
                    : 'p-2'
                }`}
              >
                <div className="crime-type-category flex justify-between items-center">
                  <div className="flex items-center">
                    <span className="text-lg mr-2">{categoryInfo.icon}</span>
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{category}</span>
                  </div>
                  
                  {/* Selection stats with percentage bar */}
                  <div className="flex items-center">
                    <div className="h-1.5 w-20 bg-gray-200 rounded-full overflow-hidden mr-2">
                      <div
                        className={`h-full bg-${categoryInfo.color}-500 rounded-full`}
                        style={{width: `${(selectedCount / types.length) * 100}%`}}
                      ></div>
                    </div>
                    <span className={`text-xs font-medium ${selectedCount > 0 ? `text-${categoryInfo.color}-700` : 'text-gray-500'}`}>
                      {selectedCount}/{types.length}
                    </span>
                    
                    {/* Toggle all button */}
                    <button
                      onClick={() => toggleCategory(category)}
                      className={`ml-2 p-1 rounded-full hover:bg-${categoryInfo.color}-100`}
                      title={`${selectedCount === types.length ? 'Deselect' : 'Select'} all ${category} crimes`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg"
                           className={`h-4 w-4 ${selectedCount === types.length ? `text-${categoryInfo.color}-600` : 'text-gray-400'}`}
                           fill="none"
                           viewBox="0 0 24 24"
                           stroke="currentColor">
                        {selectedCount === types.length ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                        )}
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-3">
                  {types.map(type => (
                    <button
                      key={type}
                      onClick={() => toggleCrimeType(type)}
                      className={`crime-type-btn group ${
                        selectedCrimeTypes.includes(type)
                          ? `bg-${categoryInfo.color}-100 text-${categoryInfo.color}-800 border-${categoryInfo.color}-300 shadow-sm font-medium`
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                      } transition-all duration-200`}
                      aria-pressed={selectedCrimeTypes.includes(type)}
                      aria-label={`${type} crime type`}
                    >
                      <div className="flex items-center">
                        {/* Circular indicator for selection state */}
                        <span className={`inline-flex w-3 h-3 rounded-full mr-1.5 items-center justify-center ${
                          selectedCrimeTypes.includes(type)
                            ? `bg-${categoryInfo.color}-500 ring-2 ring-${categoryInfo.color}-200`
                            : 'bg-gray-200 group-hover:bg-gray-300'
                        }`}>
                          {selectedCrimeTypes.includes(type) && (
                            <svg className="h-2 w-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                        <span>{type}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Advanced filters section with improved help content */}
      {showAdvancedFilters && (
        <div className="mt-8 pt-6 border-t border-gray-200 animate-fadeIn">
          {/* Filter Tips Card */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200 shadow-sm">
            <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Filter Usage Tips
            </h4>
            <ul className="text-xs text-blue-800 space-y-1.5 pl-5 list-disc">
              <li>Date presets automatically set both start and end dates for common time periods</li>
              <li>Click category tabs to quickly select or deselect all crime types in that category</li>
              <li>Combine time of day filters to see patterns across different times</li>
              <li>Toggle demographic overlays to see correlations with census data</li>
              <li>Use reset button to clear all filters and start fresh</li>
            </ul>
          </div>
          
          {/* Interactive Category Legend */}
          <div className="mt-5 p-4 rounded-lg bg-white border border-gray-200 shadow-sm">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Crime Category Legend</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Object.entries(crimeCategories).map(([category, info]) => (
                <div
                  key={category}
                  className={`p-3 rounded-lg border ${
                    categorizedCrimeTypes[category]?.some(type => selectedCrimeTypes.includes(type))
                      ? `border-${info.color}-300 bg-${info.color}-50/50`
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                  } cursor-pointer transition-all duration-200`}
                  onClick={() => toggleCategory(category)}
                >
                  <div className="flex items-center mb-1">
                    <span className="text-xl mr-2">{info.icon}</span>
                    <span className="font-medium text-gray-800">{category}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{info.description}</p>
                  
                  {categorizedCrimeTypes[category] && (
                    <div className="mt-2 flex items-center text-xs">
                      <div className={`h-2 bg-${info.color}-500 rounded-full`} style={{
                        width: `${(categorizedCrimeTypes[category].filter(t => selectedCrimeTypes.includes(t)).length / categorizedCrimeTypes[category].length) * 100}%`
                      }}></div>
                      <span className="ml-2 text-gray-500">
                        {categorizedCrimeTypes[category].filter(t => selectedCrimeTypes.includes(t)).length}/{categorizedCrimeTypes[category].length} selected
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* CSS styles - Include thin scrollbar for crime types grid */}
      <style jsx>{`
        .filter-time-btn {
          border: 1px solid;
          border-radius: 0.5rem;
          padding: 0.75rem 0.5rem;
          transition: all 0.2s;
        }
        
        .filter-time-btn:hover {
          transform: translateY(-2px);
        }
        
        .crime-type-btn {
          font-size: 0.75rem;
          padding: 0.4rem 0.75rem;
          border: 1px solid;
          border-radius: 0.375rem;
          display: inline-flex;
          align-items: center;
          transition: all 0.15s;
        }
        
        .crime-type-btn:hover {
          transform: translateY(-2px);
        }
        
        .crime-type-category {
          display: flex;
          align-items: center;
          margin-bottom: 0.25rem;
        }
        
        .crime-types-grid {
          transition: max-height 0.3s;
        }
        
        .thin-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .thin-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        
        .thin-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        
        .thin-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default Filters;