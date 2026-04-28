import React, { useState, useEffect } from 'react';
import { TrendingUp, FolderKanban, Award, BarChart2 } from 'lucide-react';

const TrendAnalysis = ({ API_BASE_URL }) => {
  const [trendData, setTrendData] = useState(null);
  const [isTrendsLoading, setIsTrendsLoading] = useState(false);
  const [selectedTrendYear, setSelectedTrendYear] = useState('All'); 
  
  const [expandedCategories, setExpandedCategories] = useState({});
  const DISPLAY_LIMIT = 5; 

  useEffect(() => {
    const fetchTrends = async () => {
      setIsTrendsLoading(true);
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${API_BASE_URL}/projects/trends`, { headers: { 'Authorization': `Bearer ${token}` }});
        if (res.ok) setTrendData(await res.json());
      } catch (err) {
        console.error("Failed to fetch trends", err);
      } finally {
        setIsTrendsLoading(false);
      }
    };
    fetchTrends();
  }, [API_BASE_URL]);

  const activeCategories = trendData 
    ? (selectedTrendYear === 'All' 
        ? trendData.overall_categories 
        : trendData.yearly_trends.find(y => String(y.year) === String(selectedTrendYear))?.categories || {})
    : {};

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const renderCategoryBlock = (categoryName) => {
    const techs = activeCategories[categoryName] || [];
    const maxCount = techs.length > 0 ? Math.max(...techs.map(t => t.count)) : 1;
    const isExpanded = expandedCategories[categoryName];
    const visibleTechs = isExpanded ? techs : techs.slice(0, DISPLAY_LIMIT);
    const hasMore = techs.length > DISPLAY_LIMIT;

    return (
      <div key={categoryName} className="flex flex-col">
        <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
          {categoryName}
        </h4>
        <div className="space-y-4">
          {techs.length === 0 ? (
            <div className="text-sm font-medium text-gray-400 dark:text-gray-500 italic bg-gray-50 dark:bg-gray-800/50 py-3 px-4 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 text-center">
              No technologies tracked yet
            </div>
          ) : (
            <>
              {visibleTechs.map(t => (
                <div key={t.name} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200 w-24 sm:w-28 truncate" title={t.name}>
                    {t.name}
                  </span>
                  
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-indigo-500 dark:bg-indigo-400 h-2 rounded-full transition-all duration-1000 ease-out" 
                      style={{ width: `${(t.count / maxCount) * 100}%` }}
                    ></div>
                  </div>
                  
                  <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 w-20 text-right whitespace-nowrap">
                    {t.count} projects
                  </span>
                </div>
              ))}
              
              {hasMore && (
                <button 
                  onClick={() => toggleCategory(categoryName)}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors w-fit pt-2"
                >
                  {isExpanded ? 'View Less' : `View ${techs.length - DISPLAY_LIMIT} More...`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  if (isTrendsLoading || !trendData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
         <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 dark:border-indigo-400 border-t-transparent mb-4"></div>
         <p className="text-gray-500 dark:text-gray-400 font-medium">Analyzing historical project data...</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col space-y-6 pb-8 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg"><TrendingUp className="w-6 h-6" /></div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tech Stack Insights</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Analyze the popularity of technologies used in projects</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex items-center gap-4 transition-colors">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl"><FolderKanban className="w-8 h-8" /></div>
          <div>
            <p className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Total Projects</p>
            <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{trendData.total_projects}</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex items-center gap-4 sm:col-span-2 transition-colors">
          <div className="p-4 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl"><Award className="w-8 h-8" /></div>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Most Used Technologies Overall</p>
            <div className="flex flex-wrap gap-2">
              {trendData.top_overall.map((t, idx) => (
                <span key={idx} className="bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-2">
                  {t.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
        <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-wrap gap-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Category Breakdown
          </h3>
          <div className="flex items-center gap-2">
             <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Year:</span>
             <select 
               value={selectedTrendYear}
               onChange={e => {
                 setSelectedTrendYear(e.target.value);
                 setExpandedCategories({}); 
               }}
               className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 text-sm rounded-md focus:ring-indigo-500 focus:border-indigo-500 block p-1.5 outline-none font-bold min-w-[100px] shadow-sm transition-colors"
             >
               <option value="All">All Time</option>
               {trendData.yearly_trends.map(y => (
                 <option key={y.year} value={y.year}>{y.year}</option>
               ))}
             </select>
          </div>
        </div>
        
        <div className="p-6 flex flex-col gap-10">
          {Object.keys(activeCategories).length === 0 ? (
             <div className="p-8 text-center text-gray-500 dark:text-gray-400">No technology stack data available for this selection.</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {['Frontend', 'Backend', 'Database'].map(cat => renderCategoryBlock(cat))}
              </div>
              <hr className="border-gray-100 dark:border-gray-700" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {['Mobile App', 'Cloud & DevOps', 'AI Models'].map(cat => renderCategoryBlock(cat))}
              </div>
              <hr className="border-gray-100 dark:border-gray-700" />
              <div className="grid grid-cols-1 gap-8">
                {['Other / Miscellaneous'].map(cat => renderCategoryBlock(cat))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrendAnalysis;