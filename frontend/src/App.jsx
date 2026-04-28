import React, { useState, useEffect } from 'react';
import Loading from './components/Loading';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Unauthorized from './pages/Unauthorized';

const API_BASE_URL = 'http://localhost:5000';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('access_token'));
  const [view, setView] = useState('loading'); // loading, login, dashboard, unauthorized

  useEffect(() => {
    const checkAuth = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');
      const urlError = urlParams.get('reason'); 
      const path = window.location.pathname;

      if ( urlError === 'unauthorized_domain' || path.includes('/oauth/error')) {
        setView('unauthorized');
        return;
      } 
      else if (urlToken) {
        localStorage.setItem('access_token', urlToken);
        setToken(urlToken);
        setView('dashboard');
        window.history.replaceState({}, document.title, '/');
      } 
      else if (token) {
        setView('dashboard');
      } 
      else {
        setView('login');
      }
    };

    checkAuth();
  }, [token]);

  const handleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/login`;
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setToken(null);
    setView('login');
  };

  switch (view) {
    case 'loading':
      return <Loading />;
    case 'login':
      return <Login onLogin={handleLogin} />;
    case 'dashboard':
      return <Dashboard onLogout={handleLogout} />;
    case 'unauthorized':
      return <Unauthorized onNavigateLogin={() => setView('login')} />;
    default:
      return <Login onLogin={handleLogin} />;
  }
}
