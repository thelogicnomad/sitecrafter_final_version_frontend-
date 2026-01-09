import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  message: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message }) => {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showRetryButton, setShowRetryButton] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeElapsed((prev) => {
        const newTime = prev + 1;
        if (newTime >= 45) { // Show retry button after 45 seconds
          setShowRetryButton(true);
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getLoadingMessage = () => {
    if (timeElapsed < 10) {
      return "Initializing server...";
    } else if (timeElapsed < 20) {
      return "Server is warming up...";
    } else if (timeElapsed < 30) {
      return "Almost there...";
    } else {
      return "Taking longer than usual...";
    }
  };

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl flex flex-col items-center space-y-4 max-w-sm mx-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">{message}</h3>
        <div className="space-y-2 text-center">
          <p className="text-gray-600">{getLoadingMessage()}</p>
          <p className="text-sm text-gray-500">
            First-time requests may take up to a minute while our server warms up.
            This only happens once.
          </p>
          {timeElapsed >= 5 && (
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-3">
              <div 
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((timeElapsed / 50) * 100, 100)}%` }}
              />
            </div>
          )}
          {showRetryButton && (
            <button
              onClick={handleRetry}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              Retry Connection
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;