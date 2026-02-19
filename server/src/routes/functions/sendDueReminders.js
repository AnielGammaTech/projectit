import entityService from '../../services/entityService.js';
import emailService from '../../services/emailService.js';
import sendNotificationEmail from './sendNotificationEmail.js';

export default async function handler(req, res) {
  try {
    console.log('Starting due date reminder check...');

    // Get all tasks with due dates that are not completed
    const allTasks = await entityService.list('Task');
    const activeTasks = allTasks.filter(t =>
      t.due_date &&
      t.status !== 'completed' &&
      t.status !== 'archived' &&
      t.assigned_to
    );

    console.log(`Found ${activeTasks.length} active tasks with due dates and assignments`);

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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let remindersSent = 0;
    let overduesSent = 0;

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
        // Create in-app notification
        await entityService.create('UserNotification', {
          user_email: task.assigned_to,
          type: 'task_due',
          title: 'Task is overdue',
          message: `"${task.title}" was due ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) > 1 ? 's' : ''} ago`,
          project_id: task.project_id,
          project_name: project?.name,
          link: `/ProjectDetail?id=${task.project_id}`,
          is_read: false,
        });

        // Send email if instant notifications enabled
        if (userSettings.email_frequency !== 'daily_digest' && userSettings.email_frequency !== 'weekly_digest') {
          // Create a mock req/res to invoke the sendNotificationEmail handler
          const mockReq = {
            body: {
              to: task.assigned_to,
              type: 'task_overdue',
              title: 'Task is overdue',
              message: `"${task.title}" was due ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) > 1 ? 's' : ''} ago`,
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

        // Create in-app notification
        await entityService.create('UserNotification', {
          user_email: task.assigned_to,
          type: 'task_due',
          title: `Task due ${dueText}`,
          message: `"${task.title}" is due ${dueText}`,
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
              message: `"${task.title}" is due ${dueText}`,
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

    console.log(`Sent ${remindersSent} due soon reminders and ${overduesSent} overdue alerts`);
    return res.json({
      success: true,
      remindersSent,
      overduesSent,
      tasksChecked: activeTasks.length,
    });
  } catch (error) {
    console.error('Due reminder error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
