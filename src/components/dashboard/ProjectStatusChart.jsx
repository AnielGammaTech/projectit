import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { BarChart3 } from 'lucide-react';

const statusConfig = {
  planning: { label: 'Planning', color: '#f59e0b' },
  in_progress: { label: 'In Progress', color: '#3b82f6' },
  on_hold: { label: 'On Hold', color: '#64748b' },
  completed: { label: 'Completed', color: '#10b981' }
};

export default function ProjectStatusChart({ projects = [] }) {
  const statusCounts = projects.reduce((acc, project) => {
    const status = project.status || 'planning';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(statusConfig)
    .map(([key, config]) => ({
      name: config.label,
      value: statusCounts[key] || 0,
      color: config.color
    }))
    .filter(item => item.value > 0);

  if (projects.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-violet-50">
            <BarChart3 className="w-5 h-5 text-violet-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Project Overview</h3>
        </div>
        <p className="text-slate-500 text-center py-6">No projects yet</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-100 p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-violet-50">
          <BarChart3 className="w-5 h-5 text-violet-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">Project Overview</h3>
      </div>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                background: 'white', 
                border: '1px solid #e2e8f0', 
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value) => <span className="text-sm text-slate-600">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        {Object.entries(statusConfig).map(([key, config]) => {
          const count = statusCounts[key] || 0;
          return (
            <div key={key} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.color }} />
              <span className="text-sm text-slate-600">{config.label}</span>
              <span className="ml-auto font-semibold text-slate-900">{count}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}