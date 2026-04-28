import React from 'react';

const Loading = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-50 z-50">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
        {/* Text */}
        <p className="text-gray-500 font-medium animate-pulse">Loading...</p>
      </div>
    </div>
  );
};

export default Loading;