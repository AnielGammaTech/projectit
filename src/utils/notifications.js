import { base44 } from '@/api/base44Client';

/**
 * Send in-app + email notification when a task is assigned to someone.
 */
export async function sendTaskAssignmentNotification({
  assigneeEmail,
  taskTitle,
  projectId,
  projectName,
  currentUser,
}) {
  if (!assigneeEmail || assigneeEmail === 'unassigned' || assigneeEmail === currentUser?.email) return;

  try {
    await base44.entities.UserNotification.create({
      user_email: assigneeEmail,
      type: 'task_assigned',
      title: 'New task assigned to you',
      message: `"${taskTitle}" has been assigned to you by ${currentUser?.full_name || currentUser?.email}`,
      project_id: projectId,
      project_name: projectName || '',
      from_user_email: currentUser?.email,
      from_user_name: currentUser?.full_name || currentUser?.email,
      link: `/ProjectDetail?id=${projectId}`,
      is_read: false,
    });

    await base44.functions.invoke('sendNotificationEmail', {
      to: assigneeEmail,
      type: 'task_assigned',
      title: 'New task assigned to you',
      message: `"${taskTitle}" has been assigned to you by ${currentUser?.full_name || currentUser?.email}`,
      projectId,
      projectName: projectName || '',
      fromUserName: currentUser?.full_name || currentUser?.email,
      link: `${window.location.origin}/ProjectDetail?id=${projectId}`,
    });
  } catch (err) {
    console.error('Failed to send task assignment notification:', err);
  }
}

/**
 * Send in-app + email notifications when a task is completed,
 * to everyone in the task's notify_on_complete list.
 */
export async function sendTaskCompletionNotification({
  task,
  projectId,
  projectName,
  currentUser,
}) {
  if (!task.notify_on_complete?.length) return;

  for (const email of task.notify_on_complete) {
    if (email === currentUser?.email) continue;
    try {
      await base44.entities.UserNotification.create({
        user_email: email,
        type: 'task_completed',
        title: 'Task completed',
        message: `"${task.title}" was completed by ${currentUser?.full_name || currentUser?.email}`,
        project_id: projectId,
        project_name: projectName || '',
        from_user_email: currentUser?.email,
        from_user_name: currentUser?.full_name || currentUser?.email,
        link: `/ProjectDetail?id=${projectId}`,
        is_read: false,
      });

      await base44.functions.invoke('sendNotificationEmail', {
        to: email,
        type: 'task_completed',
        title: 'Task completed',
        message: `"${task.title}" was completed by ${currentUser?.full_name || currentUser?.email}`,
        projectId,
        projectName: projectName || '',
        fromUserName: currentUser?.full_name || currentUser?.email,
        link: `${window.location.origin}/ProjectDetail?id=${projectId}`,
      });
    } catch (err) {
      console.error('Failed to send completion notification:', err);
    }
  }
}
