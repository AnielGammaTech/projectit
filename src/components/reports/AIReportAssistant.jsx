import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Sparkles, Send, Loader2, TrendingUp, TrendingDown, 
  AlertTriangle, CheckCircle2, BarChart3, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, subDays, subMonths, startOfQuarter, endOfQuarter, subQuarters } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const exampleQueries = [
  "Show me all proposals over $10,000 accepted last quarter",
  "What is the team's utilization rate this month?",
  "Which projects are behind schedule?",
  "Top 5 customers by proposal value",
  "Task completion rate by team member",
  "Revenue trend for the last 6 months"
];

export default function AIReportAssistant({ 
  projects = [], 
  proposals = [], 
  tasks = [], 
  timeEntries = [], 
  customers = [],
  teamMembers = []
}) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const analyzeData = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    // Prepare data summary for the AI
    const now = new Date();
    const lastQuarterStart = startOfQuarter(subQuarters(now, 1));
    const lastQuarterEnd = endOfQuarter(subQuarters(now, 1));
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const dataSummary = {
      proposals: {
        total: proposals.length,
        byStatus: proposals.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {}),
        totalValue: proposals.reduce((sum, p) => sum + (p.total || 0), 0),
        acceptedValue: proposals.filter(p => p.status === 'approved').reduce((sum, p) => sum + (p.total || 0), 0),
        lastQuarter: proposals.filter(p => {
          const d = new Date(p.created_date);
          return d >= lastQuarterStart && d <= lastQuarterEnd;
        }),
        over10k: proposals.filter(p => (p.total || 0) > 10000)
      },
      projects: {
        total: projects.length,
        byStatus: projects.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {}),
        overdue: projects.filter(p => p.due_date && new Date(p.due_date) < now && p.status !== 'completed')
      },
      tasks: {
        total: tasks.length,
        byStatus: tasks.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {}),
        overdue: tasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'completed'),
        completionRate: tasks.length > 0 ? (tasks.filter(t => t.status === 'completed').length / tasks.length * 100).toFixed(1) : 0,
        byAssignee: tasks.reduce((acc, t) => {
          if (t.assigned_to) {
            acc[t.assigned_to] = acc[t.assigned_to] || { total: 0, completed: 0 };
            acc[t.assigned_to].total++;
            if (t.status === 'completed') acc[t.assigned_to].completed++;
          }
          return acc;
        }, {})
      },
      timeEntries: {
        total: timeEntries.length,
        totalHours: timeEntries.reduce((sum, e) => sum + ((e.duration_minutes || 0) / 60), 0),
        thisMonth: timeEntries.filter(e => new Date(e.created_date) >= thisMonthStart)
      },
      customers: {
        total: customers.length,
        companies: customers.filter(c => c.is_company).length
      },
      teamMembers: teamMembers.map(m => ({ name: m.name, email: m.email }))
    };

    const prompt = `You are a business intelligence assistant analyzing project management data. 
    
User Query: "${query}"

Available Data Summary:
${JSON.stringify(dataSummary, null, 2)}

Raw Data Available:
- Proposals: ${proposals.length} records with fields: title, total, status, customer_name, created_date, signed_date
- Projects: ${projects.length} records with fields: name, status, progress, due_date, budget, customer_id
- Tasks: ${tasks.length} records with fields: title, status, assigned_to, due_date, priority
- Time Entries: ${timeEntries.length} records with fields: duration_minutes, user_email, project_id
- Customers: ${customers.length} records
- Team Members: ${teamMembers.length} records

Analyze the query and provide:
1. A direct answer to the question
2. Key insights or trends
3. Any anomalies or concerns
4. Relevant data for visualization (if applicable)

Format your response as JSON.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          answer: { type: "string", description: "Direct answer to the query" },
          insights: { 
            type: "array", 
            items: { 
              type: "object",
              properties: {
                type: { type: "string", enum: ["positive", "negative", "neutral", "warning"] },
                text: { type: "string" }
              }
            }
          },
          chartData: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["bar", "pie", "none"] },
              title: { type: "string" },
              data: { type: "array", items: { type: "object" } }
            }
          },
          metrics: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                value: { type: "string" },
                trend: { type: "string", enum: ["up", "down", "neutral"] }
              }
            }
          }
        }
      }
    });

    setResult(response);
    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      analyzeData();
    }
  };

  const insightIcons = {
    positive: <TrendingUp className="w-4 h-4 text-emerald-500" />,
    negative: <TrendingDown className="w-4 h-4 text-red-500" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
    neutral: <CheckCircle2 className="w-4 h-4 text-blue-500" />
  };

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-purple-100">
            <Sparkles className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">AI Report Assistant</h3>
            <p className="text-xs text-slate-500">Ask questions about your data in plain English</p>
          </div>
        </div>

        {/* Query Input */}
        <div className="flex gap-2 mb-4">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about your data..."
            className="flex-1"
          />
          <Button 
            onClick={analyzeData} 
            disabled={loading || !query.trim()}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>

        {/* Example Queries */}
        {!result && !loading && (
          <div className="mb-4">
            <p className="text-xs text-slate-500 mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {exampleQueries.slice(0, 4).map((eq, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(eq)}
                  className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors"
                >
                  {eq}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Analyzing your data...</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Answer */}
            <div className="p-4 bg-white rounded-lg border">
              <p className="text-sm text-slate-700">{result.answer}</p>
            </div>

            {/* Metrics */}
            {result.metrics?.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {result.metrics.map((m, i) => (
                  <div key={i} className="p-3 bg-white rounded-lg border text-center">
                    <p className="text-xs text-slate-500">{m.label}</p>
                    <p className="text-xl font-bold text-slate-900">{m.value}</p>
                    {m.trend && m.trend !== 'neutral' && (
                      m.trend === 'up' ? 
                        <TrendingUp className="w-4 h-4 text-emerald-500 mx-auto" /> :
                        <TrendingDown className="w-4 h-4 text-red-500 mx-auto" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Chart */}
            {result.chartData?.type !== 'none' && result.chartData?.data?.length > 0 && (
              <div className="p-4 bg-white rounded-lg border">
                <p className="text-sm font-medium text-slate-700 mb-3">{result.chartData.title}</p>
                <ResponsiveContainer width="100%" height={200}>
                  {result.chartData.type === 'bar' ? (
                    <BarChart data={result.chartData.data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  ) : (
                    <PieChart>
                      <Pie 
                        data={result.chartData.data} 
                        cx="50%" 
                        cy="50%" 
                        outerRadius={70} 
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {result.chartData.data.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}

            {/* Insights */}
            {result.insights?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500">Key Insights</p>
                {result.insights.map((insight, i) => (
                  <div key={i} className={cn(
                    "flex items-start gap-2 p-3 rounded-lg border",
                    insight.type === 'positive' && "bg-emerald-50 border-emerald-200",
                    insight.type === 'negative' && "bg-red-50 border-red-200",
                    insight.type === 'warning' && "bg-amber-50 border-amber-200",
                    insight.type === 'neutral' && "bg-blue-50 border-blue-200"
                  )}>
                    {insightIcons[insight.type]}
                    <p className="text-sm text-slate-700">{insight.text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Clear Results */}
            <Button variant="outline" size="sm" onClick={() => { setResult(null); setQuery(''); }} className="w-full">
              <X className="w-4 h-4 mr-2" /> Clear & Ask Another
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}