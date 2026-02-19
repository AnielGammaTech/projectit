import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin access
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    console.log('Starting due date reminder check...');

    // Get all projects for context and build active project filter
    const allProjects = await base44.asServiceRole.entities.Project.list();
    const projectMap = {};
    allProjects.forEach(p => { projectMap[p.id] = p; });
    const activeProjectIds = new Set(
      allProjects
        .filter(p => p.status !== 'archived' && p.status !== 'deleted' && p.status !== 'completed')
        .map(p => p.id)
    );

    // Get all tasks with due dates that are not completed, only from active projects
    const allTasks = await base44.asServiceRole.entities.Task.list();
    const activeTasks = allTasks.filter(t =>
      t.due_date &&
      t.status !== 'completed' &&
      t.status !== 'archived' &&
      t.assigned_to &&
      activeProjectIds.has(t.project_id)
    );

    console.log(`Found ${activeTasks.length} active tasks with due dates and assignments`);

    // Get all user notification settings
    const allSettings = await base44.asServiceRole.entities.NotificationSettings.list();
    const settingsMap = {};
    allSettings.forEach(s => { settingsMap[s.user_email] = s; });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let remindersSent = 0;
    let overduesSent = 0;

    for (const task of activeTasks) {
      const dueDate = new Date(task.due_date);
      dueDate.setHours(0, 0, 0, 0);
      
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      const userSettings = settingsMap[task.assigned_to] || {};
      const reminderDays = userSettings.due_reminder_days ?? 1;
      const project = projectMap[task.project_id];

      // Check for overdue tasks
      if (daysUntilDue < 0 && userSettings.notify_task_overdue !== false) {
        // Create in-app notification
        await base44.asServiceRole.entities.UserNotification.create({
          user_email: task.assigned_to,
          type: 'task_due',
          title: 'Task is overdue',
          message: `"${task.title}" was due ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) > 1 ? 's' : ''} ago`,
          project_id: task.project_id,
          project_name: project?.name,
          link: `/ProjectDetail?id=${task.project_id}`,
          is_read: false
        });

        // Send email if instant notifications enabled
        if (userSettings.email_frequency !== 'daily_digest' && userSettings.email_frequency !== 'weekly_digest') {
          await base44.asServiceRole.functions.invoke('sendNotificationEmail', {
            to: task.assigned_to,
            type: 'task_overdue',
            title: 'Task is overdue',
            message: `"${task.title}" was due ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) > 1 ? 's' : ''} ago`,
            projectId: task.project_id,
            projectName: project?.name,
            link: `/ProjectDetail?id=${task.project_id}`
          });
        }
        overduesSent++;
      }
      // Check for tasks due soon (based on user's reminder preference)
      else if (daysUntilDue >= 0 && daysUntilDue <= reminderDays && userSettings.notify_task_due_soon !== false) {
        const dueText = daysUntilDue === 0 ? 'today' : daysUntilDue === 1 ? 'tomorrow' : `in ${daysUntilDue} days`;
        
        // Create in-app notification
        await base44.asServiceRole.entities.UserNotification.create({
          user_email: task.assigned_to,
          type: 'task_due',
          title: `Task due ${dueText}`,
          message: `"${task.title}" is due ${dueText}`,
          project_id: task.project_id,
          project_name: project?.name,
          link: `/ProjectDetail?id=${task.project_id}`,
          is_read: false
        });

        // Send email if instant notifications enabled
        if (userSettings.email_frequency !== 'daily_digest' && userSettings.email_frequency !== 'weekly_digest') {
          await base44.asServiceRole.functions.invoke('sendNotificationEmail', {
            to: task.assigned_to,
            type: 'task_due',
            title: `Task due ${dueText}`,
            message: `"${task.title}" is due ${dueText}`,
            projectId: task.project_id,
            projectName: project?.name,
            link: `/ProjectDetail?id=${task.project_id}`
          });
        }
        remindersSent++;
      }
    }

    console.log(`Sent ${remindersSent} due soon reminders and ${overduesSent} overdue alerts`);
    return Response.json({ 
      success: true, 
      remindersSent, 
      overduesSent,
      tasksChecked: activeTasks.length 
    });

  } catch (error) {
    console.error('Due reminder error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});