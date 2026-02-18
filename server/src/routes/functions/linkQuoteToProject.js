import entityService from '../../services/entityService.js';
import emailService from '../../services/emailService.js';

export default async function handler(req, res) {
  try {
    const { quote_id, project_id, project_number } = req.body;

    if (!quote_id || !project_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get settings
    const settings = await entityService.filter('IntegrationSettings', { setting_key: 'main' });
    const config = settings[0];

    if (!config?.quoteit_enabled || !config?.quoteit_api_url || !config?.quoteit_api_key) {
      return res.json({ success: false, error: 'QuoteIT integration not configured' });
    }

    // Clean URL and construct endpoint
    const baseUrl = config.quoteit_api_url.replace(/\/$/, '');
    const url = `${baseUrl}/api/functions/addProjectTag`;

    console.log(`Linking project to quote at: ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-gammastack-key': config.quoteit_api_key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quote_id,
        project_id,
        tag: `Project #${project_number}`,
        tags: [`Project #${project_number}`],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return res.json({
        success: false,
        error: `Failed to link project on QuoteIT (${response.status}): ${text}`,
      });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error('Link project error:', error);
    return res.status(500).json({ error: error.message });
  }
}
