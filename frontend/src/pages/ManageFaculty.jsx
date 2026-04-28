import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Search, Download } from 'lucide-react';

const ManageFaculty = ({ user, showMessage, API_BASE_URL, setIsProcessing }) => {
  const [facultyList, setFacultyList] = useState([]); 
  const [facultySearch, setFacultySearch] = useState(''); 
  const facultyFileRef = useRef(null);

  const fetchFaculties = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/admin/users`, { headers: { 'Authorization': `Bearer ${token}` }});
      if (res.ok) {
        const usersData = await res.json();
        setFacultyList(usersData.filter(u => u.role === 'FACULTY'));
      }
    } catch (err) {
      console.error("Failed to fetch faculties", err);
    }
  };

  useEffect(() => {
    fetchFaculties();
  }, []);

  const parseResponse = async (res) => {
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) return await res.json();
    return { error: `Server Error: Status ${res.status}` };
  };

  const handleDownloadTemplate = () => {
    const link = document.createElement("a");
    link.href = `${API_BASE_URL}/admin/download-template/faculty`;
    link.setAttribute("download", "Faculty_Upload_Template.xlsx");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExcelUpload = async () => {
    const file = facultyFileRef.current?.files[0];
    if (!file) return showMessage('error', `Please select a file for Faculty first.`);
    const formData = new FormData(); formData.append('excel', file);
    
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/admin/upload-faculty`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData});
      const data = await parseResponse(res);
      if (res.ok) {
        showMessage('success', data.message || `Faculty uploaded successfully!`);
        facultyFileRef.current.value = ''; 
        fetchFaculties();
      } else showMessage('error', data.error || `The backend rejected the Faculty upload.`);
    } catch (err) { 
      showMessage('error', `Network error.`); 
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRoleUpdate = async (userId, newRole) => {
    try {
      showMessage('info', 'Updating role...');
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/role`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ role: newRole })});
      const data = await parseResponse(res);
      if (res.ok) {
        showMessage('success', data.message || 'Role updated successfully!'); 
        fetchFaculties();
      } else showMessage('error', data.error || 'Failed to update role.');
    } catch (err) { showMessage('error', 'Network error. Failed to update role.'); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 w-full">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 h-fit transition-colors">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg"><FileText className="w-6 h-6" /></div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Import Faculty List</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Upload an Excel file containing <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">name</code> and <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">email</code> columns.</p>

        <input type="file" accept=".xlsx, .xls, .csv" ref={facultyFileRef} className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-3 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 dark:file:bg-green-900/30 file:text-green-700 dark:file:text-green-400 hover:file:bg-green-100 dark:hover:file:bg-green-900/50 cursor-pointer border border-gray-200 dark:border-gray-700 rounded-md mb-5" />

        <div className="flex gap-5 mb-0">
          <button onClick={ handleExcelUpload} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 px-6 rounded-lg transition-colors"><Upload className="w-4 h-4" /> Upload File</button>
          <button onClick={handleDownloadTemplate} className="flex items-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 gap-1 transition-colors mx-auto sm:mx-0"><Download className="w-4 h-4" /> Download template</button>
        </div>

      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-5">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Registered Faculty</h3>
            <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-xs font-medium px-2.5 py-0.5 rounded-full">{facultyList.length} Total</span>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input type="text" placeholder="Search by name..." value={facultySearch} onChange={(e) => setFacultySearch(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow" />
          </div>
        </div>
        {facultyList.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">No faculty members found. Upload a file to populate this list.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
              <thead className="text-xs text-gray-700 dark:text-gray-400 uppercase bg-gray-100 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <tr><th className="px-6 py-3 font-semibold">Name</th><th className="px-6 py-3 font-semibold">Email</th><th className="px-6 py-3 font-semibold">Department</th><th className="px-6 py-3 font-semibold">Manage Role</th></tr>
              </thead>
              <tbody>
                {facultyList.filter(f => f.name.toLowerCase().includes(facultySearch.toLowerCase())).map((faculty) => (
                  <tr key={faculty.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{faculty.name}</td>
                    <td className="px-6 py-4">{faculty.email}</td>
                    <td className="px-6 py-4">{faculty.department || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <select value={faculty.role} onChange={(e) => handleRoleUpdate(faculty.id, e.target.value)} className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-md focus:ring-indigo-500 focus:border-indigo-500 block w-full p-1.5 outline-none cursor-pointer">
                        <option value="FACULTY">Faculty</option><option value="ADMIN">Admin</option><option value="STUDENT">Student</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageFaculty;