import React, { useState, useEffect } from 'react';
import { Users, Eye, Download, FileText, ChevronUp } from 'lucide-react';
import { parseTechStack } from './ProjectSearch';

const ProjectDetailView = ({ project, onBack, API_BASE_URL, showMessage, isUpvoted, onUpvote }) => {
  const [viewingFile, setViewingFile] = useState(null); 
  const [fileUrls, setFileUrls] = useState({ abstract: null, report: null });
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  useEffect(() => {
    const fetchProjectFiles = async () => {
      setIsLoadingFiles(true);
      const token = localStorage.getItem('access_token');
      const urls = { abstract: null, report: null };
      try {
        if (project.has_abstract) {
          const res = await fetch(`${API_BASE_URL}/projects/${project.id}/file/abstract`, { headers: { Authorization: `Bearer ${token}`} });
          if (res.ok) urls.abstract = URL.createObjectURL(await res.blob());
        }
        if (project.has_report) {
          const res = await fetch(`${API_BASE_URL}/projects/${project.id}/file/report`, { headers: { Authorization: `Bearer ${token}`} });
          if (res.ok) urls.report = URL.createObjectURL(await res.blob());
        }
        setFileUrls(urls);
        if (project.has_abstract) setViewingFile('abstract');
        else if (project.has_report) setViewingFile('report');
        else setViewingFile(null); 
      } catch(e) {
        console.error("Error fetching files", e);
      } finally {
        setIsLoadingFiles(false);
      }
    };

    if (project) fetchProjectFiles();
    
    return () => {
      if (fileUrls.abstract) URL.revokeObjectURL(fileUrls.abstract);
      if (fileUrls.report) URL.revokeObjectURL(fileUrls.report);
    };
  }, [project.id]);

  const handleDownloadCode = async () => {
    const token = localStorage.getItem('access_token');
    showMessage('info', 'Preparing code download...');
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${project.id}/file/code`, { headers: { Authorization: `Bearer ${token}`} });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.title.replace(/\s+/g, '_')}_SourceCode.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else showMessage('error', 'Failed to download code.');
    } catch(e) { showMessage('error', 'Network error during download.'); }
  };

  const techList = parseTechStack(project.raw_tech, project.tech);
  const groupedTech = techList.reduce((acc, curr) => {
    if (!acc[curr.category]) acc[curr.category] = [];
    acc[curr.category].push(curr);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in-up transition-colors duration-300">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-start flex-shrink-0 transition-colors duration-300">
        <div className="w-full">
          <button onClick={onBack} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-medium mb-3 flex items-center transition-colors">&larr; Back</button>
          
          <div className="flex items-start justify-between gap-4 mb-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight">{project.title}</h2>
            
            <button onClick={(e) => onUpvote && onUpvote(e, project.id)} className={`flex flex-col items-center justify-center border rounded-lg py-1 px-4 transition-colors shadow-sm flex-shrink-0 ${isUpvoted ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800/50 cursor-default' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'}`} title={isUpvoted ? "Remove Upvote" : "Upvote this project"}>
              <ChevronUp className={`w-6 h-6 ${isUpvoted ? 'text-orange-500 dark:text-orange-400 fill-current' : 'text-gray-400 dark:text-gray-500'}`} />
              <span className={`font-bold text-lg mt-0.5 ${isUpvoted ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'}`}>{project.upvotes || 0}</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400 items-center mt-3">
            <span className="flex items-center"><Users className="w-4 h-4 mr-1 text-indigo-500 dark:text-indigo-400"/> {project.uploaded_by}</span>
            <span className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-800 dark:text-gray-200 font-medium">Year {project.year} / S{project.sem}</span>
            
            {project.project_type && project.project_type !== "Unknown" && (
              <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 py-1 w-20 text-center text-xs rounded font-bold border border-indigo-200 dark:border-indigo-800/50 inline-block">
                {project.project_type}
              </span>
            )}
            <span className="flex items-center gap-1 text-gray-400 dark:text-gray-500 font-medium ml-2 border-l border-gray-300 dark:border-gray-600 pl-4"><Eye className="w-4 h-4"/> {project.views || 0} Views</span>
          </div>

          {Object.keys(groupedTech).length > 0 && (
            <div className="flex flex-col gap-2 mt-5 w-full border-t border-gray-200 dark:border-gray-700 pt-4">
              {Object.entries(groupedTech).map(([catName, items]) => (
                <div key={catName} className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider w-24 flex-shrink-0 text-right pr-2">
                    {catName}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((t, i) => (
                      <span key={i} className={`text-[10px] font-bold px-2 py-0.5 rounded border ${t.styleStr} uppercase tracking-wider`}>
                        {t.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
      <div className="flex flex-col flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <div className="flex justify-between items-center mb-4 flex-shrink-0 gap-4 flex-wrap">
          <div className="flex gap-2">
            <button onClick={() => setViewingFile(viewingFile === 'abstract' ? null : 'abstract')} disabled={!project.has_abstract} className={`px-6 py-2.5 rounded-lg font-medium transition-all ${viewingFile === 'abstract' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed'}`}>Abstract PDF</button>
            <button onClick={() => setViewingFile(viewingFile === 'report' ? null : 'report')} disabled={!project.has_report} className={`px-6 py-2.5 rounded-lg font-medium transition-all ${viewingFile === 'report' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed'}`}>Full Report</button>
          </div>
          <button onClick={handleDownloadCode} disabled={!project.has_code} className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed shadow-sm text-white font-medium py-2.5 px-6 rounded-lg flex items-center gap-2 transition-all hover:shadow"><Download className="w-4 h-4"/> Download Code</button>
        </div>
        
        {(viewingFile || (isLoadingFiles && (project.has_abstract || project.has_report))) && (
          <div className="w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col mt-2 transition-colors duration-300" style={{ minHeight: '75vh' }}>
            {isLoadingFiles ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 dark:border-indigo-400 border-t-transparent mb-4"></div>
                <p>Loading document securely...</p>
              </div>
            ) : viewingFile === 'abstract' && fileUrls.abstract ? (
              <iframe src={fileUrls.abstract} className="w-full flex-1 border-0" title="Abstract Document"></iframe>
            ) : viewingFile === 'report' && fileUrls.report ? (
              <iframe src={fileUrls.report} className="w-full flex-1 border-0" title="Report Document"></iframe>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                 <FileText className="w-16 h-16 mb-3 opacity-30 text-gray-400 dark:text-gray-600" />
                 <p className="text-lg font-medium text-gray-500 dark:text-gray-400">Document missing or corrupted</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetailView;