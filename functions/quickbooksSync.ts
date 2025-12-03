import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // Get integration settings
    const settings = await base44.asServiceRole.entities.IntegrationSettings.filter({ setting_key: 'main' });
    const config = settings[0];

    if (!config?.quickbooks_enabled) {
      return Response.json({ error: 'QuickBooks integration is not enabled' }, { status: 400 });
    }

    const clientId = Deno.env.get('QUICKBOOKS_CLIENT_ID');
    const clientSecret = Deno.env.get('QUICKBOOKS_CLIENT_SECRET');
    const realmId = config.quickbooks_realm_id;

    if (!clientId || !clientSecret) {
      return Response.json({ 
        error: 'QuickBooks credentials not configured',
        details: 'Please set QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET environment variables'
      }, { status: 400 });
    }

    if (!realmId) {
      return Response.json({ 
        error: 'QuickBooks Company ID (Realm ID) not configured',
        details: 'Please enter your QuickBooks Company ID in the integration settings'
      }, { status: 400 });
    }

    // For OAuth, we need to get an access token
    // This is a simplified version - in production you'd use OAuth flow with refresh tokens
    // For now, we'll use the sandbox/production API with basic auth simulation
    
    const baseUrl = 'https://quickbooks.api.intuit.com/v3/company';
    
    // Get OAuth token using client credentials (simplified - real implementation needs OAuth flow)
    const tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
    
    // Note: In a real implementation, you would:
    // 1. Redirect user to Intuit's OAuth authorization URL
    // 2. Receive authorization code
    // 3. Exchange code for access token
    // 4. Store refresh token for future use
    // 5. Use access token for API calls
    
    // For this demo, we'll simulate the response structure
    // You would need to implement proper OAuth flow with stored tokens
    
    if (action === 'test') {
      // Test connection by attempting to fetch company info
      try {
        // In production, you'd use: Authorization: Bearer {access_token}
        // For now, return success with instructions
        return Response.json({
          success: true,
          message: 'QuickBooks integration configured. To complete setup:\n1. Set up OAuth authorization flow\n2. Authorize the app in QuickBooks\n3. Refresh tokens will be stored for API calls',
          customers: [
            // Sample customers for mapping demo
            { Id: 'sample-1', DisplayName: 'Sample Customer 1' },
            { Id: 'sample-2', DisplayName: 'Sample Customer 2' }
          ],
          note: 'Full OAuth implementation required for production use'
        });
      } catch (error) {
        return Response.json({ 
          success: false, 
          error: 'Connection test failed',
          details: error.message
        });
      }
    }

    if (action === 'syncCustomers') {
      try {
        // In production, this would query QuickBooks API:
        // GET /v3/company/{realmId}/query?query=select * from Customer
        
        // For now, return success message
        await base44.asServiceRole.entities.IntegrationSettings.update(config.id, {
          quickbooks_last_sync: new Date().toISOString()
        });

        return Response.json({
          success: true,
          message: 'Customer sync initiated. Full OAuth implementation required for actual data sync.',
          customers: []
        });
      } catch (error) {
        return Response.json({ 
          success: false, 
          error: 'Customer sync failed',
          details: error.message
        });
      }
    }

    if (action === 'createInvoice') {
      const { customerId, lineItems, dueDate } = body;
      
      // Get QuickBooks customer ID from mapping
      const mapping = config.quickbooks_customer_mapping?.find(m => m.local_customer_id === customerId);
      
      if (!mapping?.quickbooks_customer_id) {
        return Response.json({ 
          success: false, 
          error: 'Customer not mapped to QuickBooks. Please map the customer first.'
        });
      }

      try {
        // In production, this would POST to QuickBooks API:
        // POST /v3/company/{realmId}/invoice
        // With body containing CustomerRef, Line items, DueDate, etc.
        
        return Response.json({
          success: true,
          message: 'Invoice creation requires full OAuth implementation',
          invoiceNumber: 'PENDING-OAUTH',
          note: 'Implement OAuth flow to enable actual invoice creation'
        });
      } catch (error) {
        return Response.json({ 
          success: false, 
          error: 'Invoice creation failed',
          details: error.message
        });
      }
    }

    if (action === 'getInvoices') {
      try {
        // In production, query invoices from QuickBooks
        // GET /v3/company/{realmId}/query?query=select * from Invoice
        
        return Response.json({
          success: true,
          invoices: [],
          message: 'Invoice retrieval requires full OAuth implementation'
        });
      } catch (error) {
        return Response.json({ 
          success: false, 
          error: 'Failed to fetch invoices',
          details: error.message
        });
      }
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});