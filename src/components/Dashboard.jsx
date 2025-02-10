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
  const { isLoading, error } = useCrimeData();
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

  // Update the display text to handle empty values gracefully
  const getTemporalPatternsText = () => {
    const { topClusterTime, topClusterPeriod, topClusterPeriodPercentage } = keyInsights.temporalPatterns;
    
    if (!topClusterTime || !topClusterPeriod) {
      return 'Different neighborhoods show varying peak times';
    }
    
    return (
      <span>
        Different neighborhoods show varying peak times, with{' '}
        <span className="font-medium text-purple-700">{topClusterTime}</span>{' '}
        experiencing most incidents during{' '}
        <span className="font-medium text-purple-700">{topClusterPeriod}</span>{' '}
        hours (<span className="font-semibold text-purple-900">{topClusterPeriodPercentage}%</span>{' '}
        of its incidents)
      </span>
    );
  };

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
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">DC Crime Data Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Interactive visualization of crime incidents in Washington DC (2024)
          </p>
        </header>

        <Suspense fallback={<DashboardSkeleton />}>
          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard
              title="Total Incidents"
              value={isLoading ? '-' : total}
              icon="📊"
            />
            <StatCard
              title="Active Filters"
              value={getActiveFiltersCount()}
              icon="🔍"
            />
            <StatCard
              title="Time Range"
              value="2024"
              icon="📅"
            />
          </div>

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

            {/* Key Insights Section */}
            <section className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Key Insights</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Area and Crime Type Insights */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">
                    <span className="inline-block mr-2">📍</span>
                    Area & Crime Analysis
                  </h3>
                  <div className="space-y-3">
                    <p className="text-gray-800">
                      <span className="font-medium text-blue-800">{keyInsights.areaAnalysis.topCluster}</span> recorded the highest number of incidents with{' '}
                      <span className="font-semibold text-blue-900">{keyInsights.areaAnalysis.totalCrimes.toLocaleString()}</span> total crimes
                    </p>
                    <p className="text-gray-800">
                      <span className="font-medium text-blue-800">{keyInsights.areaAnalysis.topCrimeType}</span> is the most frequent crime type with{' '}
                      <span className="font-semibold text-blue-900">{keyInsights.areaAnalysis.topCrimeCount.toLocaleString()}</span> incidents in the highest crime area
                    </p>
                    <p className="text-gray-800">
                      The top 5 neighborhoods account for <span className="font-semibold text-blue-900">{keyInsights.areaAnalysis.topAreasPercentage}%</span> of all reported incidents
                    </p>
                    <p className="text-gray-800">
                      Property crimes make up <span className="font-semibold text-blue-900">{keyInsights.areaAnalysis.propertyCrimePercentage}%</span> of all incidents
                    </p>
                  </div>
                </div>

                {/* Temporal Patterns */}
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                  <h3 className="text-lg font-semibold text-purple-900 mb-2">
                    <span className="inline-block mr-2">⏰</span>
                    Temporal Patterns
                  </h3>
                  <div className="space-y-3">
                    <p className="text-gray-800">
                      Peak crime activity occurs between <span className="font-medium text-purple-800">{keyInsights.temporalPatterns.peakTimeRange}</span>, accounting for{' '}
                      <span className="font-semibold text-purple-900">{keyInsights.temporalPatterns.peakTimePercentage}%</span> of all incidents
                    </p>
                    <p className="text-gray-800">
                      {getTemporalPatternsText()}
                    </p>
                    <p className="text-gray-800">
                      Weekend crime rates are <span className="font-semibold text-purple-900">{keyInsights.temporalPatterns.weekendDifference}%</span> lower than weekday averages
                    </p>
                    <p className="text-gray-800">
                      Most violent crimes (<span className="font-semibold text-purple-900">{keyInsights.temporalPatterns.nightViolentCrimePercentage}%</span>) occur during nighttime hours
                    </p>
                  </div>
                </div>

                {/* Geographic Patterns */}
                <div className="bg-green-50 rounded-lg p-4 border border-green-100 md:col-span-2">
                  <h3 className="text-lg font-semibold text-green-900 mb-2">
                    <span className="inline-block mr-2">📍</span>
                    Geographic Patterns
                  </h3>
                  <div className="space-y-3">
                    <p className="text-gray-800">
                      Top hotspot <span className="font-medium text-green-800">{keyInsights.topHotspot.location}</span> accounts for{' '}
                      <span className="font-semibold text-green-900">{keyInsights.topHotspot.percentage}%</span> of all reported incidents, with a risk score of{' '}
                      <span className="font-semibold text-green-900">{keyInsights.topHotspot.riskScore}</span>
                    </p>
                    <p className="text-gray-800">
                      High-risk areas show geographic clustering, particularly in{' '}
                      <span className="font-medium text-green-800">
                        {keyInsights.areaAnalysis.topClusters?.slice(0, 3).join(', ') || 'major clusters'}
                      </span>
                    </p>
                    <p className="text-gray-800">
                      Homicide incidents are concentrated in specific neighborhoods, showing clear geographic patterns
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