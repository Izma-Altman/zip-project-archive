import React, { useState } from 'react';
import { FileText, Search, X, AlertCircle, CheckCircle } from 'lucide-react';
import ProjectDetailView from './ProjectDetailView'; 

const getSeverityStyles = (score) => {
  if (score >= 63) return { card: 'bg-red-100 dark:bg-red-900/30 border-red-400 dark:border-red-800', badge: 'bg-red-200 dark:bg-red-900/50 text-red-900 dark:text-red-300 border-red-400 dark:border-red-800/50', label: 'Extreme Match' };
  if (score >= 60) return { card: 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800/50', badge: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800/50', label: 'Critical Match' };
  if (score >= 57.5) return { card: 'bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-800/50', badge: 'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/50', label: 'Very High Match' };
  if (score >= 55) return { card: 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-800/50', badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800/50', label: 'High Match' };
  if (score >= 52.5) return { card: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/50', badge: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800/50', label: 'Elevated Overlap' };
  return { card: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700', badge: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600', label: 'Standard Overlap' };
};

const SimilarityAudit = ({ user, showMessage, API_BASE_URL, setIsProcessing }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [auditTarget, setAuditTarget] = useState(null);
  const [similarityResults, setSimilarityResults] = useState(null);
  
  const [selectedProject, setSelectedProject] = useState(null);

  const parseResponse = async (res) => {
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) return await res.json();
    return { error: `Server Error: Status ${res.status}` };
  };

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true); setHasSearched(true); setAuditTarget(null); setSimilarityResults(null); setSelectedProject(null);
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/projects/search?q=${encodeURIComponent(searchQuery)}`, { headers: { 'Authorization': `Bearer ${token}` }});
      setSearchResults(await res.json());
    } catch (err) { showMessage('error', 'Failed to execute search.'); } 
    finally { 
      setIsSearching(false); 
      setIsProcessing(false);
    }
  };

  const clearSearch = () => { setSearchQuery(''); setSearchResults([]); setHasSearched(false); setAuditTarget(null); setSimilarityResults(null); setSelectedProject(null); };

  const handleCheckSimilarity = async (project) => {
    setAuditTarget(project); 
    setSimilarityResults(null);
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/projects/${project.id}/similarity`, { headers: { 'Authorization': `Bearer ${token}` }});
      const data = await parseResponse(res);
      if(res.ok) setSimilarityResults(data);
      else { showMessage('error', data.error || 'Failed to analyze similarity.'); setAuditTarget(null); }
    } catch(e) { showMessage('error', 'Network error during similarity check.'); setAuditTarget(null); } 
    finally { setIsProcessing(false); }
  };

  const handleViewSimilarProject = async (similarProj) => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/projects/search?title=${encodeURIComponent(similarProj.title)}`, { 
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const fullProj = data.find(p => p.id === similarProj.id);
      
      if (fullProj) {
        setSelectedProject(fullProj); 
      } else {
        showMessage('error', 'Could not load full project details.');
      }
    } catch (e) {
      showMessage('error', 'Network error loading project details.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {selectedProject ? (
        <ProjectDetailView 
          project={selectedProject}
          onBack={() => setSelectedProject(null)}
          API_BASE_URL={API_BASE_URL}
          showMessage={showMessage}
        />
      ) : auditTarget ? (
        <div className="max-w-4xl mx-auto space-y-6 w-full animate-fade-in-up">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
            <div className="bg-gray-50 dark:bg-gray-900/50 p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-start transition-colors">
              <div>
                <button onClick={() => { setAuditTarget(null); setSimilarityResults(null); }} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-medium mb-3 flex items-center transition-colors">&larr; Back to Search</button>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Target: {auditTarget.title}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Student: {auditTarget.uploaded_by}</p>
              </div>
            </div>

            <div className="p-6">
              {similarityResults && similarityResults.length === 0 ? (
                <div className="text-center p-8 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800/50"><CheckCircle className="w-10 h-10 text-green-500 dark:text-green-400 mx-auto mb-2" /><p className="text-green-800 dark:text-green-300 font-semibold">No similar projects found above the threshold!</p></div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Top Matches</h3>
                  {similarityResults && similarityResults.map((res, idx) => {
                    const styles = getSeverityStyles(res.overall_match);
                    return (
                      <div key={idx} onClick={() => handleViewSimilarProject(res)} className={`p-4 rounded-lg border transition-all cursor-pointer hover:shadow-md hover:scale-[1.01] ${styles.card}`}>
                        <div className="flex justify-between items-start gap-4 mb-3">
                          <div><h4 className="font-bold text-gray-900 dark:text-white leading-tight mb-1">{res.title}</h4></div>
                          <div className={`px-3 py-1.5 rounded-md border font-bold text-xs uppercase tracking-wider shadow-sm flex-shrink-0 ${styles.badge}`}>{styles.label}</div>
                        </div>
                        <div className="flex gap-4 border-t border-black/5 dark:border-white/5 pt-3 mt-1">
                          <div className="flex-1"><div className="flex justify-between text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1"><span>Title Match</span> <span>{res.title_match}%</span></div><div className="w-full bg-black/5 dark:bg-white/5 rounded-full h-1.5"><div className="bg-black/20 dark:bg-white/30 h-1.5 rounded-full" style={{ width: `${res.title_match}%` }}></div></div></div>
                          <div className="flex-1"><div className="flex justify-between text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1"><span>Abstract Match</span> <span>{res.abstract_match}%</span></div><div className="w-full bg-black/5 dark:bg-white/5 rounded-full h-1.5"><div className="bg-black/30 dark:bg-white/40 h-1.5 rounded-full" style={{ width: `${res.abstract_match}%` }}></div></div></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className={`flex flex-col items-center transition-all duration-500 ${hasSearched ? 'pt-4' : 'pt-12 sm:pt-20 pb-20 flex-1'}`}>
          {!hasSearched && (
            <><div className="w-20 h-20 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-6 shadow-sm"><FileText className="w-10 h-10" /></div><h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Analyze Project Similarity</h2><p className="text-gray-500 dark:text-gray-400 mb-8 text-center max-w-md">Search for a project to compare its Title and Abstract against the entire database.</p></>
          )}
          <form onSubmit={handleSearch} className={`w-full max-w-3xl flex gap-3 relative items-center ${hasSearched ? 'mb-8' : 'mb-2'}`}>
            <div className="relative flex-1">
              <Search className="absolute left-4 top-4 w-6 h-6 text-gray-400 dark:text-gray-500" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search for a project to audit..." className="w-full pl-14 pr-32 py-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-full shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow" />
              {searchQuery && <button type="button" onClick={clearSearch} className="absolute right-[115px] top-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1" title="Clear Search"><X className="w-5 h-5" /></button>}
              <button type="submit" disabled={isSearching} className="absolute right-2 top-2 bottom-2 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-full transition-colors disabled:bg-indigo-400">{isSearching ? '...' : 'Search'}</button>
            </div>
          </form>

          {hasSearched && searchResults.length === 0 && (
            <div className="bg-white dark:bg-gray-800 p-12 rounded-xl border border-gray-200 dark:border-gray-700 text-center flex flex-col items-center shadow-sm w-full max-w-3xl animate-fade-in-up transition-colors"><AlertCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" /><p className="text-gray-500 dark:text-gray-400 text-lg">No projects found matching your search.</p><button onClick={clearSearch} className="mt-4 text-indigo-600 dark:text-indigo-400 hover:underline font-medium">Clear search</button></div>
          )}

          {hasSearched && searchResults.length > 0 && (
            <div className="w-full max-w-5xl animate-fade-in-up">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">Select a Project to Audit</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pb-8">
                {searchResults.map(proj => (
                  <div key={proj.id} onClick={() => handleCheckSimilarity(proj)} className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500 transition-all cursor-pointer flex gap-4 group">
                    <div className="flex-1 flex flex-col">
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
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default SimilarityAudit;
