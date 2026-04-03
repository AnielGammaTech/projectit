import entityService from '../../services/entityService.js';

export default async function syncJumpCloudEmployees(req, res) {
  // Load settings from IntegrationSettings entity
  const settingsList = await entityService.list('IntegrationSettings');
  const settings = settingsList.find(s => s.setting_key === 'main') || {};

  const apiKey = settings.jumpcloud_api_key || process.env.JUMPCLOUD_API_KEY;
  const orgId = settings.jumpcloud_org_id || process.env.JUMPCLOUD_ORG_ID || '';

  if (!apiKey) {
    return res.status(400).json({ error: 'JumpCloud API key not configured. Go to Adminland → Integrations → JumpCloud to set it up.' });
  }

  try {
    const headers = {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (orgId) {
      headers['x-org-id'] = orgId;
    }

    // JumpCloud API v1 — paginate through all system users
    let allUsers = [];
    let skip = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const url = `https://console.jumpcloud.com/api/systemusers?limit=${limit}&skip=${skip}`;
      const response = await fetch(url, { headers });

      if (!response.ok) {
        const text = await response.text();
        console.error('[JumpCloud] API error:', response.status, text);
        return res.status(response.status).json({ error: `JumpCloud API error: ${text}` });
      }

      const json = await response.json();

      // JumpCloud returns { results: [...], totalCount: N } or just an array
      const users = json.results || json;
      const total = json.totalCount || 0;

      if (!Array.isArray(users)) {
        console.error('[JumpCloud] Unexpected response format:', JSON.stringify(json).slice(0, 500));
        return res.status(500).json({ error: 'Unexpected JumpCloud API response format' });
      }

      allUsers = [...allUsers, ...users];
      skip += limit;
      hasMore = json.results ? allUsers.length < total : users.length === limit;
    }

    console.log(`[JumpCloud] Fetched ${allUsers.length} users`);

    const existingEmployees = await entityService.list('Employee');
    const existingByJcId = new Map(
      existingEmployees.map(e => [e.jumpcloud_id, e])
    );

    let created = 0;
    let updated = 0;
    let deactivated = 0;

    const seenJcIds = new Set();

    for (const jcUser of allUsers) {
      const userId = jcUser._id || jcUser.id;
      if (!userId) continue;

      seenJcIds.add(userId);
      const employeeData = {
        jumpcloud_id: userId,
        first_name: jcUser.firstname || jcUser.firstName || '',
        last_name: jcUser.lastname || jcUser.lastName || '',
        email: jcUser.email || '',
        department: jcUser.department || '',
        job_title: jcUser.jobTitle || jcUser.job_title || '',
        location: jcUser.location || '',
        status: jcUser.suspended ? 'Suspended' : (jcUser.activated === false ? 'Inactive' : 'Active'),
        last_synced: new Date().toISOString(),
      };

      const existing = existingByJcId.get(userId);
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
      summary: { created, updated, deactivated, total: allUsers.length },
    });
  } catch (error) {
    console.error('[JumpCloud] Sync error:', error);
    return res.status(500).json({ error: `JumpCloud sync failed: ${error.message}` });
  }
}
