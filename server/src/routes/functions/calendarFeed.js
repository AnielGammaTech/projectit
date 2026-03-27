import entityService from '../../services/entityService.js';

function escapeIcs(text) {
  return (text || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export default async function calendarFeed(req, res) {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).send('Missing user ID');
    }

    // Look up the team member by ID
    const userData = await entityService.get('TeamMember', userId);
    if (!userData) {
      return res.status(404).send('User not found');
    }

    // Get all tasks and filter to this user's assignments with due dates
    const allTasks = await entityService.list('Task');
    const tasks = allTasks.filter(
      (t) =>
        t.assigned_to === userData.email &&
        t.due_date &&
        t.status !== 'archived'
    );

    // Get all projects with due dates (exclude archived/deleted)
    const allProjects = await entityService.list('Project');
    const projects = allProjects.filter(
      (p) =>
        p.due_date &&
        p.status !== 'archived' &&
        p.status !== 'deleted'
    );

    // Build ICS content
    const now = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .split('.')[0] + 'Z';

    const icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ProjectIT//Schedule Feed//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:ProjectIT - ${escapeIcs(userData.name || userData.email)}`,
    ];

    for (const task of tasks) {
      const dueDate = task.due_date.replace(/-/g, '');
      icsLines.push(
        'BEGIN:VEVENT',
        `UID:task-${task.id}@projectit`,
        `DTSTART;VALUE=DATE:${dueDate}`,
        `DTEND;VALUE=DATE:${dueDate}`,
        `SUMMARY:${escapeIcs(task.title)}`,
        `DESCRIPTION:${escapeIcs(task.description || '')}`,
        `STATUS:${task.status === 'completed' ? 'COMPLETED' : 'CONFIRMED'}`,
        `DTSTAMP:${now}`,
        'END:VEVENT'
      );
    }

    for (const project of projects) {
      const dueDate = project.due_date.replace(/-/g, '');
      icsLines.push(
        'BEGIN:VEVENT',
        `UID:project-${project.id}@projectit`,
        `DTSTART;VALUE=DATE:${dueDate}`,
        `DTEND;VALUE=DATE:${dueDate}`,
        `SUMMARY:[Project] ${escapeIcs(project.name)}`,
        `DESCRIPTION:${escapeIcs(project.description || '')}`,
        `STATUS:${project.status === 'completed' ? 'COMPLETED' : 'CONFIRMED'}`,
        `DTSTAMP:${now}`,
        'END:VEVENT'
      );
    }

    icsLines.push('END:VCALENDAR');

    res.set({
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="projectit-schedule.ics"',
    });
    res.send(icsLines.join('\r\n'));
  } catch (err) {
    console.error('Calendar feed error:', err);
    res.status(500).send('Error generating calendar feed');
  }
}
