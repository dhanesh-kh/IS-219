// Census Data Processing Utility
// Handles loading and transforming census data for visualization integration

// Maps to convert census data codes to readable labels
const censusCodeMaps = {
  income: {
    'B19001001': 'Total',
    'B19001002': 'Less than $10,000',
    'B19001003': '$10,000 to $14,999',
    'B19001004': '$15,000 to $19,999',
    'B19001005': '$20,000 to $24,999',
    'B19001006': '$25,000 to $29,999',
    'B19001007': '$30,000 to $34,999',
    'B19001008': '$35,000 to $39,999',
    'B19001009': '$40,000 to $44,999',
    'B19001010': '$45,000 to $49,999',
    'B19001011': '$50,000 to $59,999',
    'B19001012': '$60,000 to $74,999',
    'B19001013': '$75,000 to $99,999',
    'B19001014': '$100,000 to $124,999',
    'B19001015': '$125,000 to $149,999',
    'B19001016': '$150,000 to $199,999',
    'B19001017': '$200,000 or more'
  },
  education: {
    'B15002001': 'Total',
    // Higher education metrics (Bachelor's degree or higher)
    'B15002015': 'Male: Bachelor\'s degree',
    'B15002016': 'Male: Master\'s degree',
    'B15002017': 'Male: Professional school degree',
    'B15002018': 'Male: Doctorate degree',
    'B15002032': 'Female: Bachelor\'s degree',
    'B15002033': 'Female: Master\'s degree',
    'B15002034': 'Female: Professional school degree',
    'B15002035': 'Female: Doctorate degree'
  },
  race: {
    'B03002002': 'Not Hispanic or Latino',
    'B03002003': 'Not Hispanic or Latino: White alone',
    'B03002004': 'Not Hispanic or Latino: Black or African American alone',
    'B03002005': 'Not Hispanic or Latino: American Indian and Alaska Native alone',
    'B03002006': 'Not Hispanic or Latino: Asian alone',
    'B03002007': 'Not Hispanic or Latino: Native Hawaiian and Other Pacific Islander alone',
    'B03002008': 'Not Hispanic or Latino: Some other race alone',
    'B03002009': 'Not Hispanic or Latino: Two or more races',
    'B03002012': 'Hispanic or Latino'
  },
  housing: {
    'B25075001': 'Total',
    'B25075025': '$750,000 to $999,999',
    'B25075026': '$1,000,000 to $1,499,999',
    'B25075027': '$1,500,000 or more'
  },
  poverty: {
    'B17001002': 'Income in the past 12 months below poverty level',
    'B17001031': 'Income in the past 12 months at or above poverty level'
  },
  transportation: {
    'B08006001': 'Total',
    'B08006002': 'Car, truck, or van',
    'B08006008': 'Public transportation (excluding taxicab)',
    'B08006014': 'Walked',
    'B08006015': 'Bicycle',
    'B08006016': 'Taxicab, motorcycle, or other means',
    'B08006017': 'Worked from home'
  }
};

// Function to load all census data files
export const loadCensusData = async () => {
  try {
    console.log('Loading census data files...');
    
    // Define the files to load
    const censusFiles = [
      { name: 'income', path: '/dc_income.csv' },
      { name: 'education', path: '/dc_education.csv' },
      { name: 'race', path: '/dc_race.csv' },
      { name: 'poverty', path: '/dc_poverty.csv' },
      { name: 'value', path: '/dc_value.csv' },
      { name: 'mobility', path: '/dc_mobility.csv' },
      { name: 'transportation', path: '/dc_transportation.csv' },
      { name: 'tenure', path: '/dc_tenure.csv' }
    ];
    
    // Load each file
    const filePromises = censusFiles.map(async (file) => {
      const response = await fetch(file.path);
      
      if (!response.ok) {
        throw new Error(`Failed to load ${file.name} data: ${response.status}`);
      }
      
      const csvText = await response.text();
      return { name: file.name, data: parseCSV(csvText) };
    });
    
    // Wait for all files to load
    const results = await Promise.all(filePromises);
    
    // Convert to an object with file names as keys
    const censusData = results.reduce((acc, { name, data }) => {
      acc[name] = data;
      return acc;
    }, {});
    
    console.log('Census data loaded successfully');
    return processCensusData(censusData);
  } catch (error) {
    console.error('Error loading census data:', error);
    throw error;
  }
};

