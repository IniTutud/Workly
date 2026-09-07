import { supabase } from '../utils/supabase';

// Types - Disesuaikan persis dengan ENUM dan aturan flow
export interface Task {
  id: string;
  title: string;
  description: string;
  assigned_to: string;
  created_by: string;
  start_date: string;
  due_date: string;
  status: 'assigned' | 'waiting_review' | 'revision' | 'approved';
  created_at: string;
  updated_at: string;
}

export interface TaskSubmission {
  id: string;
  task_id: string;
  submitted_by: string;
  submission_note: string;
  file_url: string;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  status: 'waiting_review' | 'approved' | 'revision';
}

// Fetch tasks for a specific employee
export const fetchEmployeeTasks = async (userId: string) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('assigned_to', userId)
    .order('due_date', { ascending: true });

  if (error) throw error;
  return data as Task[];
};

// Upload proof to storage and create a submission record
export const submitTaskProof = async (
  taskId: string,
  userId: string,
  note: string,
  file: File
) => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${taskId}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('task_submissions')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from('task_submissions')
      .getPublicUrl(filePath);

    const fileUrl = publicUrlData.publicUrl;

   const { error: submissionError } = await supabase
  .from('task_submissions')
  .insert({
    task_id: taskId,
    submitted_by: userId,
    submission_note: note,
    file_url: fileUrl,
    status: 'submitted' // <- Ubah ini agar sesuai dengan ENUM di database
  });

    if (submissionError) throw submissionError; // Diperbaiki dari insertError

    const { error: updateError } = await supabase
      .from('tasks')
      .update({ status: 'waiting_review' }) // Diperbaiki dari 'In Progress'
      .eq('id', taskId);
      
    if (updateError) throw updateError;

    return { success: true, fileUrl };
  } catch (error) {
    console.error('Submission failed:', error);
    throw error;
  }
};

// Fetch all tasks with their submissions for review
export const fetchAllTasksWithSubmissions = async () => {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      task_submissions (*)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

// Review a task submission (Approve / Reject)
export const reviewTaskSubmission = async (
  submissionId: string,
  taskId: string,
  adminId: string,
  isApproved: boolean,
  comment: string
) => {
  // Menyamakan format status untuk task dan submission sesuai database
  const newStatus = isApproved ? 'approved' : 'revision';

  try {
    const { error: subError } = await supabase
      .from('task_submissions')
      .update({
        status: newStatus,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        review_comment: comment
      })
      .eq('id', submissionId);

    if (subError) throw subError;

    const { error: taskError } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId);

    if (taskError) throw taskError;

    return { success: true };
  } catch (error) {
    console.error('Review failed:', error);
    throw error;
  }
};