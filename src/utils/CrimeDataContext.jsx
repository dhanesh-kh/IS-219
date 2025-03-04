import React, { createContext, useContext, useState, useEffect } from 'react';
import { processData, processHeatMapData, processTimeDistribution, processCrimeTypes, processTemporalTrends } from './dataProcessing';
import { loadCensusData, correlateCrimeWithCensus } from './censusDataProcessing';

const CrimeDataContext = createContext();

export const useCrimeData = () => {
  const context = useContext(CrimeDataContext);
  if (!context) {
    throw new Error('useCrimeData must be used within a CrimeDataProvider');
  }
  return context;
};

export const CrimeDataProvider = ({ children }) => {
  const [data, setData] = useState({
    isLoading: true,
    error: null,
    rawData: [],
    filteredRawData: [],
    heatMapData: [],
    timeDistribution: [],
    crimeTypes: [],
    temporalTrends: [],
    census: null,
    censusCorrelations: [],
    showCensusOverlay: false,
    selectedCensusMetric: 'income',
    filters: {
      dateRange: null,
      crimeTypes: [],
      shifts: []
    }
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('Attempting to fetch CSV data...');
        const response = await fetch('/Crime Incidents in 2024.csv');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        console.log('CSV text length:', csvText.length);
        
        if (!csvText.trim()) {
          throw new Error('CSV file is empty');
        }
        
        // Split by any combination of \r\n, \r, or \n
        let rows = csvText.split(/\r\n|\r|\n/).filter(row => row.trim());
        console.log('Number of rows:', rows.length);
        
        if (rows.length < 2) {
          throw new Error('CSV file has insufficient data');
        }
        
        // Parse headers
        const headers = rows[0].split(',').map(header => header.trim());
        console.log('Headers:', headers);
        
        if (!headers.includes('LATITUDE') || !headers.includes('LONGITUDE')) {
          throw new Error('CSV file is missing required columns');
        }

        const parseRow = (row) => {
          const values = [];
          let currentValue = '';
          let inQuotes = false;
          
          // Add a space after the last character to handle trailing empty fields
          row = row + ' ';
          
          for (let i = 0; i < row.length; i++) {
            const char = row[i];
            const nextChar = row[i + 1];
            
            if (char === '"') {
              inQuotes = !inQuotes;
              continue;
            }
            
            if (char === ',' && !inQuotes) {
              // Handle empty fields
              values.push(currentValue.trim());
              currentValue = '';
              
              // Handle consecutive commas (empty fields)
              while (i + 1 < row.length && row[i + 1] === ',') {
                values.push('');
                i++;
              }
            } else if (i === row.length - 1) {
              // Handle the last field
              currentValue += char;
              values.push(currentValue.trim());
            } else {
              currentValue += char;
            }
          }
          
          // Clean up the values and handle quoted strings
          return values.map(value => {
            value = value.trim();
            return value.replace(/^"|"$/g, '').trim();
          });
        };
        
        const csvData = rows.slice(1).map((row, index) => {
          try {
            const values = parseRow(row);
            
            // Log parsing details for debugging
            console.log(`Row ${index + 2} parsed values:`, values.length);
            
            // Handle missing trailing fields by padding with empty strings
            while (values.length < headers.length) {
              values.push('');
            }
            
            // Ensure we have the correct number of values
            if (values.length !== headers.length) {
              console.warn(`Row ${index + 2} has mismatched columns. Expected ${headers.length}, got ${values.length}`);
              console.warn('Row:', row);
              console.warn('Parsed values:', values);
              return null;
            }
            
            // Create object from headers and values
            return headers.reduce((obj, header, i) => {
              obj[header] = values[i] || ''; // Use empty string for null/undefined values
              return obj;
            }, {});
          } catch (e) {
            console.warn(`Error parsing row ${index + 2}:`, e);
            return null;
          }
        }).filter(row => row !== null);

        console.log('Successfully parsed rows:', csvData.length);
        if (csvData.length > 0) {
          console.log('Sample first row:', csvData[0]);
        }

        if (csvData.length === 0) {
          throw new Error('No valid data rows in CSV');
        }
        
        // Load census data
        const censusData = await loadCensusData();

        // Process the crime data
        const processedData = await processData(csvData);

        // Debug the processed crime types
        console.log('Processed crime types:', processedData.crimeTypes);
        
        // Check for any 'Unknown' offenses
        const unknownCount = processedData.rawData.filter(item => item.offense === 'UNKNOWN' || item.offense === 'Unknown').length;
        console.log(`Number of Unknown offenses: ${unknownCount} out of ${processedData.rawData.length}`);
        
        // Create correlations between crime and census data
        const censusCorrelations = correlateCrimeWithCensus(processedData.rawData, censusData);
        
        setData(prev => ({
          ...prev,
          isLoading: false,
          ...processedData,
          filteredRawData: processedData.rawData, // Initially the filtered data is the same as raw data
          census: censusData,
          censusCorrelations
        }));
      } catch (error) {
        console.error('Error loading crime data:', error);
        setData(prev => ({
          ...prev,
          isLoading: false,
          error: `Failed to load crime data: ${error.message}`
        }));
      }
    };

    loadData();
  }, []);

  // Filter data based on current filters
  const filterData = (filters) => {
    setData(prev => {
      const filteredRawData = prev.rawData.filter(incident => {
        // Date range filter
        if (filters.dateRange) {
          const { start, end } = filters.dateRange;
          const reportDate = incident.reportDate;
          
          // Check start date if it exists
          if (start && (!reportDate || reportDate < start)) {
            return false;
          }
          
          // Check end date if it exists
          if (end && (!reportDate || reportDate > end)) {
            return false;
          }
        }

        // Crime type filter
        if (filters.crimeTypes.length > 0 && !filters.crimeTypes.includes(incident.offense)) {
          return false;
        }

        // Shift filter
        if (filters.shifts.length > 0 && !filters.shifts.includes(incident.shift)) {
          return false;
        }

        return true;
      });

      // Reprocess filtered data
      const newData = {
        ...prev,
        filters,
        filteredRawData: filteredRawData, // Store the filtered data separately  
        // Use filteredRawData for all derived data
        heatMapData: processHeatMapData(filteredRawData),
        timeDistribution: processTimeDistribution(filteredRawData),
        crimeTypes: processCrimeTypes(filteredRawData),
        temporalTrends: processTemporalTrends(filteredRawData),
        // Recalculate census correlations with filtered data
        censusCorrelations: correlateCrimeWithCensus(filteredRawData, prev.census)
      };

      console.log('Filtered data:', {
        totalRecords: filteredRawData.length,
        heatMapSample: newData.heatMapData.slice(0, 2),
        timeDistribution: newData.timeDistribution,
        crimeTypesSample: newData.crimeTypes.slice(0, 2)
      });

      return newData;
    });
  };
  
  // Toggle census data overlay
  const toggleCensusOverlay = () => {
    console.log('Toggling census overlay');
    setData(prev => {
      const newState = {
        ...prev,
        showCensusOverlay: !prev.showCensusOverlay
      };
      console.log('New census overlay state:', newState.showCensusOverlay);
      return newState;
    });
  };
  
  // Change the selected census metric for visualization
  const selectCensusMetric = (metric) => {
    console.log('Setting census metric to:', metric);
    setData(prev => ({
      ...prev,
      selectedCensusMetric: metric
    }));
  };

  const value = {
    ...data,
    filterData,
    toggleCensusOverlay,
    selectCensusMetric
  };

  return (
    <CrimeDataContext.Provider value={value}>
      {children}
    </CrimeDataContext.Provider>
  );
}; 