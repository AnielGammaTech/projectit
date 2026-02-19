import entityService from './entityService.js';

/**
 * Resolves HaloPSA credentials and URLs from IntegrationSettings (database),
 * falling back to environment variables if not set in DB.
 *
 * Returns: { clientId, clientSecret, tenant, authUrl, apiUrl, settings }
 * Throws if required credentials (clientId + clientSecret) are missing.
 */
export async function getHaloPSAConfig() {
  const settingsArr = await entityService.filter('IntegrationSettings', { setting_key: 'main' });
  const settings = settingsArr[0] || {};

  // Credentials: client_id from DB or env, secret ONLY from env for security
  const clientId = settings.halopsa_client_id || process.env.HALOPSA_CLIENT_ID;
  const clientSecret = process.env.HALOPSA_CLIENT_SECRET;
  const tenant = settings.halopsa_tenant || process.env.HALOPSA_TENANT;

  if (!clientId || !clientSecret) {
    const err = new Error('HaloPSA credentials not configured.');
    err.status = 400;
    err.details = !clientSecret
      ? 'The HALOPSA_CLIENT_SECRET environment variable is not set on the server. Please add it to your Railway environment variables.'
      : 'Please configure your HaloPSA Client ID in Adminland → Integrations.';
    throw err;
  }

  // URLs from DB
  let authUrl = settings.halopsa_auth_url;
  let apiUrl = settings.halopsa_api_url;

  if (!authUrl || !apiUrl) {
    const err = new Error('HaloPSA URLs not configured.');
    err.status = 400;
    err.details = 'Please configure the HaloPSA Authorisation Server URL and Resource Server URL in Adminland → Integrations.';
    throw err;
  }

  // Normalize URLs — strip trailing slashes and /auth/ or /api/ suffixes
  authUrl = authUrl.replace(/\/+$/, '').replace(/\/auth\/?$/, '').replace(/\/api\/?$/, '');
  apiUrl = apiUrl.replace(/\/+$/, '').replace(/\/api\/?$/, '');

  return {
    clientId,
    clientSecret,
    tenant,
    authUrl,
    apiUrl,
    tokenUrl: `${authUrl}/auth/token`,
    apiBaseUrl: `${apiUrl}/api`,
    settings,
  };
}

/**
 * Obtains a HaloPSA access token using client_credentials flow.
 */
export async function getHaloPSAToken(config) {
  const { clientId, clientSecret, tenant, tokenUrl } = config || await getHaloPSAConfig();

  const tokenBody = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'all',
  });

  if (tenant) {
    tokenBody.append('tenant', tenant);
  }

  const tokenRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenBody.toString(),
  });

  if (!tokenRes.ok) {
    const errorText = await tokenRes.text();
    const err = new Error('Failed to authenticate with HaloPSA');
    err.status = 502;
    err.details = `Token request failed (${tokenRes.status}): ${errorText}`;
    throw err;
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

export default { getHaloPSAConfig, getHaloPSAToken };
