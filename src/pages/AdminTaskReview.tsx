import React, { useState, useEffect } from 'react';
import { fetchAllTasksWithSubmissions, reviewTaskSubmission } from '../services/taskService';
import { Check, X, ExternalLink } from 'lucide-react';
import { supabase } from '../utils/supabase';

const AdminTaskReview = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentAdminId(user.id);
      }
      await loadTasks();
    };
    init();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await fetchAllTasksWithSubmissions();
      setTasks(data);
    } catch (err) {
      console.error("Failed to load tasks", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (isApproved: boolean) => {
    if (!selectedSubmission || !currentAdminId) return;
    
    setIsProcessing(true);
    try {
      await reviewTaskSubmission(
        selectedSubmission.id,
        selectedSubmission.task_id,
        currentAdminId,
        isApproved,
        reviewComment
      );
      
      setSelectedSubmission(null);
      setReviewComment('');
      await loadTasks();
    } catch (err) {
      console.error('Failed to review', err);
      alert('Review failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const pendingSubmissions = tasks.flatMap(task => 
    task.task_submissions.map((sub: any) => ({ ...sub, task }))
  ).filter(sub => sub.status === 'Pending');

  if (loading) return <div className="p-6">Loading submissions...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Review Task Submissions</h1>

      {pendingSubmissions.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-500">
          No pending submissions to review. Great job!
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pendingSubmissions.map((sub) => (
                <tr key={sub.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{sub.task.title}</div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">{sub.submission_note}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {sub.submitted_by}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(sub.submitted_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => setSelectedSubmission(sub)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Review Submission</h2>
              <button onClick={() => setSelectedSubmission(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Task: {selectedSubmission.task.title}</h4>
                <p className="text-sm text-gray-600"><strong>Note:</strong> {selectedSubmission.submission_note}</p>
              </div>

              <div>
                <span className="block text-sm font-medium text-gray-700 mb-2">Proof File</span>
                <a 
                  href={selectedSubmission.file_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm bg-blue-50 px-3 py-2 rounded-md"
                >
                  <ExternalLink className="w-4 h-4 mr-2" /> View Uploaded Proof
                </a>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Comment (Optional)</label>
                <textarea 
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  rows={2}
                  placeholder="E.g., Great work, or Needs more detail..."
                />
              </div>

              <div className="flex space-x-3 pt-4 border-t border-gray-100">
                <button 
                  onClick={() => handleReview(false)}
                  disabled={isProcessing}
                  className="flex-1 flex items-center justify-center px-4 py-2 border border-red-200 text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4 mr-2" /> Reject / Revision
                </button>
                <button 
                  onClick={() => handleReview(true)}
                  disabled={isProcessing}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Check className="w-4 h-4 mr-2" /> Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTaskReview;
