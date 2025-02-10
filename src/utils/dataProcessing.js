import { parse, format, parseISO } from 'date-fns';

// Parse date strings with error handling
export const parseDate = (dateString) => {
  if (!dateString) return null;
  try {
    // Remove timezone offset for consistent parsing
    const cleanDateString = dateString.replace(/\+\d{2}$/, '');
    // Parse date in the format "yyyy/MM/dd HH:mm:ss"
    return parse(cleanDateString, 'yyyy/MM/dd HH:mm:ss', new Date());
  } catch (error) {
    console.error('Error parsing date:', dateString, error);
    return null;
  }
};

// Clean and validate a single data record
const cleanRecord = (record) => {
  try {
    // Parse dates first to validate them
    const reportDate = parseDate(record.REPORT_DAT);
    const startDate = parseDate(record.START_DATE);
    const endDate = record.END_DATE ? parseDate(record.END_DATE) : null;

    if (!reportDate) {
      console.warn('Invalid report date:', record.REPORT_DAT);
      return null;
    }

    return {
      // Geographic data - convert to numbers and validate
      latitude: parseFloat(record.LATITUDE) || 0,
      longitude: parseFloat(record.LONGITUDE) || 0,
      x: parseFloat(record.X) || 0,
      y: parseFloat(record.Y) || 0,
      
      // Temporal data
      reportDate,
      startDate,
      endDate,
      shift: record.SHIFT || 'UNKNOWN',
      
      // Crime classification
      method: record.METHOD || 'UNKNOWN',
      offense: record.OFFENSE || 'UNKNOWN',
      
      // Location information
      block: record.BLOCK || '',
      ward: parseInt(record.WARD) || 0,
      anc: record.ANC || '',
      district: record.DISTRICT || '',
      psa: record.PSA || '',
      neighborhood: record.NEIGHBORHOOD_CLUSTER || '',
      bid: record.BID || '',
      
      // Identifiers
      ccn: record.CCN || '',
      objectId: record.OBJECTID || '',
      
      // Census information
      blockGroup: record.BLOCK_GROUP || '',
      censusTract: record.CENSUS_TRACT || '',
      votingPrecinct: record.VOTING_PRECINCT || ''
    };
  } catch (error) {
    console.error('Error cleaning record:', error);
    return null;
  }
};

// Process data for heat map
export const processHeatMapData = (data) => {
  return data
    .filter(incident => incident.latitude && incident.longitude)
    .map(incident => ({
      lat: incident.latitude,
      lng: incident.longitude,
      offense: incident.offense,
      reportDate: incident.reportDate,
      shift: incident.shift,
      weight: 1
    }));
};

// Process data for time distribution
export const processTimeDistribution = (data) => {
  const shiftOrder = ['DAY', 'EVENING', 'MIDNIGHT'];
  const shiftCounts = data.reduce((acc, incident) => {
    acc[incident.shift] = (acc[incident.shift] || 0) + 1;
    return acc;
  }, {});

  return shiftOrder.map(shift => ({
    shift,
    count: shiftCounts[shift] || 0
  }));
};

// Process data for crime type distribution
export const processCrimeTypes = (data) => {
  const crimeCounts = data.reduce((acc, incident) => {
    acc[incident.offense] = (acc[incident.offense] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(crimeCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Get top 10 crime types
};

// Process temporal trends
export const processTemporalTrends = (data) => {
  const dailyCounts = data.reduce((acc, incident) => {
    if (incident.reportDate) {
      try {
        const dateKey = format(incident.reportDate, 'yyyy-MM-dd');
        acc[dateKey] = (acc[dateKey] || 0) + 1;
      } catch (error) {
        console.warn('Error processing date for temporal trends:', error);
      }
    }
    return acc;
  }, {});

  return Object.entries(dailyCounts)
    .map(([date, count]) => {
      try {
        return {
          date: parseISO(date),
          count
        };
      } catch (error) {
        console.warn('Error parsing date for temporal trends:', error);
        return null;
      }
    })
    .filter(item => item !== null)
    .sort((a, b) => a.date - b.date);
};

// Main data processing function
export const processData = async (csvData) => {
  // Clean and validate all records
  const cleanedData = csvData
    .map(cleanRecord)
    .filter(record => record !== null);

  console.log('Cleaned data sample:', cleanedData.slice(0, 2));

  return {
    rawData: cleanedData,
    heatMapData: processHeatMapData(cleanedData),
    timeDistribution: processTimeDistribution(cleanedData),
    crimeTypes: processCrimeTypes(cleanedData),
    temporalTrends: processTemporalTrends(cleanedData)
  };
}; 