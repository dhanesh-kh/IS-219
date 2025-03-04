import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Component Error:', error);
    console.error('Error Stack:', errorInfo.componentStack);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="p-6 bg-white rounded-lg shadow-md">
          <div className="text-center mb-4">
            <div className="text-red-500 text-xl font-bold mb-2">Something went wrong</div>
            <div className="text-sm text-gray-600 mb-4">{this.state.error?.message || 'An error occurred'}</div>
            <button 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 p-3 bg-gray-50 rounded text-xs">
              <summary className="text-sm text-gray-700 cursor-pointer font-medium">View Error Details</summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                {this.state.error?.toString()}
              </pre>
              <div className="mt-2 text-xs text-gray-500">
                Component Stack:
                <pre className="p-2 mt-1 bg-gray-100 rounded overflow-auto">
                  {this.state.errorInfo?.componentStack}
                </pre>
              </div>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 