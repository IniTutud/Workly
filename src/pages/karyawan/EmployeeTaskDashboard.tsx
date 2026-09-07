import React, { useState, useEffect } from 'react';
import { fetchEmployeeTasks, submitTaskProof, Task } from '../../services/taskService';
import { UploadCloud, Clock, CheckCircle, AlertCircle, Clock3, PlayCircle } from 'lucide-react';
import { supabase } from '../../utils/supabase';

const EmployeeTaskDashboard = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        await loadTasks(user.id);
      }
    };
    init();
  }, []);

  const loadTasks = async (userId: string) => {
    try {
      setLoading(true);
      const data = await fetchEmployeeTasks(userId);
      setTasks(data);
    } catch (err) {
      console.error("Failed to load tasks", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !file || !currentUserId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await submitTaskProof(selectedTask.id, currentUserId, note, file);
      setSelectedTask(null);
      setFile(null);
      setNote('');
      await loadTasks(currentUserId);
    } catch (err: any) {
      setError(err.message || 'Failed to submit proof. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Helper for dynamic colors and icons based on status
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'Approved':
        return { color: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle className="w-4 h-4 mr-1.5" /> };
      case 'In Progress':
      case 'Pending':
      case 'Under Review':
        return { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: <Clock3 className="w-4 h-4 mr-1.5" /> };
      case 'Revision':
        return { color: 'bg-red-100 text-red-800 border-red-200', icon: <AlertCircle className="w-4 h-4 mr-1.5" /> };
      default: // Not Started / Empty
        return { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <PlayCircle className="w-4 h-4 mr-1.5" /> };
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      {/* 1. Typography Overhaul */}
      <div className="mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">My Tasks</h1>
        <p className="text-gray-500 mt-3 text-lg">Manage your assignments and submit your daily work.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tasks.map(task => {
          const statusConfig = getStatusConfig(task.status);
          
          // 3. Logic for Submit Button (Only 'Not Started' or 'Revision')
          const isPendingReview = task.status === 'In Progress' || task.status === 'Pending' || task.status === 'Under Review';
          const isCompleted = task.status === 'Completed' || task.status === 'Approved';
          const canSubmit = !isPendingReview && !isCompleted;

          return (
            <div key={task.id} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-xl text-gray-900 leading-tight">{task.title}</h3>
              </div>
              
              {/* 2. Status Colors */}
              <div className="mb-4">
                <span className={`inline-flex items-center px-3 py-1 text-xs rounded-full font-bold border ${statusConfig.color}`}>
                  {statusConfig.icon}
                  {task.status || 'Not Started'}
                </span>
              </div>
              
              <p className="text-gray-600 mb-6 flex-grow line-clamp-3">{task.description}</p>
              
              <div className="flex items-center text-sm text-gray-500 mb-6 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <Clock className="w-4 h-4 mr-2 text-gray-400" />
                <span className="font-medium">
                  Due: {new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>

              {/* Submit logic conditionally rendered */}
              {canSubmit ? (
                <button 
                  onClick={() => setSelectedTask(task)}
                  className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white py-3 rounded-xl transition-all duration-200 text-sm font-bold shadow-sm flex items-center justify-center"
                >
                  <UploadCloud className="w-5 h-5 mr-2" />
                  Submit Work
                </button>
              ) : (
                <div className="w-full bg-gray-50 border border-gray-200 text-gray-500 py-3 rounded-xl text-sm font-bold flex items-center justify-center cursor-not-allowed">
                  {isCompleted ? 'Task Approved ✅' : 'Waiting for Admin Review ⏳'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {tasks.length === 0 && !loading && (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-200 border-dashed mt-8">
          <div className="text-gray-300 mb-4 flex justify-center">
            <CheckCircle className="w-20 h-20" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">All caught up!</h3>
          <p className="text-gray-500 mt-2 text-lg">You don't have any pending tasks right now.</p>
        </div>
      )}

      {/* Submission Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-gray-50 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900">Submit Task</h2>
              <p className="text-gray-500 mt-1 text-sm font-medium">{selectedTask.title}</p>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl mb-6 text-sm flex items-start">
                  <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Submission Note</label>
                  <textarea 
                    required
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full border border-gray-300 rounded-2xl p-4 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none text-gray-800"
                    rows={4}
                    placeholder="Describe what you completed or any challenges faced..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Proof of Work (Image)</label>
                  <label className="cursor-pointer border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-2xl p-8 flex flex-col items-center justify-center bg-gray-50 hover:bg-blue-50/50 transition-colors group">
                    <UploadCloud className="w-10 h-10 text-gray-400 group-hover:text-blue-500 mb-3 transition-colors" />
                    <span className="text-sm font-bold text-gray-700 mb-1">Click to upload or drag and drop</span>
                    <span className="text-xs font-medium text-gray-500">PNG, JPG, JPEG (Max 5MB)</span>
                    <input 
                      type="file" 
                      required
                      accept="image/*"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                  {file && (
                    <div className="mt-4 text-sm text-green-700 flex items-center font-bold bg-green-50 p-3 rounded-xl border border-green-100">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      {file.name}
                    </div>
                  )}
                </div>

                <div className="flex space-x-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => {
                      setSelectedTask(null);
                      setError(null);
                      setFile(null);
                    }}
                    className="flex-1 px-4 py-3.5 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting || !file}
                    className="flex-1 px-4 py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Uploading...
                      </>
                    ) : 'Submit Work'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeTaskDashboard;
