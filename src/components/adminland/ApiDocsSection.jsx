import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Globe, Key, Copy, Check, Plus, Trash2, Eye, EyeOff,
  ChevronDown, ChevronRight, ArrowRight, Shield, Clock,
  FileText, Code, Zap, AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

function generateApiKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const prefix = 'pit_';
  let key = prefix;
  for (let i = 0; i < 40; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

function hashKeyForDisplay(key) {
  return key.slice(0, 8) + '...' + key.slice(-4);
}

async function sha256Hash(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── API Keys Management ───────────────────────────────────────────
function ApiKeysManager() {
  const queryClient = useQueryClient();
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: apiKeys = [] } = useQuery({
    queryKey: ['apiKeys'],
    queryFn: () => api.entities.ApiKey.list('-created_date'),
  });

  const createKey = useMutation({
    mutationFn: async (name) => {
      const rawKey = generateApiKey();
      const hashedKey = await sha256Hash(rawKey);
      await api.entities.ApiKey.create({
        name,
        key_prefix: rawKey.slice(0, 12),
        key_hash: hashedKey,
        is_active: true,
        usage_count: 0,
        created_by: 'admin',
      });
      return rawKey;
    },
    onSuccess: (rawKey) => {
      setGeneratedKey(rawKey);
      setNewKeyName('');
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      toast.success('API key created');
    },
  });

  const deleteKey = useMutation({
    mutationFn: (id) => api.entities.ApiKey.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      toast.success('API key deleted');
      setDeleteConfirm(null);
    },
  });

  const toggleKey = useMutation({
    mutationFn: (key) => api.entities.ApiKey.update(key.id, { is_active: !key.is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
    },
  });

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Key className="w-4 h-4 text-amber-500" />
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">API Keys</h3>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Create API keys for external applications to authenticate with ProjectIT.
      </p>

      {/* Generated key alert */}
      {generatedKey && (
        <div className="p-4 rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Save this key now — it won't be shown again</p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">Copy it and store it securely in your QuoteIT configuration.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <code className="flex-1 text-xs font-mono bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800 break-all">
              {generatedKey}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(generatedKey)}
              className="shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setGeneratedKey(null)}
            className="mt-2 text-xs text-amber-700 dark:text-amber-300"
          >
            I've saved it, dismiss
          </Button>
        </div>
      )}

      {/* Create new key */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Key name (e.g., QuoteIT Production)"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          className="h-9 text-sm bg-white dark:bg-[#151d2b] border-slate-200 dark:border-slate-700/50"
        />
        <Button
          size="sm"
          onClick={() => createKey.mutate(newKeyName || 'Unnamed Key')}
          disabled={createKey.isPending}
          className="bg-[#0069AF] hover:bg-[#133F5C] h-9 shrink-0"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Create Key
        </Button>
      </div>

      {/* Key list */}
      <div className="space-y-2">
        {apiKeys.map((key) => (
          <div
            key={key.id}
            className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-[#151d2b]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn("p-1.5 rounded-lg", key.is_active ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-slate-200 dark:bg-slate-700")}>
                <Key className={cn("w-3.5 h-3.5", key.is_active ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400")} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{key.name}</p>
                  <Badge className={cn("text-[9px] border-0", key.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400")}>
                    {key.is_active ? 'Active' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  <span className="font-mono">{key.key_prefix}...</span>
                  {key.last_used_at && <span>Last used: {new Date(key.last_used_at).toLocaleDateString()}</span>}
                  {key.usage_count > 0 && <span>{key.usage_count} calls</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleKey.mutate(key)}>
                {key.is_active ? <EyeOff className="w-3.5 h-3.5 text-slate-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => setDeleteConfirm(key)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {apiKeys.length === 0 && (
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">No API keys created yet</p>
        )}
      </div>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently revoke "{deleteConfirm?.name}". Any application using this key will lose access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteKey.mutate(deleteConfirm.id)} className="bg-red-600 hover:bg-red-700">
              Delete Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Endpoint Documentation ────────────────────────────────────────

const endpoints = [
  {
    category: 'Quotes (Inbound)',
    description: 'Push accepted quotes from QuoteIT into ProjectIT',
    items: [
      {
        method: 'POST',
        path: '/api/external/quotes/accepted',
        title: 'Submit Accepted Quote',
        description: 'Called when a customer accepts a quote. Creates a pending proposal in ProjectIT that can be converted to a project.',
        body: {
          quote_id: { type: 'string', required: true, description: 'Unique quote ID from QuoteIT' },
          title: { type: 'string', required: true, description: 'Quote/proposal title' },
          customer_name: { type: 'string', required: false, description: 'Customer/company name' },
          customer_email: { type: 'string', required: false, description: 'Customer email address' },
          customer_id: { type: 'string', required: false, description: 'Customer ID for linking' },
          amount: { type: 'number', required: false, description: 'Total quote amount in dollars' },
          items: { type: 'array', required: false, description: 'Line items: [{ name, description, quantity, unit_price }]' },
          accepted_at: { type: 'string', required: false, description: 'ISO date when customer accepted' },
          metadata: { type: 'object', required: false, description: 'Any additional data' },
        },
        response: '{ success: true, incoming_quote_id: "uuid", status: "pending" }',
      },
      {
        method: 'POST',
        path: '/api/functions/proposalWebhook',
        title: 'Webhook (Event-Based)',
        description: 'Event-driven webhook for real-time quote notifications. Send events like quote.accepted, quote.status_changed.',
        body: {
          event: { type: 'string', required: true, description: '"quote.accepted" or "quote.status_changed"' },
          data: { type: 'object', required: true, description: 'Event payload with quote_id, title, customer_name, amount, items' },
        },
        response: '{ success: true, message: "Quote received", incoming_quote_id: "uuid" }',
        note: 'Use header x-projectit-api-key or x-gammastack-key for authentication.',
      },
    ],
  },
  {
    category: 'Projects (Outbound)',
    description: 'Pull project data from ProjectIT into QuoteIT',
    items: [
      {
        method: 'GET',
        path: '/api/external/projects',
        title: 'List Projects',
        description: 'Get all projects with optional filters.',
        params: {
          customer_name: 'Filter by customer name (partial match)',
          customer_id: 'Filter by customer ID',
          status: 'Filter by status (planning, on_hold, completed, archived)',
          quote_id: 'Filter by linked QuoteIT quote ID',
          limit: 'Max results (default 50)',
          sort: 'Sort field (default: -created_date)',
        },
        response: '{ success: true, count: 5, projects: [{ id, project_number, name, status, customer_name, ... }] }',
      },
      {
        method: 'GET',
        path: '/api/external/projects/:id',
        title: 'Get Project Detail',
        description: 'Get a single project by ID or project number, including task/part counts.',
        response: '{ success: true, project: { id, name, status, tasks_total, tasks_completed, parts_total, parts_installed, ... } }',
      },
      {
        method: 'GET',
        path: '/api/external/projects/by-quote/:quoteId',
        title: 'Get Project by Quote ID',
        description: 'Find the project linked to a specific QuoteIT quote.',
        response: '{ success: true, project: { id, project_number, name, status, progress, ... } }',
      },
    ],
  },
  {
    category: 'Customers',
    description: 'Access customer data aggregated from projects',
    items: [
      {
        method: 'GET',
        path: '/api/external/customers',
        title: 'List Customers',
        description: 'Get all unique customers with project counts.',
        response: '{ success: true, count: 10, customers: [{ name, customer_id, project_count, active_projects }] }',
      },
    ],
  },
  {
    category: 'Quotes (Status)',
    description: 'Check status of submitted quotes',
    items: [
      {
        method: 'GET',
        path: '/api/external/quotes/pending',
        title: 'List Pending Quotes',
        description: 'Get all incoming quotes not yet converted to projects.',
        response: '{ success: true, count: 3, quotes: [{ id, quoteit_id, title, customer_name, amount, status }] }',
      },
    ],
  },
];

function EndpointCard({ endpoint }) {
  const [expanded, setExpanded] = useState(false);
  const methodColors = {
    GET: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    POST: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    PUT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div className="border border-slate-200 dark:border-slate-700/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors text-left"
      >
        <Badge className={cn("text-[10px] px-2 font-mono border-0 shrink-0", methodColors[endpoint.method])}>
          {endpoint.method}
        </Badge>
        <code className="text-xs font-mono text-slate-600 dark:text-slate-300 flex-1 truncate">{endpoint.path}</code>
        <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline shrink-0">{endpoint.title}</span>
        {expanded ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700/30 bg-slate-50/50 dark:bg-[#151d2b]/50">
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 mb-3">{endpoint.description}</p>

          {endpoint.note && (
            <div className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg mb-3 border border-amber-200/50 dark:border-amber-800/30">
              {endpoint.note}
            </div>
          )}

          {endpoint.body && (
            <div className="mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Request Body</p>
              <div className="bg-white dark:bg-[#1e2a3a] rounded-lg border border-slate-200 dark:border-slate-700/50 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700/50">
                      <th className="text-left px-3 py-1.5 text-slate-500 dark:text-slate-400 font-medium">Field</th>
                      <th className="text-left px-3 py-1.5 text-slate-500 dark:text-slate-400 font-medium">Type</th>
                      <th className="text-left px-3 py-1.5 text-slate-500 dark:text-slate-400 font-medium hidden sm:table-cell">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(endpoint.body).map(([field, info]) => (
                      <tr key={field} className="border-b border-slate-50 dark:border-slate-700/30 last:border-0">
                        <td className="px-3 py-1.5 font-mono text-slate-800 dark:text-slate-200">
                          {field}
                          {info.required && <span className="text-red-500 ml-0.5">*</span>}
                        </td>
                        <td className="px-3 py-1.5 text-slate-500 dark:text-slate-400">{info.type}</td>
                        <td className="px-3 py-1.5 text-slate-500 dark:text-slate-400 hidden sm:table-cell">{info.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {endpoint.params && (
            <div className="mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Query Parameters</p>
              <div className="bg-white dark:bg-[#1e2a3a] rounded-lg border border-slate-200 dark:border-slate-700/50 overflow-hidden">
                <table className="w-full text-xs">
                  <tbody>
                    {Object.entries(endpoint.params).map(([param, desc]) => (
                      <tr key={param} className="border-b border-slate-50 dark:border-slate-700/30 last:border-0">
                        <td className="px-3 py-1.5 font-mono text-slate-800 dark:text-slate-200 w-36">{param}</td>
                        <td className="px-3 py-1.5 text-slate-500 dark:text-slate-400">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Response</p>
            <code className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10 px-3 py-2 rounded-lg block whitespace-pre-wrap break-all border border-emerald-100 dark:border-emerald-800/30">
              {endpoint.response}
            </code>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Section Component ────────────────────────────────────────

export default function ApiDocsSection() {
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const baseUrl = window.location.origin.replace(/:\d+$/, ':3001');
  const sampleCode = `// Example: Push an accepted quote to ProjectIT
const response = await fetch('${baseUrl}/api/external/quotes/accepted', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-projectit-api-key': 'pit_YOUR_API_KEY_HERE',
  },
  body: JSON.stringify({
    quote_id: '12345',
    title: 'Network Installation - Main Office',
    customer_name: 'Acme Corp',
    customer_email: 'contact@acme.com',
    amount: 15000,
    items: [
      { name: 'Cat6 Cable Run', quantity: 24, unit_price: 150 },
      { name: 'Patch Panel', quantity: 2, unit_price: 200 },
    ],
  }),
});

const data = await response.json();
console.log(data);
// { success: true, incoming_quote_id: "uuid", status: "pending" }`;

  const pullExample = `// Example: Get all projects for a customer
const response = await fetch('${baseUrl}/api/external/projects?customer_name=Acme', {
  headers: {
    'x-projectit-api-key': 'pit_YOUR_API_KEY_HERE',
  },
});

const data = await response.json();
// { success: true, count: 3, projects: [...] }`;

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="bg-white dark:bg-[#1e2a3a] rounded-2xl shadow-lg dark:shadow-none dark:border dark:border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b dark:border-slate-700/50">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-200/30 dark:shadow-emerald-900/20">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">API Documentation</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">External API for QuoteIT and third-party integrations</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Authentication Section */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Authentication</h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
            All API requests require an API key sent via the <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[11px] font-mono">x-projectit-api-key</code> header.
          </p>
          <div className="bg-slate-50 dark:bg-[#151d2b] rounded-lg p-3 border border-slate-200 dark:border-slate-700/50">
            <code className="text-xs font-mono text-slate-700 dark:text-slate-300">
              curl -H "x-projectit-api-key: pit_YOUR_KEY" {baseUrl}/api/external/projects
            </code>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
            Base URL: <code className="font-mono">{baseUrl}</code>
          </p>
        </div>

        {/* API Keys Management */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 p-5">
          <ApiKeysManager />
        </div>

        {/* Endpoints */}
        {endpoints.map((category) => (
          <div key={category.category}>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-violet-500" />
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{category.category}</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{category.description}</p>
            <div className="space-y-2">
              {category.items.map((ep) => (
                <EndpointCard key={ep.path + ep.method} endpoint={ep} />
              ))}
            </div>
          </div>
        ))}

        {/* Code Examples */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Code className="w-4 h-4 text-orange-500" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Code Examples</h3>
          </div>

          <div className="space-y-4">
            {/* Push example */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
              <div className="px-4 py-2 bg-slate-50 dark:bg-[#151d2b] border-b border-slate-200 dark:border-slate-700/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0 text-[9px]">POST</Badge>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-200">Push Accepted Quote</span>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyCode(sampleCode)}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
              <pre className="p-4 text-[11px] font-mono text-slate-700 dark:text-slate-300 overflow-x-auto bg-white dark:bg-[#1e2a3a]">
                <code>{sampleCode}</code>
              </pre>
            </div>

            {/* Pull example */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
              <div className="px-4 py-2 bg-slate-50 dark:bg-[#151d2b] border-b border-slate-200 dark:border-slate-700/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-[9px]">GET</Badge>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-200">Pull Projects by Customer</span>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyCode(pullExample)}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
              <pre className="p-4 text-[11px] font-mono text-slate-700 dark:text-slate-300 overflow-x-auto bg-white dark:bg-[#1e2a3a]">
                <code>{pullExample}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* Flow Diagram */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 p-5 bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-[#151d2b] dark:to-blue-900/5">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Integration Flow</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {[
              { num: 1, label: 'Customer accepts quote', sub: 'In QuoteIT', color: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30' },
              { num: 2, label: 'QuoteIT sends webhook', sub: 'POST /quotes/accepted', color: 'text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30' },
              { num: 3, label: 'Appears as Pending', sub: 'In ProjectIT dashboard', color: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30' },
              { num: 4, label: 'Team creates project', sub: 'From proposal data', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30' },
              { num: 5, label: 'QuoteIT pulls status', sub: 'GET /projects/by-quote/:id', color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30' },
            ].map((step) => (
              <div key={step.num} className="flex items-start gap-2.5 p-3 rounded-lg bg-white dark:bg-[#1e2a3a] border border-slate-200 dark:border-slate-700/50">
                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0", step.color)}>
                  {step.num}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-tight">{step.label}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 break-all">{step.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
