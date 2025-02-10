import React from 'react';
import Dashboard from './components/Dashboard';
import { CrimeDataProvider } from './utils/CrimeDataContext';
import './styles/main.css';

const App = () => {
  return (
    <CrimeDataProvider>
      <div className="min-h-screen bg-gray-100">
        <Dashboard />
      </div>
    </CrimeDataProvider>
  );
};

export default App; 