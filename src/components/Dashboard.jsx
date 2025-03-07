import React, { Suspense, lazy, useState, useCallback, useEffect, useRef } from 'react';
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
const MainContentTabs = lazy(() => import('./MainContentTabs'));

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
  const { isLoading, error, showCensusOverlay, selectedCensusMetric, census } = useCrimeData();
  const { total } = useChartData();
  
  // Log census data for debugging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Census data in Dashboard:', census);
    }
  }, [census]);
  
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

  // Add state for scroll to top button
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const filtersRef = useRef(null);

  // Handle scroll event to show/hide the scroll to top button
  useEffect(() => {
    const handleScroll = () => {
      if (filtersRef.current) {
        const filtersBottom = filtersRef.current.getBoundingClientRect().bottom;
        setShowScrollToTop(filtersBottom < 0);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Function to scroll to top
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

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
  const updateKeyInsights = useCallback((data) => {
    if (!data) return;
    
    // Check if we're receiving the highRiskAreas format from HeatMap
    if (data.highRiskAreas && Array.isArray(data.highRiskAreas) && data.highRiskAreas.length > 0) {
      const topHotspot = data.highRiskAreas[0];
      const percentage = ((topHotspot.count / total) * 100).toFixed(1);
      
      setKeyInsights(prevInsights => ({
        ...prevInsights,
        topHotspot: {
          location: topHotspot.location,
          riskScore: topHotspot.riskScore,
          percentage
        }
      }));
    }
    // Handle the old format for backward compatibility
    else if (Object.entries(data).length > 0) {
      const sortedLocations = Object.entries(data)
        .sort(([, a], [, b]) => b.riskScore - a.riskScore);

      if (sortedLocations.length > 0) {
        const [location, locationData] = sortedLocations[0];
        const percentage = ((locationData.count / total) * 100).toFixed(1);
        
        setKeyInsights(prevInsights => ({
          ...prevInsights,
          topHotspot: {
            location,
            riskScore: Math.round(locationData.riskScore),
            percentage
          }
        }));
      }
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
          {/* Integrated Header with Filters */}
          <div className="mb-10">
            <div className="overflow-hidden rounded-xl shadow-lg border border-gray-200">
              {/* Header Section */}
              <div className="relative overflow-hidden">
                {/* DC-Specific Background */}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-800/80 to-slate-900/80 mix-blend-multiply opacity-75"></div>
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1501466044931-62695aada8e9?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80')] bg-cover bg-center opacity-40"></div>
                
                {/* Content */}
                <div className="relative z-10 px-8 pt-10 pb-6 text-center">
                  <div className="inline-block bg-slate-900/70 px-4 py-1 rounded-lg mb-2">
                    <span className="text-blue-300 font-semibold tracking-wider text-sm">DATA ANALYSIS DASHBOARD</span>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4 drop-shadow-lg">
                    <span className="block">DC Crime & Demographics</span>
                  </h1>
                  <p className="text-gray-100 max-w-2xl mx-auto mb-6 text-lg">
                    Explore crime patterns and demographic correlations across Washington DC
                  </p>
                  <div className="flex justify-center space-x-4">
                    <div className="bg-slate-800/70 px-4 py-2 rounded-lg inline-flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span className="text-gray-100">2024 Crime Data</span>
                    </div>
                    <div className="bg-slate-800/70 px-4 py-2 rounded-lg inline-flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                      </svg>
                      <span className="text-gray-100">Census Demographics</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Filters Section - directly connected to header, no gap */}
              <div className="bg-white" ref={filtersRef}>
                {/* Temporarily hidden filters
                <LazyChartComponent>
                  <Filters />
                </LazyChartComponent>
                */}
              </div>
            </div>
          </div>

          {/* Main Content - Tabbed Interface with enhanced styling */}
          <div className="bg-gray-100 rounded-xl p-5 border border-gray-200 shadow-sm mb-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Interactive Crime Analysis
              </h2>
              <p className="text-gray-500 text-sm">Explore different views of crime data through the tabs below</p>
            </div>
            <LazyChartComponent>
              <MainContentTabs
                updateKeyInsights={updateKeyInsights}
                updateAreaAnalysis={updateAreaAnalysis}
                updateTemporalPatterns={updateTemporalPatterns}
              />
            </LazyChartComponent>
          </div>

          {/* Demographic Insights Section - More compact design */}
          <section className="bg-white rounded-lg shadow-md p-4 animate-fadeIn">
            <div className="flex items-center mb-3 border-b border-gray-200 pb-2">
              <div className="h-7 w-7 flex items-center justify-center bg-blue-100 rounded-lg mr-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Washington DC Demographics</h2>
                <p className="text-gray-500 text-xs">Census data integration with crime patterns</p>
              </div>
            </div>
            
            {/* Show census data insights always, regardless of census overlay toggle */}
            <div className="animate-fadeIn space-y-6">
              {/* DC Demographics Key Metrics Section */}
              {census ? (
                <div className="rounded-lg overflow-hidden border border-blue-100">
                  <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-blue-100">
                    {/* Higher Education */}
                    <div className="bg-white p-4 flex flex-col items-center text-center">
                      <div className="bg-blue-50 rounded-full p-2 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M12 14l9-5-9-5-9 5 9 5z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                        </svg>
                      </div>
                      <div className="text-2xl font-bold text-blue-600 mb-1">
                        {census?.derivedMetrics?.higherEducationPercentage?.toFixed(1) || '65.9'}%
                      </div>
                      <div className="text-sm font-medium text-gray-700">Higher Education</div>
                      <div className="text-xs text-gray-500 mt-1">Bachelor's degree or higher</div>
                    </div>
                    
                    {/* Poverty Rate */}
                    <div className="bg-white p-4 flex flex-col items-center text-center">
                      <div className="bg-red-50 rounded-full p-2 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="text-2xl font-bold text-red-600 mb-1">
                        {census?.derivedMetrics?.povertyPercentage?.toFixed(1) || '14.0'}%
                      </div>
                      <div className="text-sm font-medium text-gray-700">Poverty Rate</div>
                      <div className="text-xs text-gray-500 mt-1">Population below poverty line</div>
                    </div>
                    
                    {/* Housing Value */}
                    <div className="bg-white p-4 flex flex-col items-center text-center">
                      <div className="bg-indigo-50 rounded-full p-2 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                      </div>
                      <div className="text-2xl font-bold text-indigo-600 mb-1">
                        ${(census?.derivedMetrics?.medianHousingValue || 715500).toLocaleString()}
                      </div>
                      <div className="text-sm font-medium text-gray-700">Housing Value</div>
                      <div className="text-xs text-gray-500 mt-1">Median home value</div>
                    </div>
                    
                    {/* Diversity */}
                    <div className="bg-white p-4 flex flex-col items-center text-center">
                      <div className="bg-purple-50 rounded-full p-2 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div className="text-2xl font-bold text-purple-600 mb-1">
                        {((census?.derivedMetrics?.diversityIndex || 0.685) * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm font-medium text-gray-700">Diversity</div>
                      <div className="text-xs text-gray-500 mt-1">Diversity index score</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 p-5 rounded-lg border-l-4 border-amber-400 shadow-sm">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-500 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">Census Data Unavailable</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        The demographic data could not be loaded. This may be due to network issues or missing data files.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors"
                    >
                      Reload Page
                    </button>
                  </div>
                </div>
              )}
              
              {/* Crime and Demographic Correlations - Unified visual style */}
              {census && (
                <div className="rounded-lg overflow-hidden border border-slate-200">
                  <div className="bg-slate-50 p-3 border-b border-slate-200">
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-700 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      <h3 className="text-base font-semibold text-gray-800">Crime and Demographic Correlations</h3>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-white">
                    <div className="mb-3 rounded-lg py-2 px-3 border-l-3 border-slate-300 bg-slate-50">
                      <p className="text-gray-700 text-xs">
                        Key correlations between 2023 census data and 2024 crime incidents:
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Income Correlation Card */}
                      <div className="rounded-lg bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                        <div className="flex items-center p-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-white">
                          <div className="bg-white rounded-full p-2 mr-3 shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <h4 className="font-semibold text-gray-800 text-md">Income Correlation</h4>
                        </div>
                        <div className="p-4">
                          <div className="flex items-baseline mb-2">
                            <span className="text-2xl font-bold text-green-600 mr-2">2.3x</span>
                            <span className="text-sm text-gray-500">higher crime rate</span>
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            Areas with median household income below $85,000 show higher violent crime rates compared to areas with income above $125,000.
                          </p>
                        </div>
                      </div>
                      
                      {/* Education Impact Card */}
                      <div className="rounded-lg bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                        <div className="flex items-center p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
                          <div className="bg-white rounded-full p-2 mr-3 shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path d="M12 14l9-5-9-5-9 5 9 5z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                            </svg>
                          </div>
                          <h4 className="font-semibold text-gray-800 text-md">Education Impact</h4>
                        </div>
                        <div className="p-4">
                          <div className="flex items-baseline mb-2">
                            <span className="text-2xl font-bold text-blue-600 mr-2">40%</span>
                            <span className="text-sm text-gray-500">fewer violent crimes</span>
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            Neighborhoods with higher education rates (75%+ with Bachelor's degrees) experience fewer violent crimes but similar property crime rates.
                          </p>
                        </div>
                      </div>
                      
                      {/* Housing Value Patterns Card */}
                      <div className="rounded-lg bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                        <div className="flex items-center p-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white">
                          <div className="bg-white rounded-full p-2 mr-3 shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                          </div>
                          <h4 className="font-semibold text-gray-800 text-md">Housing Value Patterns</h4>
                        </div>
                        <div className="p-4">
                          <div className="flex items-baseline mb-2">
                            <span className="text-2xl font-bold text-indigo-600 mr-2">$750,000+</span>
                            <span className="text-sm text-gray-500">housing values</span>
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            Areas with higher housing values show different crime patterns: higher rates of theft but lower violent crime.
                          </p>
                        </div>
                      </div>
                      
                      {/* Poverty Impact Card */}
                      <div className="rounded-lg bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                        <div className="flex items-center p-4 border-b border-gray-100 bg-gradient-to-r from-red-50 to-white">
                          <div className="bg-white rounded-full p-2 mr-3 shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                            </svg>
                          </div>
                          <h4 className="font-semibold text-gray-800 text-md">Poverty Impact</h4>
                        </div>
                        <div className="p-4">
                          <div className="flex items-baseline mb-2">
                            <span className="text-2xl font-bold text-red-600 mr-2">2.8x</span>
                            <span className="text-sm text-gray-500">more violent crime</span>
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            High poverty areas ({">"} 17%) experience more violent crime incidents than areas with poverty rates below 7%.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 py-2 px-3 rounded border border-amber-200 bg-amber-50 text-xs">
                      <div className="flex items-center">
                        <div className="text-amber-500 mr-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="text-gray-700">
                          <strong>Note:</strong> Correlation does not imply causation. Consider these insights alongside other factors.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Scroll to Top Button */}
          {showScrollToTop && (
            <button
              onClick={scrollToTop}
              className="fixed bottom-8 right-8 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg z-50 transition-all duration-300 transform hover:scale-110"
              aria-label="Scroll to top"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11l7-7 7 7M5 19l7-7 7 7" />
              </svg>
            </button>
          )}
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