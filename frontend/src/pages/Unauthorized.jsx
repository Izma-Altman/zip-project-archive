import React from 'react';
import { ShieldAlert } from 'lucide-react';

const Unauthorized = ({ onNavigateLogin }) => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-red-50 dark:bg-gray-900 p-4 transition-colors duration-300">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl text-center max-w-md w-full border border-red-100 dark:border-gray-700 transition-colors duration-300">
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full transition-colors duration-300">
            <ShieldAlert className="w-12 h-12 text-red-600 dark:text-red-500" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 transition-colors duration-300">Access Denied</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8 transition-colors duration-300">
          Your email domain is not authorized to access this portal. Please sign in with your institutional email (@mbcet.ac.in).
        </p>

        <button
          onClick={onNavigateLogin}
          className="w-full bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-sm"
        >
          Return to Login
        </button>
      </div>
    </div>
  );
};

export default Unauthorized;