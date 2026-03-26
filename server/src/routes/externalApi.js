import { Router } from 'express';
import entityService from '../services/entityService.js';
import crypto from 'crypto';

const router = Router();

/**
 * Middleware: Validate external API key from x-projectit-api-key header.
 * Keys are stored in the ApiKey entity.
 */
async function validateApiKey(req, res, next) {
  const apiKey = req.headers['x-projectit-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'Missing API key. Include x-projectit-api-key header.' });
  }

  try {
    // Hash the key for comparison (keys are stored hashed)
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
    const keys = await entityService.filter('ApiKey', { key_hash: hashedKey, is_active: true });

    if (!keys || keys.length === 0) {
      return res.status(401).json({ error: 'Invalid or inactive API key.' });
    }

    // Update last used timestamp
    const keyRecord = keys[0];
    await entityService.update('ApiKey', keyRecord.id, {
      last_used_at: new Date().toISOString(),
      usage_count: (keyRecord.usage_count || 0) + 1,
    });

    req.apiKeyRecord = keyRecord;
    next();
  } catch (err) {
    console.error('API key validation error:', err);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

// Apply API key validation to all routes
router.use(validateApiKey);

// ─── INBOUND: QuoteIT pushes accepted quotes ─────────────────────────

/**
 * POST /api/external/quotes/accepted
 * Called by QuoteIT when a customer accepts a quote.
 * Creates an IncomingQuote record and optionally auto-creates a project.
 *
 * Body:
 * {
 *   quote_id: string,
 *   title: string,
 *   customer_name: string,
 *   customer_email?: string,
 *   customer_id?: string,
 *   amount: number,
 *   items: [{ name, description, quantity, unit_price }],
 *   accepted_at?: string (ISO date),
 *   metadata?: object
 * }
 */
router.post('/quotes/accepted', async (req, res) => {
  try {
    const {
      quote_id, title, customer_name, customer_email,
      customer_id, amount, items, accepted_at, metadata
    } = req.body;

    if (!quote_id || !title) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['quote_id', 'title'],
      });
    }

    // Check for duplicate
    const existing = await entityService.filter('IncomingQuote', { quoteit_id: String(quote_id) });
    if (existing.length > 0) {
      return res.status(409).json({
        error: 'Quote already received',
        incoming_quote_id: existing[0].id,
        status: existing[0].status,
      });
    }

    // Check if a project was already created from this quote
    const existingProjects = await entityService.filter('Project', { quoteit_quote_id: String(quote_id) });
    if (existingProjects.length > 0) {
      return res.status(409).json({
        error: 'Project already exists for this quote',
        project_id: existingProjects[0].id,
        project_number: existingProjects[0].project_number,
      });
    }

    // Create incoming quote
    const incomingQuote = await entityService.create('IncomingQuote', {
      quoteit_id: String(quote_id),
      title,
      customer_name: customer_name || '',
      customer_email: customer_email || '',
      customer_id: customer_id || '',
      amount: amount || 0,
      items: items || [],
      received_date: new Date().toISOString(),
      accepted_at: accepted_at || new Date().toISOString(),
      status: 'pending',
      raw_data: { ...req.body, metadata },
    });

    // Log the event
    await entityService.create('AuditLog', {
      action: 'quote_received',
      entity_type: 'IncomingQuote',
      entity_id: incomingQuote.id,
      details: `Accepted quote "${title}" received from QuoteIT (${quote_id})`,
      user_email: 'api@quoteit',
      user_name: 'QuoteIT API',
    });

    return res.status(201).json({
      success: true,
      incoming_quote_id: incomingQuote.id,
      status: 'pending',
      message: 'Quote received and pending project creation',
    });
  } catch (err) {
    console.error('Quote accepted endpoint error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ─── OUTBOUND: QuoteIT pulls project data ────────────────────────────

/**
 * GET /api/external/projects
 * List all projects. Supports filters via query params.
 *
 * Query params:
 *   customer_name - Filter by customer name (partial match)
 *   customer_id - Filter by customer ID
 *   status - Filter by project status
 *   quote_id - Filter by linked QuoteIT quote ID
 *   limit - Max results (default 50)
 *   sort - Sort field (default -created_date)
 */
router.get('/projects', async (req, res) => {
  try {
    const { customer_name, customer_id, status, quote_id, limit, sort } = req.query;

    let projects;
    const filter = {};

    if (customer_id) filter.customer_id = customer_id;
    if (status) filter.status = status;
    if (quote_id) filter.quoteit_quote_id = String(quote_id);

    if (Object.keys(filter).length > 0) {
      projects = await entityService.filter('Project', filter, sort || '-created_date', limit ? parseInt(limit) : 50);
    } else {
      projects = await entityService.list('Project', sort || '-created_date', limit ? parseInt(limit) : 50);
    }

    // Filter by customer_name client-side (partial match)
    if (customer_name) {
      const q = customer_name.toLowerCase();
      projects = projects.filter(p =>
        p.customer_name?.toLowerCase().includes(q) ||
        p.customer?.toLowerCase().includes(q)
      );
    }

    // Return sanitized project data
    const sanitized = projects.map(p => ({
      id: p.id,
      project_number: p.project_number,
      name: p.name,
      description: p.description || '',
      status: p.status,
      customer_name: p.customer_name || p.customer || '',
      customer_id: p.customer_id || '',
      quoteit_quote_id: p.quoteit_quote_id || null,
      created_date: p.created_date,
      updated_date: p.updated_date,
      start_date: p.start_date || null,
      due_date: p.due_date || null,
      progress: p.progress || 0,
    }));

    return res.json({
      success: true,
      count: sanitized.length,
      projects: sanitized,
    });
  } catch (err) {
    console.error('Projects list endpoint error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/external/projects/:id
 * Get a single project by ID with tasks and parts summary.
 */
router.get('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Try by UUID first
    let project;
    try {
      const projects = await entityService.filter('Project', { id });
      project = projects[0];
    } catch {
      // Try by project_number
      const projects = await entityService.filter('Project', { project_number: parseInt(id) });
      project = projects[0];
    }

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get tasks and parts counts
    const tasks = await entityService.filter('Task', { project_id: project.id });
    const parts = await entityService.filter('Part', { project_id: project.id });

    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const installedParts = parts.filter(p => p.status === 'installed').length;

    return res.json({
      success: true,
      project: {
        id: project.id,
        project_number: project.project_number,
        name: project.name,
        description: project.description || '',
        status: project.status,
        customer_name: project.customer_name || project.customer || '',
        customer_id: project.customer_id || '',
        quoteit_quote_id: project.quoteit_quote_id || null,
        created_date: project.created_date,
        updated_date: project.updated_date,
        start_date: project.start_date || null,
        due_date: project.due_date || null,
        progress: project.progress || 0,
        tasks_total: tasks.length,
        tasks_completed: completedTasks,
        parts_total: parts.length,
        parts_installed: installedParts,
      },
    });
  } catch (err) {
    console.error('Project detail endpoint error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/external/projects/by-quote/:quoteId
 * Get project linked to a specific QuoteIT quote.
 */
router.get('/projects/by-quote/:quoteId', async (req, res) => {
  try {
    const { quoteId } = req.params;
    const projects = await entityService.filter('Project', { quoteit_quote_id: String(quoteId) });

    if (projects.length === 0) {
      return res.status(404).json({ error: 'No project found for this quote', quote_id: quoteId });
    }

    const project = projects[0];
    return res.json({
      success: true,
      project: {
        id: project.id,
        project_number: project.project_number,
        name: project.name,
        status: project.status,
        customer_name: project.customer_name || project.customer || '',
        progress: project.progress || 0,
        created_date: project.created_date,
        updated_date: project.updated_date,
      },
    });
  } catch (err) {
    console.error('Project by quote endpoint error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/external/customers
 * List all customers from projects (unique customer names).
 */
router.get('/customers', async (req, res) => {
  try {
    const projects = await entityService.list('Project');

    const customerMap = new Map();
    for (const p of projects) {
      const name = p.customer_name || p.customer;
      if (!name) continue;
      if (!customerMap.has(name)) {
        customerMap.set(name, {
          name,
          customer_id: p.customer_id || '',
          project_count: 0,
          active_projects: 0,
        });
      }
      const entry = customerMap.get(name);
      entry.project_count++;
      if (p.status !== 'archived' && p.status !== 'completed' && p.status !== 'deleted') {
        entry.active_projects++;
      }
    }

    const customers = Array.from(customerMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    return res.json({
      success: true,
      count: customers.length,
      customers,
    });
  } catch (err) {
    console.error('Customers list endpoint error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/external/quotes/pending
 * List all pending incoming quotes (not yet converted to projects).
 */
router.get('/quotes/pending', async (req, res) => {
  try {
    const quotes = await entityService.filter('IncomingQuote', { status: 'pending' });

    return res.json({
      success: true,
      count: quotes.length,
      quotes: quotes.map(q => ({
        id: q.id,
        quoteit_id: q.quoteit_id,
        title: q.title,
        customer_name: q.customer_name,
        amount: q.amount,
        received_date: q.received_date,
        status: q.status,
      })),
    });
  } catch (err) {
    console.error('Pending quotes endpoint error:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
