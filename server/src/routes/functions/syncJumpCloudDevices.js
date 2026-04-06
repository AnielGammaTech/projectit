import entityService from '../../services/entityService.js';

export default async function syncJumpCloudDevices(req, res) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

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

    // 1. Fetch all systems (devices) from JumpCloud
    let allSystems = [];
    let skip = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const url = `https://console.jumpcloud.com/api/systems?limit=${limit}&skip=${skip}`;
      const response = await fetch(url, { headers });

      if (!response.ok) {
        const text = await response.text();
        console.error('[JumpCloud Devices] API error:', response.status, text);
        return res.status(response.status).json({ error: `JumpCloud API error: ${text}` });
      }

      const json = await response.json();
      const systems = json.results || json;
      const total = json.totalCount || 0;

      if (!Array.isArray(systems)) {
        console.error('[JumpCloud Devices] Unexpected response:', JSON.stringify(json).slice(0, 500));
        return res.status(500).json({ error: 'Unexpected JumpCloud API response format' });
      }

      allSystems = [...allSystems, ...systems];
      skip += limit;
      hasMore = json.results ? allSystems.length < total : systems.length === limit;
    }

    console.log(`[JumpCloud Devices] Fetched ${allSystems.length} systems`);

    // 2. For each system, fetch user bindings
    const systemUserMap = new Map();
    for (const system of allSystems) {
      const sysId = system._id || system.id;
      if (!sysId) continue;

      try {
        const assocUrl = `https://console.jumpcloud.com/api/v2/systems/${sysId}/associations?targets=user`;
        const assocRes = await fetch(assocUrl, { headers });
        if (assocRes.ok) {
          const associations = await assocRes.json();
          const userIds = associations
            .filter(a => a.to?.type === 'user')
            .map(a => a.to.id);
          if (userIds.length > 0) {
            systemUserMap.set(sysId, userIds[0]); // primary user = first binding
          }
        }
      } catch {
        // Skip association errors for individual systems
      }
    }

    // 3. Load existing assets and employees
    const existingAssets = await entityService.list('Asset');
    const existingByJcId = new Map(
      existingAssets.filter(a => a.jumpcloud_system_id).map(a => [a.jumpcloud_system_id, a])
    );

    const existingEmployees = await entityService.list('Employee');
    const employeeByJcId = new Map(
      existingEmployees.filter(e => e.jumpcloud_id).map(e => [e.jumpcloud_id, e])
    );

    const existingAssignments = await entityService.list('AssetAssignment');

    let created = 0;
    let updated = 0;
    let autoAssigned = 0;

    for (const system of allSystems) {
      const sysId = system._id || system.id;
      if (!sysId) continue;

      // Determine asset type from OS
      const osFamily = (system.osFamily || '').toLowerCase();
      const os = system.os || '';
      let assetType = 'IT Equipment';
      if (osFamily === 'ios' || osFamily === 'android' || os.toLowerCase().includes('ios')) {
        assetType = 'Mobile Device';
      }

      // Extract primary IPv4 from networkInterfaces
      const ipv4 = (system.networkInterfaces || [])
        .find(ni => ni.family === 'IPv4' && !ni.internal)?.address || '';

      const assetData = {
        jumpcloud_system_id: sysId,
        name: system.displayName || system.hostname || sysId,
        type: assetType,
        serial_number: system.serialNumber || '',
        manufacturer: system.systemInfo?.manufacturer || '',
        model: system.systemInfo?.model || '',
        hostname: system.hostname || '',
        mac_address: system.macAddress || '',
        ip_address: ipv4,
        os: os || '',
        os_version: system.version || '',
        agent_version: system.agentVersion || '',
        last_contact: system.lastContact || null,
        device_active: system.active ?? null,
        condition: 'Good',
        last_synced: new Date().toISOString(),
      };

      const existing = existingByJcId.get(sysId);
      let assetId;

      if (existing) {
        await entityService.update('Asset', existing.id, assetData);
        assetId = existing.id;
        updated++;
      } else {
        const newAsset = await entityService.create('Asset', assetData, req.user?.email);
        assetId = newAsset.id;
        created++;
      }

      // 4. Auto-assign if JumpCloud has a user binding, asset not locked, and no active assignment
      const isLocked = existing?.sync_locked || assetData.sync_locked;
      const boundUserId = systemUserMap.get(sysId);
      if (boundUserId && !isLocked) {
        const employee = employeeByJcId.get(boundUserId);
        if (employee) {
          const hasActive = existingAssignments.some(
            a => a.asset_id === assetId && !a.returned_date
          );
          if (!hasActive) {
            await entityService.create('AssetAssignment', {
              asset_id: assetId,
              employee_id: employee.id,
              assigned_date: new Date().toISOString().split('T')[0],
              condition_at_checkout: 'Good',
              notes: 'Auto-assigned from JumpCloud device binding',
            }, req.user?.email);
            autoAssigned++;
          }
        }
      }
    }

    return res.json({
      success: true,
      summary: { created, updated, autoAssigned, total: allSystems.length },
    });
  } catch (error) {
    console.error('[JumpCloud Devices] Sync error:', error);
    return res.status(500).json({ error: `JumpCloud device sync failed: ${error.message}` });
  }
}
