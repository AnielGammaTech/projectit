import entityService from '../../services/entityService.js';
import emailService from '../../services/emailService.js';

export default async function handler(req, res) {
  try {
    // Get API Key from headers
    const apiKey = req.headers['x-projectit-api-key'] || req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({ error: 'Missing API key' });
    }

    // Verify API Key against IntegrationSettings
    const settings = await entityService.filter('IntegrationSettings', { setting_key: 'main' });
    const config = settings[0];

    if (!config || !config.projectit_api_key || config.projectit_api_key !== apiKey) {
      return res.status(403).json({ error: 'Invalid API key' });
    }

    // Fetch Data (Customers, Inventory, and Projects)
    const [customers, inventory, projectsRaw] = await Promise.all([
      entityService.list('Customer'),
      entityService.list('InventoryItem'),
      entityService.list('Project'),
    ]);

    // Map projects to the expected format
    const projects = projectsRaw.map(p => {
      const customer = customers.find(c => c.id === p.customer_id);
      return {
        id: p.id,
        project_number: p.project_number,
        customer_id: p.customer_id || null,
        customer_name: customer?.name || p.client || null,
        name: p.name,
        description: p.description || '',
        status: p.status || 'planning',
        start_date: p.start_date || null,
        due_date: p.due_date || null,
        quoteit_quote_id: p.quoteit_quote_id || null,
      };
    });

    // Return Data
    return res.json({
      success: true,
      data: {
        customers,
        inventory,
        projects,
      },
      meta: {
        customer_count: customers.length,
        inventory_count: inventory.length,
        project_count: projects.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error in getProjectITData:', error);
    return res.status(500).json({ error: error.message });
  }
}
