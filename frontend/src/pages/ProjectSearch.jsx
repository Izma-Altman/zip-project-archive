import React, { useState } from 'react';
import { Search, X, Filter, FolderKanban, CheckCircle, ChevronUp } from 'lucide-react';
import ProjectDetailView from './ProjectDetailView'; 

export const parseTechStack = (rawTech, flatTech) => {
  let parsed = null;
  try { parsed = JSON.parse(rawTech); } catch (e) {}

  const catColors = {
    Frontend: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800/50', label: 'Frontend' },
    Backend: { bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800/50', label: 'Backend' },
    Database: { bg: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800/50', label: 'Database' },
    MobileApp: { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800/50', label: 'Mobile App' },
    Cloud: { bg: 'bg-cyan-50 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800/50', label: 'Cloud' },
    AIModels: { bg: 'bg-rose-50 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800/50', label: 'AI Models' },
    Other: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700', label: 'Other' }
  };

  const techList = [];
  
  if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
    Object.entries(parsed).forEach(([cat, techsStr]) => {
      if (!techsStr || !techsStr.trim()) return;
      const items = techsStr.split(/[,;/|]/).map(t => t.trim()).filter(Boolean);
      items.forEach(item => {
        const style = catColors[cat] || catColors.Other;
        techList.push({ name: item, category: style.label, styleStr: `${style.bg} ${style.text} ${style.border}` });
      });
    });
    return techList;
  }

  if (!flatTech || flatTech === 'N/A') return [];
  const items = flatTech.split(/[,;/|]/).map(t => t.trim()).filter(Boolean);
  const lowerSet = new Set();
  items.forEach(t => {
    if (!lowerSet.has(t.toLowerCase())) {
      lowerSet.add(t.toLowerCase());
      techList.push({ name: t, category: 'Other', styleStr: `${catColors.Other.bg} ${catColors.Other.text} ${catColors.Other.border}` });
    }
  });
  return techList;
};

const ProjectSearch = ({ showMessage, API_BASE_URL, setIsProcessing }) => {
  const [globalSearch, setGlobalSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterTech, setFilterTech] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterSem, setFilterSem] = useState('');
  const [filterType, setFilterType] = useState('');
  
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null); 
  const [upvotedProjects, setUpvotedProjects] = useState({});

  const handleUpvote = async (e, projectId) => {
    e.stopPropagation(); 
    const isUpvoted = upvotedProjects[projectId];
    const action = isUpvoted ? 'remove' : 'add';

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/upvote`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        const data = await res.json();
        setUpvotedProjects(prev => ({ ...prev, [projectId]: !isUpvoted }));
        setSearchResults(prev => prev.map(p => p.id === projectId ? { ...p, upvotes: data.upvotes } : p));
        if (selectedProject?.id === projectId) setSelectedProject(prev => ({ ...prev, upvotes: data.upvotes }));
      }
    } catch (err) { console.error('Failed to upvote', err); }
  };

  const handleGlobalSearch = async (e) => {
    e?.preventDefault();
    if (!globalSearch.trim() && !filterTech.trim() && !filterYear.trim() && !filterSem.trim() && !filterType.trim() && filterType !== "All Types") return;
    
    setIsSearching(true); setHasSearched(true); setSelectedProject(null); setIsProcessing(true);
    
    try {
      const token = localStorage.getItem('access_token');
      let queryUrl = `${API_BASE_URL}/projects/search?q=${encodeURIComponent(globalSearch)}`;
      if (filterTech) queryUrl += `&tech=${encodeURIComponent(filterTech)}`;
      if (filterYear) queryUrl += `&year=${encodeURIComponent(filterYear)}`;
      if (filterSem) queryUrl += `&sem=${encodeURIComponent(filterSem)}`;
      if (filterType) queryUrl += `&type=${encodeURIComponent(filterType)}`;

      const res = await fetch(queryUrl, { headers: { 'Authorization': `Bearer ${token}` }});
      const data = await res.json();
      
      const initialUpvotes = {};
      data.forEach(p => { if (p.is_upvoted) initialUpvotes[p.id] = true; });
      setUpvotedProjects(initialUpvotes);
      setSearchResults(data);
    } catch (err) {
      showMessage('error', 'Failed to execute search.');
    } finally { setIsSearching(false); setIsProcessing(false); }
  };

  const handleViewProject = async (proj) => {
    setSelectedProject(proj);
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`${API_BASE_URL}/projects/${proj.id}/view`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
    } catch (e) { console.error("Failed to increment view", e); }
  };

  const clearSearch = () => {
    setGlobalSearch(''); setFilterTech(''); setFilterYear(''); setFilterSem(''); setFilterType('');
    setSearchResults([]); setHasSearched(false); setSelectedProject(null);
  };

  if (selectedProject) return (
    <ProjectDetailView 
      project={selectedProject}
      onBack={() => setSelectedProject(null)}
      API_BASE_URL={API_BASE_URL}
      showMessage={showMessage}
      isUpvoted={upvotedProjects[selectedProject.id]}
      onUpvote={handleUpvote}
    />
  );

  return (
    <div className={`flex flex-col items-center transition-all duration-500 ${hasSearched ? 'pt-4' : 'pt-12 sm:pt-20 pb-20 flex-1'}`}>
      {!hasSearched && (
        <>
          <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-6 shadow-sm"><Search className="w-10 h-10" /></div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Find a Project</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 text-center max-w-md"> </p>
        </>
      )}
      <form onSubmit={handleGlobalSearch} className={`w-full max-w-3xl flex flex-col gap-3 relative ${hasSearched ? 'mb-8' : 'mb-2'}`}>
        <div className="flex gap-3 relative w-full items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-4 w-6 h-6 text-gray-400 dark:text-gray-500" />
            <input type="text" value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} placeholder="Search by Project Title..." className="w-full pl-14 pr-32 py-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-full shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow" />
            {(globalSearch || filterTech || filterYear || filterSem || filterType) && (
              <button type="button" onClick={clearSearch} className="absolute right-[115px] top-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1" title="Clear Search"><X className="w-5 h-5" /></button>
            )}
            <button type="submit" disabled={isSearching} className="absolute right-2 top-2 bottom-2 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-full transition-colors disabled:bg-indigo-400">{isSearching ? '...' : 'Search'}</button>
          </div>
          <button type="button" onClick={() => setShowFilters(!showFilters)} className={`p-4 rounded-full border shadow-sm transition-colors flex-shrink-0 ${showFilters ? 'bg-indigo-100 dark:bg-indigo-900/50 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`} title="Advanced Filters"><Filter className="w-6 h-6" /></button>
        </div>
        {showFilters && (
          <div className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm flex flex-wrap gap-4 animate-fade-in-up">
            <div className="flex-1 min-w-[150px]"><label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Tech Stack</label><input type="text" value={filterTech} onChange={e => setFilterTech(e.target.value)} placeholder="e.g. React, Python" className="w-full bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg text-sm p-2.5 border outline-none focus:ring-1 focus:ring-indigo-500" /></div>
            <div className="w-full sm:w-32"><label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Year</label><input type="number" value={filterYear} onChange={e => setFilterYear(e.target.value)} placeholder="e.g. 2024" className="w-full bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg text-sm p-2.5 border outline-none focus:ring-1 focus:ring-indigo-500" /></div>
            <div className="w-full sm:w-32"><label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Semester</label><input type="number" value={filterSem} onChange={e => setFilterSem(e.target.value)} placeholder="e.g. 5" className="w-full bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg text-sm p-2.5 border outline-none focus:ring-1 focus:ring-indigo-500" /></div>
            <div className="w-full sm:w-40">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Project Type</label>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg text-sm p-2.5 border outline-none focus:ring-1 focus:ring-indigo-500">
                <option value="">None</option>
                <option value="All Types">All Types</option>
                <option value="Micro">Micro Project</option>
                <option value="Mini">Mini Project</option>
                <option value="Main">Main Project</option>
                <option value="IIC">IIC</option>
                <option value="SDP">SDP</option>
              </select>
            </div>
          </div>
        )}
      </form>

      {hasSearched && (
        <div className="w-full max-w-5xl animate-fade-in-up">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">{searchResults.length} {searchResults.length === 1 ? 'Result' : 'Results'} Found</h3>
          {searchResults.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 p-12 rounded-xl border border-gray-200 dark:border-gray-700 text-center flex flex-col items-center shadow-sm"><FolderKanban className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" /><p className="text-gray-500 dark:text-gray-400 text-lg">No projects matched your search criteria.</p><button onClick={clearSearch} className="mt-4 text-indigo-600 dark:text-indigo-400 hover:underline font-medium">Clear search</button></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pb-8">
              {searchResults.map(proj => {
                const techList = parseTechStack(proj.raw_tech, proj.tech);
                return (
                  <div key={proj.id} onClick={() => handleViewProject(proj)} className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500 transition-all cursor-pointer flex flex-col group">
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white leading-tight group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">{proj.title}</h4>
                      {proj.project_type && proj.project_type !== "Unknown" && (
                        <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[10px] sm:text-[12px] font-bold py-1 w-20 text-center rounded-md border border-indigo-100 dark:border-indigo-800/50 flex-shrink-0 inline-block">
                          {proj.project_type}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center mb-3 gap-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate"><span className="font-semibold text-gray-700 dark:text-gray-300">By:</span> {proj.uploaded_by}</p>
                      <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap flex-shrink-0">
                        Year {proj.year} / S{proj.sem}
                      </span>
                    </div>
                    
                    {techList.length > 0 && (
                      <div className="mb-4 flex flex-wrap gap-1.5">
                        {techList.slice(0, 3).map((t, i) => (
                          <span key={i} className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider border ${t.styleStr}`}>
                            {t.name}
                          </span>
                        ))}
                        {techList.length > 3 && <span className="text-xs text-gray-400 dark:text-gray-500 self-center font-medium">+{techList.length - 3} more</span>}
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 flex-wrap gap-3">
                      <div className="flex items-center gap-4">
                        <span className={`text-xs flex items-center font-medium ${proj.has_abstract ? 'text-green-600 dark:text-green-400' : 'text-gray-300 dark:text-gray-600'}`}><CheckCircle className="w-3.5 h-3.5 mr-1.5"/> Abstract</span>
                        <span className={`text-xs flex items-center font-medium ${proj.has_report ? 'text-blue-600 dark:text-blue-400' : 'text-gray-300 dark:text-gray-600'}`}><CheckCircle className="w-3.5 h-3.5 mr-1.5"/> Report</span>
                        <span className={`text-xs flex items-center font-medium ${proj.has_code ? 'text-purple-600 dark:text-purple-400' : 'text-gray-300 dark:text-gray-600'}`}><CheckCircle className="w-3.5 h-3.5 mr-1.5"/> Code</span>
                      </div>
                      <button onClick={(e) => handleUpvote(e, proj.id)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-bold border transition-colors ${upvotedProjects[proj.id] ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800/50' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-200 dark:hover:border-orange-800/50'}`} title={upvotedProjects[proj.id] ? "Remove Upvote" : "Upvote this project"}>
                        <ChevronUp className={`w-4 h-4 ${upvotedProjects[proj.id] ? 'fill-current' : ''}`} />{proj.upvotes || 0}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectSearch;