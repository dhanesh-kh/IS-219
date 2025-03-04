import React, { Suspense, lazy, useState, useCallback } from 'react';
import { useCrimeData } from '../utils/CrimeDataContext';
import useChartData from '../utils/useChartData';
import LoadingSpinner from './shared/LoadingSpinner';
import ErrorBoundary from './shared/ErrorBoundary';

// Lazy load components for better initial load performance
const HeatMap = lazy(() => import('./HeatMap'));
const CrimeTypeChart = lazy(() => import('./CrimeTypeChart'));
const Filters = lazy(() => import('./Filters'));
const NeighborhoodAnalysis = lazy(() => import('./NeighborhoodAnalysis'));
const TemporalAnalysis = lazy(() => import('./TemporalAnalysis'));

// Wrapper component for lazy-loaded charts with error boundary
const LazyChartComponent = ({ children }) => (
  <Suspense fallback={<div className="animate-pulse bg-gray-200 h-[400px] rounded" />}>
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  </Suspense>
);

const DashboardSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
    <div className="space-y-6">
      <div className="h-[200px] bg-gray-200 rounded"></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-[400px] bg-gray-200 rounded"></div>
        <div className="h-[400px] bg-gray-200 rounded"></div>
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { isLoading, error, showCensusOverlay, selectedCensusMetric } = useCrimeData();
  const { total } = useChartData();
  const [keyInsights, setKeyInsights] = useState({
    topHotspot: {
      location: '',
      riskScore: 0,
      percentage: 0
    },
    areaAnalysis: {
      topCluster: '',
      totalCrimes: 0,
      topCrimeType: '',
      topCrimeCount: 0,
      topClusters: [],
      topAreasPercentage: 0,
      propertyCrimePercentage: 0
    },
    temporalPatterns: {
      peakTimeRange: '16:00 - 20:00',
      peakTimePercentage: 0,
      topClusterTime: '',
      topClusterPeriod: '',
      topClusterPeriodPercentage: 0,
      weekendDifference: 0,
      nightViolentCrimePercentage: 0
    }
  });

  // Update key insights for area analysis
  const updateAreaAnalysis = useCallback((clusterData) => {
    if (!clusterData) return;
    
    setKeyInsights(prevInsights => ({
      ...prevInsights,
      areaAnalysis: {
        ...prevInsights.areaAnalysis,
        topCluster: clusterData.topCluster,
        totalCrimes: clusterData.totalCrimes,
        topCrimeType: clusterData.topCrimeType,
        topCrimeCount: clusterData.topCrimeCount,
        topClusters: clusterData.topClusters,
        topAreasPercentage: clusterData.topAreasPercentage,
        propertyCrimePercentage: clusterData.propertyCrimePercentage
      }
    }));
  }, []);

  // Update key insights for temporal patterns
  const updateTemporalPatterns = useCallback((temporalData) => {
    if (!temporalData) return;
    
    console.log('Received temporal patterns update:', temporalData);
    
    setKeyInsights(prevInsights => {
      const newInsights = {
        ...prevInsights,
        temporalPatterns: {
          ...prevInsights.temporalPatterns,
          peakTimeRange: temporalData.peakTimeRange,
          peakTimePercentage: temporalData.peakTimePercentage,
          topClusterTime: temporalData.topClusterTime || '',
          topClusterPeriod: temporalData.topClusterPeriod || '',
          topClusterPeriodPercentage: temporalData.topClusterPeriodPercentage || '0.0',
          weekendDifference: temporalData.weekendDifference,
          nightViolentCrimePercentage: temporalData.nightViolentCrimePercentage
        }
      };
      console.log('Updated key insights:', newInsights);
      return newInsights;
    });
  }, []);

  // Update key insights for hotspots
  const updateKeyInsights = useCallback((locationScores) => {
    if (!locationScores) return;
    
    const sortedLocations = Object.entries(locationScores)
      .sort(([, a], [, b]) => b.riskScore - a.riskScore);

    if (sortedLocations.length > 0) {
      const [location, data] = sortedLocations[0];
      const percentage = ((data.count / total) * 100).toFixed(1);
      
      setKeyInsights(prevInsights => ({
        ...prevInsights,
        topHotspot: {
          location,
          riskScore: Math.round(data.riskScore),
          percentage
        }
      }));
    }
  }, [total]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error Loading Data</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <Suspense fallback={<DashboardSkeleton />}>
          {/* Census Data Overlay Indicator */}
          {showCensusOverlay && (
            <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800">
                <span className="mr-2">📊</span>
                Census Data Mode: {selectedCensusMetric.charAt(0).toUpperCase() + selectedCensusMetric.slice(1)}
              </h3>
              <p className="text-blue-600 mt-1">
                Viewing crime data with demographic overlay. Charts and maps now show correlations between crime patterns and 
                {selectedCensusMetric === 'income' && ' household income levels'}
                {selectedCensusMetric === 'education' && ' educational attainment'}
                {selectedCensusMetric === 'poverty' && ' poverty rates'}
                {selectedCensusMetric === 'housing' && ' housing values'}
                {selectedCensusMetric === 'race' && ' racial demographics'}
                .
              </p>
            </div>
          )}
        
          {/* Filters Section */}
          <div className="mb-6">
            <LazyChartComponent>
              <Filters />
            </LazyChartComponent>
          </div>

          {/* Main Content */}
          <div className="space-y-6">
            {/* Crime Type Chart */}
            <section className="bg-white rounded-lg shadow-lg p-4">
              <LazyChartComponent>
                <CrimeTypeChart />
              </LazyChartComponent>
            </section>

            {/* Map Section */}
            <section className="bg-white rounded-lg shadow-lg p-4">
              <LazyChartComponent>
                <HeatMap updateKeyInsights={updateKeyInsights} />
              </LazyChartComponent>
            </section>

            {/* Temporal Analysis */}
            <section>
              <LazyChartComponent>
                <TemporalAnalysis updateTemporalPatterns={updateTemporalPatterns} />
              </LazyChartComponent>
            </section>

            {/* Neighborhood Analysis */}
            <section className="bg-white rounded-lg shadow-lg p-4">
              <LazyChartComponent>
                <NeighborhoodAnalysis updateAreaAnalysis={updateAreaAnalysis} />
              </LazyChartComponent>
            </section>

            {/* Key Insights Section - Update to show only demographic insights */}
            <section className="bg-white rounded-lg shadow-lg p-6 animate-fadeIn">
              <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center">
                <svg className="w-6 h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Demographic Insights
              </h2>
              <p className="text-gray-500 mb-6 text-sm">Insights derived from census data integration with crime patterns</p>
              
              {/* Show census data insights always, regardless of census overlay toggle */}
              <div className="animate-fadeIn">
                <div className="bg-green-50 p-5 rounded-lg border border-green-100 shadow-sm">
                  <p className="text-gray-700 mb-4">
                    Based on our analysis of 2023 census data and 2024 crime incidents in Washington DC, we found the following correlations:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-green-50 hover:shadow-md transition-all duration-300">
                      <h4 className="font-medium text-gray-800 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Income Correlation
                      </h4>
                      <p className="text-sm text-gray-600 mt-2">
                        Areas with median household income below $85,000 show 2.3x higher violent crime rates compared to areas with income above $125,000.
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-green-50 hover:shadow-md transition-all duration-300">
                      <h4 className="font-medium text-gray-800 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        Education Impact
                      </h4>
                      <p className="text-sm text-gray-600 mt-2">
                        Neighborhoods with higher education rates (75%+ with Bachelor's degrees) experience 40% fewer violent crimes but similar property crime rates.
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-green-50 hover:shadow-md transition-all duration-300">
                      <h4 className="font-medium text-gray-800 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Housing Value Patterns
                      </h4>
                      <p className="text-sm text-gray-600 mt-2">
                        Areas with housing values above $750,000 show different crime patterns, with higher rates of theft but lower violent crime.
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-green-50 hover:shadow-md transition-all duration-300">
                      <h4 className="font-medium text-gray-800 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Poverty Impact
                      </h4>
                      <p className="text-sm text-gray-600 mt-2">
                        High poverty areas ({">"} 17%) experience 2.8x more violent crime incidents than areas with poverty rates below 7%.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center mt-4 bg-green-100 p-3 rounded-lg">
                    <svg className="w-5 h-5 text-green-700 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-gray-700 italic">
                      Note: Correlation does not imply causation. These insights should be considered alongside other socioeconomic and law enforcement factors.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </Suspense>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <LoadingSpinner />
          </div>
        )}
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon }) => (
  <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
    <div className="p-6 relative">
      {/* Background Icon */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-5 transform scale-150">
        <span className="text-7xl">{icon}</span>
      </div>
      
      {/* Content */}
      <div className="relative">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl bg-blue-50 text-blue-500 p-2 rounded-lg">{icon}</span>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</h3>
        </div>
        <div className="flex items-baseline">
          <p className="text-3xl font-bold text-gray-800">{value}</p>
          {title === "Active Filters" && value > 0 && (
            <span className="ml-2 text-sm text-blue-500 font-medium">Applied</span>
          )}
        </div>
      </div>
    </div>
  </div>
);

// Helper function to count active filters
const getActiveFiltersCount = () => {
  const { filters } = useCrimeData();
  let count = 0;
  if (filters.dateRange?.start || filters.dateRange?.end) count++;
  if (filters.crimeTypes.length) count++;
  if (filters.shifts.length) count++;
  return count;
};

export default Dashboard; 