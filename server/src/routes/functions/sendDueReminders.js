import entityService from '../../services/entityService.js';
import sendNotificationEmail from './sendNotificationEmail.js';

const DEDUP_HOURS = 1; // Don't send duplicate notifications within this window

/**
 * Core logic for sending due reminders. Exported so the scheduler can call it directly.
 */
export async function runDueReminders() {
  console.log('[DueReminders] Starting due date reminder check...');

  // Get all tasks with due dates that are not completed
  const allTasks = await entityService.list('Task');
  const activeTasks = allTasks.filter(t =>
    t.due_date &&
    t.status !== 'completed' &&
    t.status !== 'archived' &&
    t.assigned_to
  );

  console.log(`[DueReminders] Found ${activeTasks.length} active tasks with due dates and assignments`);

  // Get all user notification settings
  const allSettings = await entityService.list('NotificationSettings');
  const settingsMap = {};
  allSettings.forEach(s => { settingsMap[s.user_email] = s; });

  // Get all projects for context and to filter archived ones
  const allProjects = await entityService.list('Project');
  const projectMap = {};
  const archivedProjectIds = new Set();
  allProjects.forEach(p => {
    projectMap[p.id] = p;
    if (p.status === 'archived') archivedProjectIds.add(p.id);
  });

  // Get recent notifications for deduplication (last DEDUP_HOURS hours)
  const allNotifications = await entityService.list('UserNotification');
  const cutoff = new Date(Date.now() - DEDUP_HOURS * 60 * 60 * 1000);
  const recentNotifKeys = new Set();
  allNotifications.forEach(n => {
    if (n.type === 'task_due' && new Date(n.created_date) > cutoff) {
      // Key by user + message to deduplicate
      recentNotifKeys.add(`${n.user_email}::${n.message}`);
    }
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let remindersSent = 0;
  let overduesSent = 0;
  let skippedDuplicates = 0;

  for (const task of activeTasks) {
    // Skip tasks from archived projects
    if (task.project_id && archivedProjectIds.has(task.project_id)) continue;

    const dueDate = new Date(task.due_date);
    dueDate.setHours(0, 0, 0, 0);

    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    const userSettings = settingsMap[task.assigned_to] || {};
    const reminderDays = userSettings.due_reminder_days ?? 1;
    const project = projectMap[task.project_id];

    // Check for overdue tasks
    if (daysUntilDue < 0 && userSettings.notify_task_overdue !== false) {
      const message = `"${task.title}" was due ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) > 1 ? 's' : ''} ago`;
      const dedupKey = `${task.assigned_to}::${message}`;

      // Skip if we already sent this exact notification recently
      if (recentNotifKeys.has(dedupKey)) {
        skippedDuplicates++;
        continue;
      }

      // Create in-app notification
      await entityService.create('UserNotification', {
        user_email: task.assigned_to,
        type: 'task_due',
        title: 'Task is overdue',
        message,
        project_id: task.project_id,
        project_name: project?.name,
        link: `/ProjectDetail?id=${task.project_id}`,
        is_read: false,
      });

      // Send email if instant notifications enabled
      if (userSettings.email_frequency !== 'daily_digest' && userSettings.email_frequency !== 'weekly_digest') {
        const mockReq = {
          body: {
            to: task.assigned_to,
            type: 'task_overdue',
            title: 'Task is overdue',
            message,
            projectId: task.project_id,
            projectName: project?.name,
            link: `/ProjectDetail?id=${task.project_id}`,
          },
        };
        const mockRes = {
          status: () => mockRes,
          json: () => mockRes,
        };
        await sendNotificationEmail(mockReq, mockRes);
      }
      overduesSent++;
    }
    // Check for tasks due soon (based on user's reminder preference)
    else if (daysUntilDue >= 0 && daysUntilDue <= reminderDays && userSettings.notify_task_due_soon !== false) {
      const dueText = daysUntilDue === 0 ? 'today' : daysUntilDue === 1 ? 'tomorrow' : `in ${daysUntilDue} days`;
      const message = `"${task.title}" is due ${dueText}`;
      const dedupKey = `${task.assigned_to}::${message}`;

      // Skip if we already sent this exact notification recently
      if (recentNotifKeys.has(dedupKey)) {
        skippedDuplicates++;
        continue;
      }

      // Create in-app notification
      await entityService.create('UserNotification', {
        user_email: task.assigned_to,
        type: 'task_due',
        title: `Task due ${dueText}`,
        message,
        project_id: task.project_id,
        project_name: project?.name,
        link: `/ProjectDetail?id=${task.project_id}`,
        is_read: false,
      });

      // Send email if instant notifications enabled
      if (userSettings.email_frequency !== 'daily_digest' && userSettings.email_frequency !== 'weekly_digest') {
        const mockReq = {
          body: {
            to: task.assigned_to,
            type: 'task_due',
            title: `Task due ${dueText}`,
            message,
            projectId: task.project_id,
            projectName: project?.name,
            link: `/ProjectDetail?id=${task.project_id}`,
          },
        };
        const mockRes = {
          status: () => mockRes,
          json: () => mockRes,
        };
        await sendNotificationEmail(mockReq, mockRes);
      }
      remindersSent++;
    }
  }

  // Send consolidated push per user (one push summarizing all overdue/due)
  if (remindersSent > 0 || overduesSent > 0) {
    try {
      const { sendPushNotification } = await import('../../services/pushService.js');
      // Group counts by user
      const userCounts = {};
      for (const task of activeTasks) {
        if (task.project_id && archivedProjectIds.has(task.project_id)) continue;
        const dueDate = new Date(task.due_date);
        dueDate.setHours(0, 0, 0, 0);
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        if (daysUntilDue < 0 || (daysUntilDue >= 0 && daysUntilDue <= 1)) {
          if (!userCounts[task.assigned_to]) userCounts[task.assigned_to] = { overdue: 0, dueSoon: 0 };
          if (daysUntilDue < 0) userCounts[task.assigned_to].overdue++;
          else userCounts[task.assigned_to].dueSoon++;
        }
      }
      for (const [email, counts] of Object.entries(userCounts)) {
        const parts = [];
        if (counts.overdue > 0) parts.push(`${counts.overdue} overdue`);
        if (counts.dueSoon > 0) parts.push(`${counts.dueSoon} due soon`);
        const total = counts.overdue + counts.dueSoon;
        await sendPushNotification(email, {
          title: `${total} task${total > 1 ? 's' : ''} need attention`,
          body: `You have ${parts.join(' and ')}`,
          data: { link: '/alltasks?view=mine_due' },
        });
      }
    } catch (pushErr) {
      console.warn('[DueReminders] Push notification failed:', pushErr.message);
    }
  }

  console.log(`[DueReminders] Sent ${remindersSent} due soon, ${overduesSent} overdue, skipped ${skippedDuplicates} duplicates`);
  return { remindersSent, overduesSent, skippedDuplicates, tasksChecked: activeTasks.length };
}

export default async function handler(req, res) {
  try {
    const result = await runDueReminders();
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('[DueReminders] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
