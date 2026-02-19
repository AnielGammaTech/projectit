import { getHaloPSAConfig, getHaloPSAToken } from '../../services/halopsaService.js';

/**
 * General HaloPSA handler — test connection, get status, etc.
 */
export default async function handler(req, res) {
  try {
    const { action } = req.body || {};

    if (action === 'testConnection') {
      // Verify credentials and connectivity
      const config = await getHaloPSAConfig();
      const accessToken = await getHaloPSAToken(config);

      // Try to fetch a single client to verify API access
      const testResp = await fetch(`${config.apiBaseUrl}/Client?count=1`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!testResp.ok) {
        const errorText = await testResp.text();
        return res.status(502).json({
          success: false,
          error: 'API call failed after successful authentication',
          details: errorText,
        });
      }

      return res.json({
        success: true,
        message: 'Successfully connected to HaloPSA',
        authUrl: config.authUrl,
        apiUrl: config.apiUrl,
      });
    }

    if (action === 'checkEnvStatus') {
      return res.json({
        success: true,
        hasClientSecret: !!process.env.HALOPSA_CLIENT_SECRET,
      });
    }

    return res.json({ success: true, message: 'HaloPSA handler — use action: testConnection, checkEnvStatus' });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      error: error.message,
      details: error.details || error.stack,
    });
  }
}
