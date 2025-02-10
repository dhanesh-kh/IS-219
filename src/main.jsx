import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { CrimeDataProvider } from './utils/CrimeDataContext';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/main.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <CrimeDataProvider>
        <App />
      </CrimeDataProvider>
    </ErrorBoundary>
  </React.StrictMode>
); 