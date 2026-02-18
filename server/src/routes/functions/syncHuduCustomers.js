import entityService from '../../services/entityService.js';
import emailService from '../../services/emailService.js';

export default async function handler(req, res) {
  try {
    const body = req.body || {};
    const testOnly = body.testOnly || false;

    // Get integration settings
    const settings = await entityService.filter('IntegrationSettings', { setting_key: 'main' });
    const config = settings[0];

    if (!config?.hudu_enabled) {
      return res.status(400).json({ error: 'Hudu integration is not enabled' });
    }

    const huduBaseUrl = config.hudu_base_url;
    const huduApiKey = config.hudu_api_key;

    if (!huduBaseUrl || !huduApiKey) {
      return res.status(400).json({
        error: 'Missing Hudu configuration',
        details: 'Please configure Hudu Base URL and API Key in Adminland > Integrations',
      });
    }

    // Clean up the base URL
    const baseUrl = huduBaseUrl.replace(/\/$/, '');

    // Field mapping with defaults
    const fieldMapping = config.hudu_field_mapping || {
      name: 'name',
      email: 'email',
      phone: 'phone_number',
      address: 'address_line_1',
      city: 'city',
      state: 'state',
      zip: 'zip',
    };

    // Fetch ALL companies from Hudu with pagination
    let allCompanies = [];
    let page = 1;
    const perPage = 100;
    let hasMore = true;

    while (hasMore) {
      const companiesResponse = await fetch(`${baseUrl}/api/v1/companies?page=${page}&per_page=${perPage}`, {
        headers: {
          'x-api-key': huduApiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!companiesResponse.ok) {
        const errorText = await companiesResponse.text();
        return res.status(400).json({
          success: false,
          error: 'Failed to connect to Hudu API',
          details: `Status: ${companiesResponse.status} - ${errorText}`,
        });
      }

      const companiesData = await companiesResponse.json();
      const companies = companiesData.companies || [];

      if (companies.length > 0) {
        allCompanies = allCompanies.concat(companies);
        page++;
        if (page > 50) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    const companies = allCompanies;

    if (testOnly) {
      return res.json({
        success: true,
        message: `Connection successful! Found ${companies.length} companies in Hudu.`,
        total: companies.length,
      });
    }

    // Get existing customers
    const existingCustomers = await entityService.list('Customer');
    const existingByExternalId = {};
    const existingByEmail = {};
    const existingByName = {};

    existingCustomers.forEach(c => {
      if (c.external_id) existingByExternalId[c.external_id] = c;
      if (c.email) existingByEmail[c.email.toLowerCase().trim()] = c;
      if (c.name) existingByName[c.name.toLowerCase().trim()] = c;
    });

    let created = 0;
    let updated = 0;
    let matched = 0;

    for (const company of companies) {
      const externalId = `hudu_${company.id}`;
      let existing = existingByExternalId[externalId];
      let wasMatched = false;

      const companyName = company[fieldMapping.name] || company.name || '';
      const companyEmail = company[fieldMapping.email] || '';

      if (!existing && companyEmail) {
        const emailKey = companyEmail.toLowerCase().trim();
        if (existingByEmail[emailKey]) {
          existing = existingByEmail[emailKey];
          wasMatched = true;
        }
      }

      if (!existing && companyName) {
        const nameKey = companyName.toLowerCase().trim();
        if (existingByName[nameKey]) {
          existing = existingByName[nameKey];
          wasMatched = true;
        }
      }

      if (wasMatched) matched++;

      const customerData = {
        name: companyName || 'Unknown Company',
        email: companyEmail,
        phone: company[fieldMapping.phone] || '',
        company: companyName,
        address: company[fieldMapping.address] || '',
        city: company[fieldMapping.city] || '',
        state: company[fieldMapping.state] || '',
        zip: company[fieldMapping.zip] || '',
        is_company: true,
        source: 'hudu',
        external_id: externalId,
        notes: company.notes || '',
      };

      if (existing) {
        await entityService.update('Customer', existing.id, customerData);
        updated++;
      } else {
        await entityService.create('Customer', customerData);
        created++;
      }
    }

    // Update last sync time
    await entityService.update('IntegrationSettings', config.id, {
      hudu_last_sync: new Date().toISOString(),
    });

    return res.json({
      success: true,
      message: `Sync completed! Created: ${created}, Updated: ${updated}, Matched existing: ${matched}`,
      created,
      updated,
      matched,
      total: companies.length,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      details: error.stack,
    });
  }
}
