import entityService from './entityService.js';

/**
 * Validate that a URL is a safe external HTTPS endpoint.
 * Blocks private IPs, localhost, and non-HTTPS protocols to prevent SSRF.
 */
function validateExternalUrl(urlStr, label) {
  let parsed;
  try {
    parsed = new URL(urlStr);
  } catch {
    throw Object.assign(new Error(`Invalid ${label}: not a valid URL`), { status: 400 });
  }

  if (parsed.protocol !== 'https:') {
    throw Object.assign(
      new Error(`Invalid ${label}: must use HTTPS (got ${parsed.protocol})`),
      { status: 400 }
    );
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost and loopback
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]') {
    throw Object.assign(new Error(`Invalid ${label}: localhost not allowed`), { status: 400 });
  }

  // Block cloud metadata endpoints and private IP ranges
  const privatePatterns = [
    /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./,   // RFC 1918
    /^169\.254\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // link-local & CGN
    /^0\./, /^127\./,                                           // loopback
  ];

  if (privatePatterns.some(p => p.test(hostname))) {
    throw Object.assign(new Error(`Invalid ${label}: private/internal addresses not allowed`), { status: 400 });
  }
}

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

  // SSRF protection: ensure URLs are external HTTPS endpoints
  validateExternalUrl(`${authUrl}/auth/token`, 'Auth URL');
  validateExternalUrl(`${apiUrl}/api`, 'API URL');

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