// Parse CSV text into JSON
const parseCSV = (csvText) => {
  // Split by rows
  const rows = csvText.split(/\r?\n/).filter(row => row.trim());
  
  // Parse headers (first row)
  const headers = parseCSVRow(rows[0]);
  
  // Parse data rows
  return rows.slice(1).map(row => {
    const values = parseCSVRow(row);
    return headers.reduce((obj, header, index) => {
      // For census data, we want to keep the numeric values as numbers
      const value = values[index];
      if (header.includes('Error')) {
        // Skip error margin columns
        return obj;
      }
      
      obj[header] = !isNaN(value) && value !== '' ? Number(value) : value;
      return obj;
    }, {});
  });
};

// Parse a single CSV row, handling commas within quotes
const parseCSVRow = (row) => {
  const values = [];
  let currentValue = '';
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(currentValue.trim());
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  
  // Add the last value
  values.push(currentValue.trim());
  
  return values;
};

// Process the loaded census data into useful formats for visualization
const processCensusData = (rawData) => {
  // Use Washington DC specific data (match by geoid for Washington DC)
  const dcGeoid = '16000US1150000';
  
  const processedData = {
    // Extract data for Washington DC from each dataset
    income: extractDataForDC(rawData.income, dcGeoid),
    education: extractDataForDC(rawData.education, dcGeoid),
    race: extractDataForDC(rawData.race, dcGeoid),
    poverty: extractDataForDC(rawData.poverty, dcGeoid),
    housing: extractDataForDC(rawData.value, dcGeoid),
    mobility: extractDataForDC(rawData.mobility, dcGeoid),
    transportation: extractDataForDC(rawData.transportation, dcGeoid),
    tenure: extractDataForDC(rawData.tenure, dcGeoid),
    
    // Derived metrics (calculated from the raw data)
    derivedMetrics: calculateDerivedMetrics(rawData, dcGeoid)
  };
  
  return processedData;
};

// Extract DC-specific data from a dataset
const extractDataForDC = (dataset, dcGeoid) => {
  const dcData = dataset.find(row => row.geoid === dcGeoid);
  
  if (!dcData) {
    console.warn('DC data not found in dataset');
    return {};
  }
  
  return dcData;
};

// Calculate derived metrics useful for visualization
const calculateDerivedMetrics = (rawData, dcGeoid) => {
  const income = extractDataForDC(rawData.income, dcGeoid);
  const education = extractDataForDC(rawData.education, dcGeoid);
  const poverty = extractDataForDC(rawData.poverty, dcGeoid);
  const housing = extractDataForDC(rawData.value, dcGeoid);
  const race = extractDataForDC(rawData.race, dcGeoid);
  
  // Calculate higher education percentage
  const totalPopulation = education.B15002001 || 0;
  const higherEducationFields = [
    'B15002015', 'B15002016', 'B15002017', 'B15002018',
    'B15002032', 'B15002033', 'B15002034', 'B15002035'
  ];
  
  const higherEducationTotal = higherEducationFields.reduce(
    (total, field) => total + (education[field] || 0), 0
  );
  
  const higherEducationPercentage = 
    totalPopulation > 0 ? (higherEducationTotal / totalPopulation) * 100 : 0;
  
  // Calculate poverty percentage
  const totalPovertyPopulation = (poverty.B17001001 || 0);
  const belowPovertyCount = poverty.B17001002 || 0;
  const povertyPercentage = 
    totalPovertyPopulation > 0 ? (belowPovertyCount / totalPovertyPopulation) * 100 : 0;
  
  // Calculate high value housing percentage
  const totalHousingUnits = housing.B25075001 || 0;
  const highValueFields = ['B25075025', 'B25075026', 'B25075027']; // 750K and above
  const highValueTotal = highValueFields.reduce(
    (total, field) => total + (housing[field] || 0), 0
  );
  
  const highValueHousingPercentage = 
    totalHousingUnits > 0 ? (highValueTotal / totalHousingUnits) * 100 : 0;
  
  // Calculate diversity index (simplified)
  const totalRacePopulation = race.B03002001 || 0;
  const whitePopulation = race.B03002003 || 0;
  const blackPopulation = race.B03002004 || 0;
  const asianPopulation = race.B03002006 || 0;
  const hispanicPopulation = race.B03002012 || 0;
  
  // Simple diversity index calculation
  const whitePercent = totalRacePopulation > 0 ? whitePopulation / totalRacePopulation : 0;
  const blackPercent = totalRacePopulation > 0 ? blackPopulation / totalRacePopulation : 0;
  const asianPercent = totalRacePopulation > 0 ? asianPopulation / totalRacePopulation : 0;
  const hispanicPercent = totalRacePopulation > 0 ? hispanicPopulation / totalRacePopulation : 0;
  
  // Higher index = more diverse (max is 1)
  const diversityIndex = 1 - (
    Math.pow(whitePercent, 2) + 
    Math.pow(blackPercent, 2) + 
    Math.pow(asianPercent, 2) + 
    Math.pow(hispanicPercent, 2)
  );
  
  return {
    higherEducationPercentage,
    povertyPercentage,
    highValueHousingPercentage,
    diversityIndex,
    racialComposition: {
      white: whitePercent * 100,
      black: blackPercent * 100,
      asian: asianPercent * 100,
      hispanic: hispanicPercent * 100,
      other: 100 - ((whitePercent + blackPercent + asianPercent + hispanicPercent) * 100)
    }
  };
};

