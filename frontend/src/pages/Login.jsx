import React from 'react';
import Logo from '../components/Logo';

const API_BASE_URL = 'https://project-archive.onrender.com'; 

const Login = () => {

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/login`;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4 transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-transparent dark:border-gray-700 transition-colors duration-300">
        <div className="px-10 pt-10 pb-6">
          
          <div className="mb-11">
            <div className="flex justify-between items-end w-full">
              <Logo className="w-32 h-32" />
              <h1 className="text-7xl font-bold text-indigo-800 dark:text-indigo-400 leading-none pb-2 transition-colors duration-300 select-none">
                .Zip
              </h1>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium py-3 px-4 rounded-lg transition-all duration-200 shadow-sm"
          >
            <img 
              src="https://www.google.com/favicon.ico" 
              alt="Google" 
              className="w-5 h-5" 
            />
            <span>Login with Google</span>
          </button>

          <p className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300">
            Please use your institutional email to sign in.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;