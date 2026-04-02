import entityService from '../../services/entityService.js';

export default async function syncJumpCloudEmployees(req, res) {
  const apiKey = process.env.JUMPCLOUD_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: 'JUMPCLOUD_API_KEY not configured' });
  }

  try {
    const response = await fetch('https://console.jumpcloud.com/api/systemusers', {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: `JumpCloud API error: ${text}` });
    }

    const { results: jcUsers } = await response.json();
    const existingEmployees = await entityService.list('Employee');
    const existingByJcId = new Map(
      existingEmployees.map(e => [e.jumpcloud_id, e])
    );

    let created = 0;
    let updated = 0;
    let deactivated = 0;

    const seenJcIds = new Set();

    for (const jcUser of jcUsers) {
      seenJcIds.add(jcUser._id);
      const employeeData = {
        jumpcloud_id: jcUser._id,
        first_name: jcUser.firstname || '',
        last_name: jcUser.lastname || '',
        email: jcUser.email || '',
        department: jcUser.department || '',
        job_title: jcUser.jobTitle || '',
        location: jcUser.location || '',
        status: jcUser.suspended ? 'Suspended' : 'Active',
        last_synced: new Date().toISOString(),
      };

      const existing = existingByJcId.get(jcUser._id);
      if (existing) {
        await entityService.update('Employee', existing.id, employeeData);
        updated++;
      } else {
        await entityService.create('Employee', employeeData);
        created++;
      }
    }

    // Mark employees not in JumpCloud as Inactive
    for (const [jcId, employee] of existingByJcId) {
      if (!seenJcIds.has(jcId) && employee.status !== 'Inactive') {
        await entityService.update('Employee', employee.id, {
          ...employee,
          status: 'Inactive',
          last_synced: new Date().toISOString(),
        });
        deactivated++;
      }
    }

    return res.json({
      success: true,
      summary: { created, updated, deactivated, total: jcUsers.length },
    });
  } catch (error) {
    console.error('JumpCloud sync error:', error);
    return res.status(500).json({ error: 'JumpCloud sync failed' });
  }
}
