import React, { useState, useEffect } from 'react';
import { LogOut, CheckCircle, AlertCircle, Menu, Home, TrendingUp, BookOpen, Users, FolderKanban, FileText } from 'lucide-react';
import ProjectSearch from './ProjectSearch';
import TrendAnalysis from './TrendAnalysis';
import MyProjects from './MyProjects';
import ManageFaculty from './ManageFaculty';
import ProjectUpload from './ProjectUpload';
import SimilarityAudit from './SimilarityAudit';
import Logo from '../components/Logo';
import ThemeToggle from '../components/ThemeToggle';

const API_BASE_URL = 'http://localhost:5000';

const Dashboard = ({ onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('home'); 
  const [message, setMessage] = useState({ type: '', text: '' });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => { setMessage({ type: '', text: '' }); }, [activeTab]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) throw new Error("No token found");

        const userRes = await fetch(`${API_BASE_URL}/test/protected`, { headers: { 'Authorization': `Bearer ${token}` }});
        if (!userRes.ok) throw new Error("Auth failed");
        setUser(await userRes.json());
      } catch (error) {
        console.error("Dashboard Load Error:", error);
        onLogout();
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [onLogout]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 8000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 dark:border-indigo-400 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden relative transition-colors duration-300">
      
      {isProcessing && (
        <div className="absolute inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm z-[100] flex flex-col items-center justify-center transition-all duration-300">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center border border-indigo-50 dark:border-gray-700 transform scale-100 animate-fade-in-up">
            <div className="animate-spin rounded-full h-14 w-14 border-4 border-indigo-100 dark:border-gray-600 border-t-indigo-600 dark:border-t-indigo-400 mb-5"></div>
            <p className="text-xl font-extrabold text-gray-800 dark:text-white tracking-tight">Processing...</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center max-w-[250px] leading-relaxed">
              Please wait while the server processes the data. Do not close this page.
            </p>
          </div>
        </div>
      )}

      {message.text && (
        <div className={`fixed top-5 right-5 z-50 p-4 rounded-lg shadow-xl flex items-center gap-3 border transition-all duration-300 transform translate-y-0 opacity-100 ${message.type === 'error' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50' : message.type === 'info' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50' : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50'}`}>
          {message.type === 'error' ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <CheckCircle className="w-5 h-5 flex-shrink-0" />}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      <aside className={`${isSidebarOpen ? 'w-64' : 'w-0 hidden'} flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out flex flex-col z-20`}>
        <div className="h-16 flex items-center px-3 border-b border-gray-200 dark:border-gray-700">
          <Logo className="w-10 h-10" />
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            <button onClick={() => setActiveTab('home')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'home' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}><Home className="w-5 h-5" /> Search Projects</button>
            <button onClick={() => setActiveTab('trends')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'trends' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}><TrendingUp className="w-5 h-5" /> Trend Analysis</button>
            {user?.role === 'STUDENT' && <button onClick={() => setActiveTab('my-project')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'my-project' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}><BookOpen className="w-5 h-5" /> My Projects</button>}
            {user?.role === 'ADMIN' && <button onClick={() => setActiveTab('faculty')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'faculty' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}><Users className="w-5 h-5" /> Manage Faculty</button>}
            {(user?.role === 'ADMIN' || user?.role === 'FACULTY') && <button onClick={() => setActiveTab('project')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'project' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}><FolderKanban className="w-5 h-5" /> Manage Projects</button>}
            <button onClick={() => setActiveTab('similarity')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'similarity' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}><FileText className="w-5 h-5" /> Similarity Audit</button>
          </nav>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-sm">{user?.name ? user.name[0].toUpperCase() : user?.email?.[0].toUpperCase()}</div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 py-2 rounded-lg transition-colors"><LogOut className="w-4 h-4" /> Logout</button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 sm:px-6 z-10 flex-shrink-0 transition-colors duration-300">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"><Menu className="w-6 h-6" /></button>
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white hidden sm:block">
              {activeTab === 'home' && "Project Search"}
              {activeTab === 'trends' && "Technology Trend Analysis"}
              {activeTab === 'my-project' && "My Project Workspace"}
              {activeTab === 'faculty' && "Faculty Management"}
              {activeTab === 'project' && "Project Management"}
              {activeTab === 'similarity' && "AI Similarity Audit"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
             <ThemeToggle />
             <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-full border border-indigo-100 dark:border-indigo-800/50">{user?.role}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 relative bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
          <div className="max-w-6xl mx-auto w-full min-h-full flex flex-col">
            {activeTab === 'home' && <ProjectSearch user={user} showMessage={showMessage} API_BASE_URL={API_BASE_URL} setIsProcessing={setIsProcessing} />}
            {activeTab === 'trends' && <TrendAnalysis showMessage={showMessage} API_BASE_URL={API_BASE_URL} />}
            {activeTab === 'my-project' && <MyProjects user={user} showMessage={showMessage} API_BASE_URL={API_BASE_URL} setIsProcessing={setIsProcessing} />}
            {activeTab === 'faculty' && <ManageFaculty user={user} showMessage={showMessage} API_BASE_URL={API_BASE_URL} setIsProcessing={setIsProcessing} />}
            {activeTab === 'project' && <ProjectUpload user={user} showMessage={showMessage} API_BASE_URL={API_BASE_URL} setIsProcessing={setIsProcessing} />}
            {activeTab === 'similarity' && <SimilarityAudit user={user} showMessage={showMessage} API_BASE_URL={API_BASE_URL} setIsProcessing={setIsProcessing} />}
          </div>
        </main>

      </div>
    </div>
  );
};

export default Dashboard;