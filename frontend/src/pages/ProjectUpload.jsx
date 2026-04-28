import React, { useState, useRef } from 'react';
import { Upload, FileText, PlusCircle, Download, ChevronDown, Edit, Trash2, Search, X } from 'lucide-react';
import { TECH_CATEGORIES } from '../utils/constants';
import { parseResponse } from '../utils/helpers';

const getInitialFormState = () => ({ 
  title: '', studentEmail: '', projectType: '', year: '', sem: '', 
  tech: { Frontend: '', Backend: '', Database: '', MobileApp: '', Cloud: '', AIModels: '', Other: '' }, 
  abstract: null, report: null, code: null 
});

const ProjectUpload = ({ user, showMessage, API_BASE_URL, setIsProcessing }) => {
  const projectFileRef = useRef(null);
  
  const [newState, setNewState] = useState(getInitialFormState());
  const [updateState, setUpdateState] = useState(getInitialFormState());
  const [deleteTitle, setDeleteTitle] = useState('');
  
  const [selectedProjectForUpdate, setSelectedProjectForUpdate] = useState(null);
  
  const [isBatchExpanded, setIsBatchExpanded] = useState(false);
  const [isNewProjectExpanded, setIsNewProjectExpanded] = useState(false);
  const [isUpdateExpanded, setIsUpdateExpanded] = useState(false);
  const [isDeleteExpanded, setIsDeleteExpanded] = useState(false);
  
  const [isNewTechExpanded, setIsNewTechExpanded] = useState(false);
  const [isUpdateTechExpanded, setIsUpdateTechExpanded] = useState(false);

  const [showProjectModal, setShowProjectModal] = useState(false);
  const [similarProjects, setSimilarProjects] = useState([]);
  const [modalAction, setModalAction] = useState('update');
  
  const [deletingProjectId, setDeletingProjectId] = useState(null);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const deleteIntervalRef = useRef(null);

  const handleDownloadTemplate = () => {
    const link = document.createElement("a");
    link.href = `${API_BASE_URL}/admin/download-template/projects`;
    link.setAttribute("download", "Project_Upload_Template.xlsx");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExcelUpload = async () => {
    const file = projectFileRef.current?.files[0];
    if (!file) return showMessage('error', `Please select a file for Projects first.`);
    const formData = new FormData(); formData.append('excel', file);
    
    if (setIsProcessing) setIsProcessing(true); 
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/admin/upload-approved-projects`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData});
      const data = await parseResponse(res);
      if (res.ok) {
        showMessage('success', data.message || `Projects uploaded successfully!`);
        projectFileRef.current.value = ''; 
        setIsBatchExpanded(false); 
      } else showMessage('error', data.error || `The backend rejected the upload.`);
    } catch (err) { showMessage('error', `Network error.`); } 
    finally { if (setIsProcessing) setIsProcessing(false); }
  };

  const handleTechChange = (type, catId, val) => {
    if (type === 'new') setNewState(prev => ({ ...prev, tech: { ...prev.tech, [catId]: val } }));
    else setUpdateState(prev => ({ ...prev, tech: { ...prev.tech, [catId]: val } }));
  };

  const handleNewProjectSubmit = async (e) => {
    e.preventDefault();
    executeAdminUpload('NEW');
  };

  const handleSearchForUpdate = async (e) => {
    e.preventDefault();
    if (!updateState.title) return showMessage('error', 'Project Title is required to search.');
    if (setIsProcessing) setIsProcessing(true); 
    try {
      const token = localStorage.getItem('access_token');
      const searchRes = await fetch(`${API_BASE_URL}/projects/search?title=${encodeURIComponent(updateState.title)}`, { headers: { 'Authorization': `Bearer ${token}` }});
      const matches = await searchRes.json();
      if (matches.length > 0) {
        setSimilarProjects(matches); setModalAction('update'); setShowProjectModal(true);
      } else showMessage('error', 'No existing project found with that title.');
    } catch (err) { showMessage('error', 'Failed to search projects.'); } 
    finally { if (setIsProcessing) setIsProcessing(false); }
  };

  const handleSearchForDelete = async (e) => {
    e.preventDefault();
    if (!deleteTitle) return showMessage('error', 'Project Title is required to search.');
    if (setIsProcessing) setIsProcessing(true); 
    try {
      const token = localStorage.getItem('access_token');
      const searchRes = await fetch(`${API_BASE_URL}/projects/search?title=${encodeURIComponent(deleteTitle)}`, { headers: { 'Authorization': `Bearer ${token}` }});
      const matches = await searchRes.json();
      if (matches.length > 0) {
        setSimilarProjects(matches); setModalAction('delete'); setShowProjectModal(true);
      } else showMessage('error', 'No existing project found with that title.');
    } catch (err) { showMessage('error', 'Failed to search projects.'); } 
    finally { if (setIsProcessing) setIsProcessing(false); }
  };

  const handleSelectProjectForUpdate = (proj) => {
    let parsedTech = { Frontend: '', Backend: '', Database: '', MobileApp: '', Cloud: '', AIModels: '', Other: '' };
    
    const rawData = proj.raw_tech || proj.tech;

    if (rawData && rawData !== 'N/A') {
      try {
        if (rawData.startsWith('{')) {
          const parsed = JSON.parse(rawData);
          parsedTech = { ...parsedTech, ...parsed };
        } else {
          parsedTech.Other = rawData;
        }
      } catch(e) {
        parsedTech.Other = rawData;
      }
    }

    setUpdateState({
      title: proj.title || '',
      studentEmail: proj.uploaded_by || '', 
      year: proj.year || '',
      sem: proj.sem || '',
      projectType: proj.project_type || '', 
      tech: parsedTech,
      abstract: null,
      report: null,
      code: null
    });
    
    setSelectedProjectForUpdate(proj);
    setShowProjectModal(false);
  };

  const executeAdminUpload = async (projectId) => {
    const isNew = projectId === 'NEW';
    const targetState = isNew ? newState : updateState;
    const { title, studentEmail, year, sem, tech, abstract, report, code, projectType } = targetState;
    
    const formData = new FormData();
    formData.append('project_id', projectId); 
    formData.append('title', title);
    
    if (studentEmail) formData.append('student_email', studentEmail);
    if (year) formData.append('year', year);
    if (sem) formData.append('sem', sem); 
    if (projectType) formData.append('project_type', projectType);
    if (abstract) formData.append('abstract', abstract);
    if (report) formData.append('report', report);
    if (code) formData.append('code', code);

    const cleanTech = {};
    let hasTech = false;
    for (const key in tech) {
      if (tech[key] && tech[key].trim()) {
        cleanTech[key] = tech[key].trim();
        hasTech = true;
      }
    }
    if (hasTech) formData.append('tech', JSON.stringify(cleanTech));

    if (setIsProcessing) setIsProcessing(true); 
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/projects/admin-upload`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
      const data = await parseResponse(res);
      if (res.ok) {
        showMessage('success', data.message || 'Data updated successfully!');
        if (isNew) {
          setNewState(getInitialFormState()); 
          setIsNewTechExpanded(false); 
          setIsNewProjectExpanded(false); 
          document.getElementById('newProjectForm').reset(); 
        } else {
          setUpdateState(getInitialFormState()); 
          setIsUpdateTechExpanded(false); 
          setSelectedProjectForUpdate(null); 
          setIsUpdateExpanded(false); 
          document.getElementById('updateProjectForm')?.reset();
        }
      } else showMessage('error', data.error || 'The backend rejected the files.');
    } catch (err) { showMessage('error', 'Network error during upload.'); } 
    finally { if (setIsProcessing) setIsProcessing(false); }
  };

  const handleDeleteProject = async (projectId) => {
    setShowProjectModal(false);
    if (setIsProcessing) setIsProcessing(true); 
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
      if (res.ok) {
        showMessage('success', 'Project completely deleted.');
        setDeleteTitle('');
        setIsDeleteExpanded(false); 
      } else showMessage('error', 'Failed to delete project.');
    } catch(err) { showMessage('error', 'Network error during deletion.'); } 
    finally { if (setIsProcessing) setIsProcessing(false); }
  };

  const startDeleteHold = (projectId) => {
    setDeletingProjectId(projectId); setDeleteProgress(0); let progress = 0;
    deleteIntervalRef.current = setInterval(() => {
      progress += 5; setDeleteProgress(progress);
      if (progress >= 100) { clearInterval(deleteIntervalRef.current); setDeletingProjectId(null); setDeleteProgress(0); handleDeleteProject(projectId); }
    }, 50); 
  };

  const stopDeleteHold = () => { clearInterval(deleteIntervalRef.current); setDeletingProjectId(null); setDeleteProgress(0); };

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6 w-full pb-12">
        
        {/* CARD 1: BATCH IMPORT */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-green-200 dark:border-green-900/50 p-6 transition-colors duration-300">
          <div 
            onClick={() => setIsBatchExpanded(!isBatchExpanded)}
            className={`flex items-center justify-between cursor-pointer group ${isBatchExpanded ? 'mb-6 pb-4 border-b border-gray-100 dark:border-gray-700' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg group-hover:bg-green-100 dark:group-hover:bg-green-900/50 transition-colors"><FileText className="w-6 h-6" /></div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">Batch Import Approved Projects</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Upload an Excel file to add multiple projects at once.</p>
              </div>
            </div>
            <div className={`p-2 rounded-full transition-colors ${isBatchExpanded ? 'bg-green-100 dark:bg-green-900/50' : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-green-50 dark:group-hover:bg-green-900/30'}`}>
              <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isBatchExpanded ? 'rotate-180 text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400'}`} />
            </div>
          </div>

          {isBatchExpanded && (
            <div className="animate-fade-in-up">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Upload an Excel file containing <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">title</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">student_email</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">student_name</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">year</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">sem</code>, and <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">project_type</code> columns.</p>
              <input type="file" accept=".xlsx, .xls, .csv" ref={projectFileRef} className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-3 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 dark:file:bg-green-900/30 file:text-green-700 dark:file:text-green-400 hover:file:bg-green-100 dark:hover:file:bg-green-900/50 cursor-pointer border border-gray-200 dark:border-gray-700 rounded-md mb-5" />
              <div className="flex gap-5 mb-0">
                 <button onClick={handleExcelUpload} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 px-6 rounded-lg transition-colors"><Upload className="w-4 h-4" /> Upload File</button>
                 <button type="button" onClick={handleDownloadTemplate} className="flex items-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 gap-1 transition-colors mx-auto sm:mx-0"><Download className="w-4 h-4" /> Download template</button>
              </div>
            </div>
          )}
        </div>
        
        {/* CARD 2: UPLOAD NEW PROJECT */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-indigo-200 dark:border-indigo-900/50 p-6 transition-colors duration-300">
          <div 
            onClick={() => setIsNewProjectExpanded(!isNewProjectExpanded)}
            className={`flex items-center justify-between cursor-pointer group ${isNewProjectExpanded ? 'mb-6 pb-4 border-b border-gray-100 dark:border-gray-700' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors"><PlusCircle className="w-6 h-6" /></div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Upload New Project</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Manually add a single project to the system.</p>
              </div>
            </div>
            <div className={`p-2 rounded-full transition-colors ${isNewProjectExpanded ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30'}`}>
              <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isNewProjectExpanded ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`} />
            </div>
          </div>

          {isNewProjectExpanded && (
            <form id="newProjectForm" onSubmit={handleNewProjectSubmit} className="space-y-6 animate-fade-in-up">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-10">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title*</label>
                  <input required type="text" value={newState.title} onChange={e => setNewState({...newState, title: e.target.value})} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2.5 text-sm" placeholder="Enter full project title..." />
                </div>
                <div className="md:col-span-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type*</label>
                    <select required value={newState.projectType || ''} onChange={e => setNewState({...newState, projectType: e.target.value})} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2.5 text-sm">
                      <option value="">Select Type...</option>
                      <option value="Micro">Micro Project</option>
                      <option value="Mini">Mini Project</option>
                      <option value="Main">Main Project</option>
                      <option value="IIC">IIC</option>
                      <option value="SDP">SDP</option>
                    </select>
                  </div>
                </div>
                <div className="md:col-span-8">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Student Email*</label>
                  <input required type="email" value={newState.studentEmail} onChange={e => setNewState({...newState, studentEmail: e.target.value})} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2.5 text-sm" placeholder="student@mbcet.ac.in" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year*</label>
                  <input required type="number" value={newState.year} onChange={e => setNewState({...newState, year: e.target.value})} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2.5 text-sm" placeholder="e.g. 2024" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sem*</label>
                  <input required type="number" value={newState.sem} onChange={e => setNewState({...newState, sem: e.target.value})} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2.5 text-sm" placeholder="e.g. 5" />
                </div>
              </div>

              <div className="border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-800 overflow-hidden">
                <button type="button" onClick={() => setIsNewTechExpanded(!isNewTechExpanded)} className="w-full px-3 py-3 flex justify-between items-center text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left">
                  <span>Tech Stack Definition</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isNewTechExpanded ? 'rotate-180' : ''}`} />
                </button>
                {isNewTechExpanded && (
                  <div className="p-4 bg-gray-50/50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up">
                    {TECH_CATEGORIES.map(cat => (
                      <div key={cat.id}>
                        <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">{cat.label}</label>
                        <input type="text" value={newState.tech[cat.id] || ''} onChange={e => handleTechChange('new', cat.id, e.target.value)} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 text-sm" placeholder={cat.placeholder} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
                
              <div className="space-y-5 border-t border-gray-100 dark:border-gray-700 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Abstract Document (.pdf)</label><input type="file" accept=".pdf" onChange={e => setNewState({...newState, abstract: e.target.files[0]})} className="block w-full text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md cursor-pointer file:border-0 file:border-r file:border-gray-50 dark:file:border-gray-700 file:bg-gray-100 dark:file:bg-gray-800 file:px-4 file:py-2.5 file:mr-4 file:text-gray-700 dark:file:text-gray-300 hover:file:bg-gray-200 dark:hover:file:bg-gray-700 transition-colors" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Report (.pdf)</label><input type="file" accept=".pdf" onChange={e => setNewState({...newState, report: e.target.files[0]})} className="block w-full text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md cursor-pointer file:border-0 file:border-r file:border-gray-50 dark:file:border-gray-700 file:bg-gray-100 dark:file:bg-gray-800 file:px-4 file:py-2.5 file:mr-4 file:text-gray-700 dark:file:text-gray-300 hover:file:bg-gray-200 dark:hover:file:bg-gray-700 transition-colors" /></div>
                </div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Source Code (.zip)</label><input type="file" accept=".zip" onChange={e => setNewState({...newState, code: e.target.files[0]})} className="block w-full text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md cursor-pointer file:border-0 file:border-r file:border-gray-50 dark:file:border-gray-700 file:bg-gray-100 dark:file:bg-gray-800 file:px-4 file:py-2.5 file:mr-4 file:text-gray-700 dark:file:text-gray-300 hover:file:bg-gray-200 dark:hover:file:bg-gray-700 transition-colors" /></div>
              </div>
              
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg shadow-sm transition-colors text-lg mt-2">Upload New Project</button>
            </form>
          )}
        </div>

        {/* CARD 3: UPDATE EXISTING PROJECT */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-orange-200 dark:border-orange-900/50 p-6 transition-colors duration-300">
          <div 
            onClick={() => setIsUpdateExpanded(!isUpdateExpanded)}
            className={`flex items-center justify-between cursor-pointer group ${isUpdateExpanded ? 'mb-6 pb-4 border-b border-gray-100 dark:border-gray-700' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg group-hover:bg-orange-100 dark:group-hover:bg-orange-900/50 transition-colors"><Edit className="w-6 h-6" /></div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">Update Existing Project</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Search for a project to modify its details or upload missing files.</p>
              </div>
            </div>
            <div className={`p-2 rounded-full transition-colors ${isUpdateExpanded ? 'bg-orange-100 dark:bg-orange-900/50' : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-orange-50 dark:group-hover:bg-orange-900/30'}`}>
              <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isUpdateExpanded ? 'rotate-180 text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-orange-600 dark:group-hover:text-orange-400'}`} />
            </div>
          </div>

          {isUpdateExpanded && (
            <div className="animate-fade-in-up">
              {!selectedProjectForUpdate ? (
                <form onSubmit={handleSearchForUpdate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search by Project Title*</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <input required type="text" value={updateState.title} onChange={e => setUpdateState({...updateState, title: e.target.value})} className="w-full pl-10 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500 p-2.5 text-sm" placeholder="Enter exact or partial project title..." />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-4 rounded-lg shadow-sm transition-colors text-lg">Search Projects</button>
                </form>
              ) : (
                <form id="updateProjectForm" onSubmit={(e) => { e.preventDefault(); executeAdminUpload(selectedProjectForUpdate.id); }} className="space-y-6 animate-fade-in-up">
                  
                  <div className="flex justify-between items-center bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-100 dark:border-orange-800/50 mb-6">
                    <div>
                      <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-0.5">Currently Editing</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{selectedProjectForUpdate.title}</p>
                    </div>
                    <button type="button" onClick={() => { setSelectedProjectForUpdate(null); setUpdateState(getInitialFormState()); }} className="text-xs bg-white dark:bg-gray-800 border border-orange-200 dark:border-gray-600 text-orange-700 dark:text-orange-400 px-3 py-1.5 rounded shadow-sm hover:bg-orange-100 dark:hover:bg-gray-700 font-bold transition-colors flex items-center gap-1"><X className="w-3 h-3"/> Cancel</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-10">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title*</label>
                      <input required type="text" value={updateState.title} onChange={e => setUpdateState({...updateState, title: e.target.value})} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500 p-2.5 text-sm" />
                    </div>
                    <div className="md:col-span-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type*</label>
                        <select value={updateState.projectType || ''} onChange={e => setUpdateState({...updateState, projectType: e.target.value})} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500 p-2.5 text-sm">
                          <option value="Micro">Micro Project</option>
                          <option value="Mini">Mini Project</option>
                          <option value="Main">Main Project</option>
                          <option value="IIC">IIC</option>
                          <option value="SDP">SDP</option>
                        </select>
                      </div>
                    </div>
                    <div className="md:col-span-8">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Student Email*</label>
                      <input required type="email" value={updateState.studentEmail} onChange={e => setUpdateState({...updateState, studentEmail: e.target.value})} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500 p-2.5 text-sm" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year*</label>
                      <input required type="number" value={updateState.year} onChange={e => setUpdateState({...updateState, year: e.target.value})} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500 p-2.5 text-sm" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sem*</label>
                      <input required type="number" value={updateState.sem} onChange={e => setUpdateState({...updateState, sem: e.target.value})} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500 p-2.5 text-sm" />
                    </div>
                  </div>

                  <div className="border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-800 overflow-hidden">
                    <button type="button" onClick={() => setIsUpdateTechExpanded(!isUpdateTechExpanded)} className="w-full px-3 py-3 flex justify-between items-center text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left">
                      <span>Update Tech Stack</span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isUpdateTechExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    {isUpdateTechExpanded && (
                      <div className="p-4 bg-gray-50/50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up">
                        {TECH_CATEGORIES.map(cat => (
                          <div key={cat.id}>
                            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">{cat.label}</label>
                            <input type="text" value={updateState.tech[cat.id] || ''} onChange={e => handleTechChange('update', cat.id, e.target.value)} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 p-2 text-sm" placeholder={cat.placeholder} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                    
                  <div className="space-y-5 border-t border-gray-100 dark:border-gray-700 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Replace Abstract Document (.pdf)</label><input type="file" accept=".pdf" onChange={e => setUpdateState({...updateState, abstract: e.target.files[0]})} className="block w-full text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md cursor-pointer file:border-0 file:border-r file:border-gray-50 dark:file:border-gray-700 file:bg-gray-100 dark:file:bg-gray-800 file:px-4 file:py-2.5 file:mr-4 file:text-gray-700 dark:file:text-gray-300 hover:file:bg-gray-200 dark:hover:file:bg-gray-700 transition-colors" /></div>
                      <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Replace Report (.pdf)</label><input type="file" accept=".pdf" onChange={e => setUpdateState({...updateState, report: e.target.files[0]})} className="block w-full text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md cursor-pointer file:border-0 file:border-r file:border-gray-50 dark:file:border-gray-700 file:bg-gray-100 dark:file:bg-gray-800 file:px-4 file:py-2.5 file:mr-4 file:text-gray-700 dark:file:text-gray-300 hover:file:bg-gray-200 dark:hover:file:bg-gray-700 transition-colors" /></div>
                    </div>
                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Replace Code (.zip)</label><input type="file" accept=".zip" onChange={e => setUpdateState({...updateState, code: e.target.files[0]})} className="block w-full text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md cursor-pointer file:border-0 file:border-r file:border-gray-50 dark:file:border-gray-700 file:bg-gray-100 dark:file:bg-gray-800 file:px-4 file:py-2.5 file:mr-4 file:text-gray-700 dark:file:text-gray-300 hover:file:bg-gray-200 dark:hover:file:bg-gray-700 transition-colors" /></div>
                  </div>
                  
                  <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-4 rounded-lg shadow-sm transition-colors text-lg mt-2">Save Update</button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* CARD 4: DELETE PROJECT */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-red-200 dark:border-red-900/50 p-6 transition-colors duration-300">
          <div 
            onClick={() => setIsDeleteExpanded(!isDeleteExpanded)}
            className={`flex items-center justify-between cursor-pointer group ${isDeleteExpanded ? 'mb-6 pb-4 border-b border-gray-100 dark:border-gray-700' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg group-hover:bg-red-100 dark:group-hover:bg-red-900/50 transition-colors"><Trash2 className="w-6 h-6" /></div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">Delete Project</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Permanently remove a project and all associated files from the system.</p>
              </div>
            </div>
            <div className={`p-2 rounded-full transition-colors ${isDeleteExpanded ? 'bg-red-100 dark:bg-red-900/50' : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-red-50 dark:group-hover:bg-red-900/30'}`}>
              <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isDeleteExpanded ? 'rotate-180 text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400'}`} />
            </div>
          </div>

          {isDeleteExpanded && (
            <div className="animate-fade-in-up">
              <form onSubmit={handleSearchForDelete} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search Project Title to Delete*</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input required type="text" value={deleteTitle} onChange={e => setDeleteTitle(e.target.value)} className="w-full pl-10 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500 p-2.5 text-sm" placeholder="Enter exact or partial project title..." />
                  </div>
                </div>
                <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg shadow-sm transition-colors text-lg">Search & Delete Project</button>
              </form>
            </div>
          )}
        </div>

      </div>

      {/* ADMIN ACTION MODAL (Search Results Selection) */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full p-6 max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{modalAction === 'delete' ? 'Select Project to Delete' : 'Select Project to Edit'}</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Choose the exact project from the search results below.</p>
            <div className="flex-1 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg mb-6">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <tr><th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Project Details</th><th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 text-right w-32">Action</th></tr>
                </thead>
                <tbody>
                  {similarProjects.map(proj => (
                    <tr key={proj.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-white text-base mb-1.5 flex items-center flex-wrap gap-2">{proj.title}<span className="font-mono text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600">ID: {proj.id.substring(0,8)}...</span></div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1"><span className="font-semibold text-gray-600 dark:text-gray-300">Student:</span> {proj.uploaded_by}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400"><span className="font-semibold text-gray-600 dark:text-gray-300">Year / Sem:</span> {proj.year} / {proj.sem}</div>
                      </td>
                      <td className="px-4 py-3 text-right align-middle">
                        {modalAction === 'delete' ? (
                          <button onMouseDown={() => startDeleteHold(proj.id)} onMouseUp={stopDeleteHold} onMouseLeave={stopDeleteHold} onTouchStart={() => startDeleteHold(proj.id)} onTouchEnd={stopDeleteHold} className="relative overflow-hidden bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 font-medium py-1.5 px-4 rounded text-sm transition-colors select-none">
                            <div className="absolute left-0 top-0 bottom-0 bg-red-200 dark:bg-red-900/60 transition-all duration-75 ease-linear" style={{ width: deletingProjectId === proj.id ? `${deleteProgress}%` : '0%' }}></div><span className="relative z-10"><Trash2 className="w-6 h-6" /></span>
                          </button>
                        ) : (
                          <button onClick={() => handleSelectProjectForUpdate(proj)} className="bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/60 font-bold py-1.5 px-4 rounded text-sm transition-colors shadow-sm"><Edit className="w-5 h-5" /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700"><button onClick={() => setShowProjectModal(false)} className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">Cancel</button></div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProjectUpload;