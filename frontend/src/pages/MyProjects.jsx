import React, { useState, useEffect } from 'react';
import { AlertCircle, BookOpen, CheckCircle, ChevronUp, Eye, UserPlus, History, Clock, X, ChevronDown } from 'lucide-react';
import { TECH_CATEGORIES } from '../utils/constants';
import { parseResponse } from '../utils/helpers';

const MyProjects = ({ user, showMessage, API_BASE_URL, setIsProcessing }) => {
  const [studentProjects, setStudentProjects] = useState([]);
  const [projectFiles, setProjectFiles] = useState({});
  const [editingProject, setEditingProject] = useState(null); 
  const [teammateModalProject, setTeammateModalProject] = useState(null);
  const [historyModalProject, setHistoryModalProject] = useState(null);
  const [newTeammateEmail, setNewTeammateEmail] = useState('');
  const [teammateModalMessage, setTeammateModalMessage] = useState({ type: '', text: '' });
  
  const [expandedTechProjects, setExpandedTechProjects] = useState({});

  const fetchStudentProjects = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const projRes = await fetch(`${API_BASE_URL}/projects/my-projects`, { headers: { 'Authorization': `Bearer ${token}` }});
      if (projRes.ok) {
        const projData = await projRes.json();
        setStudentProjects(projData); 
      }
    } catch (err) {
      console.error("Failed to fetch student projects", err);
    }
  };

  useEffect(() => {
    fetchStudentProjects();
  }, []);

  const handleAddCollaborator = async (e, projectId) => {
    e.preventDefault();
    if (!newTeammateEmail) return;
    setTeammateModalMessage({ type: '', text: '' }); 
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/collaborator`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newTeammateEmail })
      });
      const data = await parseResponse(res);
      if (res.ok) {
        setTeammateModalMessage({ type: 'success', text: 'Teammate added successfully!' });
        setNewTeammateEmail('');
        fetchStudentProjects(); 
      } else setTeammateModalMessage({ type: 'error', text: data.error || 'Failed to add teammate' });
    } catch (err) { setTeammateModalMessage({ type: 'error', text: 'Network error adding teammate.' }); }
  };

  const handleRemoveCollaborator = async (projectId, email) => {
    setTeammateModalMessage({ type: '', text: '' }); 
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/collaborator`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await parseResponse(res);
      if (res.ok) {
        setTeammateModalMessage({ type: 'success', text: 'Teammate removed successfully.' });
        fetchStudentProjects(); 
      } else setTeammateModalMessage({ type: 'error', text: data.error || 'Failed to remove teammate' });
    } catch(err) { setTeammateModalMessage({ type: 'error', text: 'Network error removing teammate.' }); }
  };

  const handleFileChange = (projectId, field, fileOrValue) => {
    setProjectFiles(prev => ({ ...prev, [projectId]: { ...(prev[projectId] || {}), [field]: fileOrValue } }));
  };

  const handleTechChange = (projectId, cat, val) => {
    setProjectFiles(prev => {
      const projData = prev[projectId] || {};
      const tech = projData.tech || { Frontend: '', Backend: '', Database: '', MobileApp: '', Cloud: '', AIModels: '', Other: '' };
      return { ...prev, [projectId]: { ...projData, tech: { ...tech, [cat]: val } } };
    });
  };

  const handleEditClick = (project) => {
    setEditingProject(project.id);
    let pTech = { Frontend: '', Backend: '', Database: '', MobileApp: '', Cloud: '', AIModels: '', Other: '' };
    try { 
      const parsed = JSON.parse(project.raw_tech);
      pTech = { ...pTech, ...parsed };
    } catch(e) {
      pTech.Other = project.raw_tech || '';
    }
    setProjectFiles(prev => ({ ...prev, [project.id]: { tech: pTech } }));
    
    if (project.raw_tech && project.raw_tech !== "{}") {
      setExpandedTechProjects(prev => ({ ...prev, [project.id]: true }));
    }
  };

  const handleStudentFileUpload = async (e, projectId) => {
    e.preventDefault();
    const currentFiles = projectFiles[projectId];
    const techData = currentFiles?.tech || {};
    
    const hasTech = Object.values(techData).some(val => val.trim() !== '');

    if (!currentFiles?.abstract && !currentFiles?.report && !currentFiles?.code && !hasTech) {
        return showMessage('error', 'Please provide at least one file or a Tech Stack.');
    }

    const formData = new FormData();
    formData.append('tech', JSON.stringify(techData));
    
    if (currentFiles?.abstract) formData.append('abstract', currentFiles.abstract);
    if (currentFiles?.report) formData.append('report', currentFiles.report);
    if (currentFiles?.code) formData.append('code', currentFiles.code);
    
    setIsProcessing(true); 
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/upload`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
      const data = await parseResponse(res);
      if (res.ok) {
        showMessage('success', data.message || 'Data uploaded successfully!');
        setProjectFiles(prev => ({ ...prev, [projectId]: {} }));
        e.target.reset(); 
        setEditingProject(null);
        fetchStudentProjects();
      } else showMessage('error', data.error || 'The backend rejected the data.');
    } catch (err) { 
      showMessage('error', 'Network error during upload.'); 
    } finally {
      setIsProcessing(false); 
    }
  };

  const toggleTechAccordion = (projectId) => {
    setExpandedTechProjects(prev => ({ ...prev, [projectId]: !prev[projectId] }));
  };

  const activeTeammateProject = studentProjects.find(p => p.id === teammateModalProject);
  const activeHistoryProject = studentProjects.find(p => p.id === historyModalProject);

  return (
    <>
      <div className="max-w-4xl mx-auto w-full pb-8">
        {studentProjects.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center transition-colors">
            <AlertCircle className="w-16 h-16 text-yellow-500 dark:text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">No Projects Assigned</h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Your projects have not been approved or uploaded by the admin yet.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {studentProjects.map((project) => {
              const isUploaded = project.tech || project.has_abstract || project.has_report || project.has_code;
              const isEditing = editingProject === project.id;
              const showForm = !isUploaded || isEditing;
              const isTechExpanded = expandedTechProjects[project.id];

              return (
                <div key={project.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-8 transition-all ${isEditing ? 'border-indigo-300 dark:border-indigo-600 ring-4 ring-indigo-50 dark:ring-indigo-900/30' : 'border-gray-200 dark:border-gray-700'}`}>
                  <div className="flex justify-between items-start mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
                    <div className="flex items-start gap-4 pr-4">
                      <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl mt-1"><BookOpen className="w-6 h-6" /></div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-snug">{project.title}</h2>
                          <div className="flex gap-2">
                            <span className="flex items-center gap-1 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-md text-sm font-bold border border-orange-100 dark:border-orange-800/50" title="Total Upvotes"><ChevronUp className="w-4 h-4 fill-current" /> {project.upvotes || 0}</span>
                            <span className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md text-sm font-bold border border-blue-100 dark:border-blue-800/50" title="Total Views"><Eye className="w-4 h-4" /> {project.views || 0}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          {project.project_type && project.project_type !== "Unknown" && (
                            <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 text-[10px] sm:text-xs font-bold py-1 w-20 text-center rounded border border-indigo-200 dark:border-indigo-800/50 inline-block flex-shrink-0">
                              {project.project_type}
                            </span>
                          )}
                          <p className="text-sm text-gray-400 dark:text-gray-500 font-mono">ID: {project.id}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {isUploaded && !isEditing && <button onClick={() => handleEditClick(project)} className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-medium rounded-lg transition-colors text-sm whitespace-nowrap">Edit Details</button>}
                      {isEditing && <button onClick={() => setEditingProject(null)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 font-medium rounded-lg transition-colors text-sm whitespace-nowrap">Cancel Edit</button>}
                    </div>
                  </div>
                  
                  <div className="flex gap-3 mb-6">
                    <button onClick={() => { setTeammateModalProject(project.id); setTeammateModalMessage({type: '', text: ''}); }} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium rounded-lg transition-colors text-sm"><UserPlus className="w-4 h-4 text-indigo-500 dark:text-indigo-400" /> Teammates</button>
                    <button onClick={() => setHistoryModalProject(project.id)} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium rounded-lg transition-colors text-sm"><History className="w-4 h-4 text-orange-500 dark:text-orange-400" /> Action History</button>
                  </div>

                  {showForm ? (
                    <form onSubmit={(e) => handleStudentFileUpload(e, project.id)} className="space-y-6 animate-fade-in-up">
                      <div className="space-y-5">
                        
                        <div className="border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-800 overflow-hidden transition-colors">
                          <button 
                            type="button" 
                            onClick={() => toggleTechAccordion(project.id)}
                            className="w-full px-3 py-3 flex justify-between items-center text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                          >
                            <span>Tech Stack</span>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isTechExpanded ? 'rotate-180' : ''}`} />
                          </button>
                          
                          {isTechExpanded && (
                            <div className="p-4 bg-gray-50/50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up">
                              {TECH_CATEGORIES.map(cat => (
                                <div key={cat.id}>
                                  <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">{cat.label}</label>
                                  <input 
                                    type="text" 
                                    defaultValue={projectFiles[project.id]?.tech?.[cat.id] || ''} 
                                    onChange={e => handleTechChange(project.id, cat.id, e.target.value)} 
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 text-sm" 
                                    placeholder={cat.placeholder} 
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Abstract Document (.pdf)</label><input type="file" accept=".pdf" onChange={e => handleFileChange(project.id, 'abstract', e.target.files[0])} className="block w-full text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md cursor-pointer file:border-0 file:border-r file:border-gray-50 dark:file:border-gray-700 file:bg-gray-100 dark:file:bg-gray-800 file:px-4 file:py-2.5 file:mr-4 file:text-gray-700 dark:file:text-gray-300 hover:file:bg-gray-200 dark:hover:file:bg-gray-700 transition-colors" />{project.has_abstract && <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-1.5 ml-1">✓ File already exists. Uploading will overwrite it.</p>}</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Report (.pdf)</label><input type="file" accept=".pdf" onChange={e => handleFileChange(project.id, 'report', e.target.files[0])} className="block w-full text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md cursor-pointer file:border-0 file:border-r file:border-gray-50 dark:file:border-gray-700 file:bg-gray-100 dark:file:bg-gray-800 file:px-4 file:py-2.5 file:mr-4 file:text-gray-700 dark:file:text-gray-300 hover:file:bg-gray-200 dark:hover:file:bg-gray-700 transition-colors" />{project.has_report && <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-1.5 ml-1">✓ File already exists.</p>}</div>
                          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Source Code (.zip)</label><input type="file" accept=".zip" onChange={e => handleFileChange(project.id, 'code', e.target.files[0])} className="block w-full text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md cursor-pointer file:border-0 file:border-r file:border-gray-50 dark:file:border-gray-700 file:bg-gray-100 dark:file:bg-gray-800 file:px-4 file:py-2.5 file:mr-4 file:text-gray-700 dark:file:text-gray-300 hover:file:bg-gray-200 dark:hover:file:bg-gray-700 transition-colors" />{project.has_code && <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-1.5 ml-1">✓ File already exists.</p>}</div>
                        </div>
                      </div>
                      <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg shadow-sm transition-colors text-lg mt-2">{isEditing ? "Save Updated Files" : "Upload Data"}</button>
                    </form>
                  ) : (
                    <div className="animate-fade-in-up">
                      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                         <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wider">Current Upload Status</h4>
                         <div className="flex flex-wrap gap-x-8 gap-y-4">
                            <span className={`flex items-center text-sm font-medium ${project.tech && project.tech !== "{}" ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-600'}`}><CheckCircle className="w-5 h-5 mr-2"/> Tech Stack</span>
                            <span className={`flex items-center text-sm font-medium ${project.has_abstract ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-600'}`}><CheckCircle className="w-5 h-5 mr-2"/> Abstract</span>
                            <span className={`flex items-center text-sm font-medium ${project.has_report ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-600'}`}><CheckCircle className="w-5 h-5 mr-2"/> Report</span>
                            <span className={`flex items-center text-sm font-medium ${project.has_code ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-600'}`}><CheckCircle className="w-5 h-5 mr-2"/> Code</span>
                         </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* TEAMMATE MODAL */}
      {activeTeammateProject && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full p-6 animate-fade-in-up border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
               <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><UserPlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Manage Teammates</h3>
               <button onClick={() => { setTeammateModalProject(null); setTeammateModalMessage({type: '', text: ''}); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-5 h-5" /></button>
            </div>
            {teammateModalMessage.text && (
              <div className={`mb-4 p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${teammateModalMessage.type === 'error' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50' : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50'}`}>
                {teammateModalMessage.type === 'error' ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle className="w-4 h-4 flex-shrink-0" />}
                {teammateModalMessage.text}
              </div>
            )}
            <div className="space-y-3 mb-6">
              <div className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span><span className="font-medium">{activeTeammateProject.owner}</span> <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto bg-white dark:bg-gray-800 px-2 py-1 rounded border dark:border-gray-600 shadow-sm">Owner</span>
              </div>
              {activeTeammateProject.collaborators.map((cEmail, idx) => (
                <div key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700 group">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span><span className="font-medium">{cEmail}</span>
                  {activeTeammateProject.is_owner && (
                    <button onClick={() => handleRemoveCollaborator(activeTeammateProject.id, cEmail)} className="ml-auto text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1" title="Remove Teammate"><X className="w-4 h-4" /></button>
                  )}
                </div>
              ))}
            </div>
            {activeTeammateProject.is_owner ? (
              <form onSubmit={(e) => handleAddCollaborator(e, activeTeammateProject.id)} className="flex gap-3 bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800/50">
                <input type="email" required placeholder="Enter teammate's email..." value={newTeammateEmail} onChange={(e)=>setNewTeammateEmail(e.target.value)} className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-md text-sm p-2 focus:ring-2 focus:ring-indigo-500 outline-none" />
                <button type="submit" className="bg-indigo-600 text-white hover:bg-indigo-700 font-medium px-5 rounded-md text-sm transition-colors shadow-sm">Add</button>
              </form>
            ) : <p className="text-xs text-gray-500 dark:text-gray-400 text-center italic">Only the project owner can add or remove teammates.</p>}
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {activeHistoryProject && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full p-6 animate-fade-in-up border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
               <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><History className="w-5 h-5 text-orange-500 dark:text-orange-400" /> Action History</h3>
               <button onClick={() => setHistoryModalProject(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-5 h-5" /></button>
            </div>
            {activeHistoryProject.logs.length === 0 ? <p className="text-sm text-gray-400 italic text-center py-8">No actions recorded yet.</p> : (
              <div className="space-y-5 max-h-96 overflow-y-auto pr-4">
                {activeHistoryProject.logs.map((log, idx) => (
                  <div key={idx} className="relative pl-5 border-l-2 border-indigo-100 dark:border-indigo-900/50">
                    <div className="absolute w-3 h-3 bg-indigo-500 rounded-full -left-[7px] top-1 border-2 border-white dark:border-gray-800 shadow-sm"></div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-tight">{log.action}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5"><span className="font-bold text-indigo-600 dark:text-indigo-400">{log.email.split('@')[0]}</span> <span className="text-gray-300 dark:text-gray-600">•</span><Clock className="w-3 h-3" /> {new Date(log.timestamp).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default MyProjects;