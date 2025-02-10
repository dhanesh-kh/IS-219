import { useMemo } from 'react';
import { useCrimeData } from './CrimeDataContext';
import { format, parseISO, startOfYear, endOfYear, eachDayOfInterval } from 'date-fns';

export const useChartData = () => {
  const { rawData, filters } = useCrimeData();

  // Memoized filtered data
  const filteredData = useMemo(() => {
    return rawData.filter(incident => {
      // Date range filter
      if (filters.dateRange) {
        const { start, end } = filters.dateRange;
        if (incident.reportDate < start || incident.reportDate > end) {
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
  }, [rawData, filters]);

  // Memoized aggregated data for different chart types
  const chartData = useMemo(() => {
    // Count total incidents
    const total = filteredData.length;

    // Time distribution data
    const timeDistribution = ['DAY', 'EVENING', 'MIDNIGHT'].map(shift => ({
      shift,
      count: filteredData.filter(d => d.shift === shift).length,
      total
    }));

    // Crime type distribution data
    const crimeTypeCounts = filteredData.reduce((acc, incident) => {
      acc[incident.offense] = (acc[incident.offense] || 0) + 1;
      return acc;
    }, {});

    const crimeTypes = Object.entries(crimeTypeCounts)
      .map(([type, count]) => ({ type, count, total }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Heat map data - now including block information
    const heatMapData = filteredData.map(incident => ({
      lat: incident.latitude,
      lng: incident.longitude,
      offense: incident.offense,
      reportDate: incident.reportDate,
      shift: incident.shift,
      block: incident.block,
      neighborhood: incident.neighborhood,
      weight: 1
    }));

    // Temporal trends data
    const dailyCounts = filteredData.reduce((acc, incident) => {
      if (incident.reportDate) {
        const dateKey = format(incident.reportDate, 'yyyy-MM-dd');
        acc[dateKey] = (acc[dateKey] || 0) + 1;
      }
      return acc;
    }, {});

    // Get all days in 2024
    const year2024 = new Date(2024, 0, 1);
    const interval = {
      start: startOfYear(year2024),
      end: endOfYear(year2024)
    };

    // Create array of all days with their crime counts
    const temporalTrends = eachDayOfInterval(interval)
      .map(date => {
        const dateKey = format(date, 'yyyy-MM-dd');
        return {
          date,
          count: dailyCounts[dateKey] || 0
        };
      });

    return {
      timeDistribution,
      crimeTypes,
      heatMapData,
      temporalTrends,
      total
    };
  }, [filteredData]);

  return chartData;
};

export default useChartData; 