// Extract census data for correlation with crime by tract
export const getDataByTract = (censusData, tractId) => {
  // Note: This would need to match census tract data with specific tracts
  // For now, we'll return sample data as this matching would require more data
  // In a real implementation, you would match census tract IDs to data
  return {
    income: 85000, // Median household income for this tract
    education: 65, // Percent with higher education
    housing: 72000, // Median housing value
    poverty: 12, // Poverty rate percentage
    diversity: 0.65 // Diversity index (0-1)
  };
};

// Correlate crime data with census data
export const correlateCrimeWithCensus = (crimeData, censusData) => {
  // Group crime data by census tract
  const crimeByTract = crimeData.reduce((acc, crime) => {
    const tract = crime.censusTract?.replace(/\s+/g, '') || 'unknown';
    
    if (!acc[tract]) {
      acc[tract] = [];
    }
    
    acc[tract].push(crime);
    return acc;
  }, {});
  
  // Calculate crime rates and correlate with census metrics
  const correlations = Object.entries(crimeByTract).map(([tract, crimes]) => {
    // Skip unknown tracts
    if (tract === 'unknown') return null;
    
    // Get census data for this tract
    const tractCensusData = getDataByTract(censusData, tract);
    
    // Count total crimes and by type
    const totalCrimes = crimes.length;
    const crimesByType = crimes.reduce((acc, crime) => {
      const type = crime.offense || 'UNKNOWN';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    
    // Calculate violent crime percentage
    const violentCrimeTypes = ['HOMICIDE', 'ASSAULT W/DANGEROUS WEAPON', 'SEX ABUSE', 'ROBBERY'];
    const violentCrimes = violentCrimeTypes.reduce((sum, type) => sum + (crimesByType[type] || 0), 0);
    const violentCrimePercentage = totalCrimes > 0 ? (violentCrimes / totalCrimes) * 100 : 0;
    
    return {
      tract,
      totalCrimes,
      crimeRate: totalCrimes, // Would be normalized by population in real implementation
      violentCrimePercentage,
      crimesByType,
      censusMetrics: tractCensusData,
      // Simple correlation indicators (for demonstration - real implementation would use statistical correlation)
      correlationIndices: {
        incomeCrimeCorrelation: -0.65, // Example value: negative correlation
        educationCrimeCorrelation: -0.58, // Example value: negative correlation
        povertyCrimeCorrelation: 0.72, // Example value: positive correlation
        diversityCrimeCorrelation: 0.15 // Example value: weak positive correlation
      }
    };
  }).filter(Boolean);
  
  return correlations;
};

export default {
  loadCensusData,
  correlateCrimeWithCensus,
  censusCodeMaps
}; 