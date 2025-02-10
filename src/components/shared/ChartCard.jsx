import React, { useEffect, useRef, useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

const ChartCard = ({ 
  title, 
  children, 
  isLoading, 
  error,
  className = '',
  height = 'h-[400px]'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Stop observing once visible
        }
      },
      {
        root: null,
        rootMargin: '50px', // Start loading slightly before it enters viewport
        threshold: 0.1
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div 
      ref={cardRef}
      className={`bg-white rounded-lg shadow-lg p-4 ${className}`}
    >
      <h2 className="text-xl font-semibold mb-4 text-gray-800">{title}</h2>
      
      {error && (
        <div className="flex items-center justify-center h-full text-red-500">
          <p>{error}</p>
        </div>
      )}
      
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className={height}>
          {isVisible ? children : <div className="animate-pulse bg-gray-200 h-full rounded" />}
        </div>
      )}
    </div>
  );
};

export default ChartCard; 