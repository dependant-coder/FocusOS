import { motion } from 'framer-motion'
import { Trophy, Flame, Calendar, Star } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  LineChart, Line
} from 'recharts'
import { StatCard } from '../components/analytics/StatCard'
import { HabitHeatmap } from '../components/analytics/HabitHeatmap'
import { 
  useBarChartData, 
  useDonutChartData, 
  useLineChartData,
  useStatCardsData
} from '../hooks/useAnalytics'
import PageShell from '../components/layout/PageShell'

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444']

export function Analytics() {
  const { data: statData } = useStatCardsData()
  const { data: barData } = useBarChartData()
  const { data: donutData } = useDonutChartData()
  const { data: lineData } = useLineChartData()

  return (
    <PageShell title="Analytics" size="wide">
      <div className="w-full pb-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Analytics</h1>
        <p className="text-gray-500 dark:text-gray-400">Visualize your productivity and track your growth.</p>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          title="All-Time Tasks" 
          value={statData?.allTime || 0} 
          icon={Trophy} 
          color="primary" 
        />
        <StatCard 
          title="Longest Streak" 
          value={`${statData?.longestStreak || 0} Days`} 
          icon={Flame} 
          color="orange" 
        />
        <StatCard 
          title="Best Week" 
          value={`${statData?.bestWeek || 0} Tasks`} 
          icon={Calendar} 
          color="green" 
        />
        <StatCard 
          title="Most Productive Day" 
          value={`${statData?.mostProductiveDay || 0} Tasks`} 
          icon={Star} 
          color="blue" 
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Daily Task Completion (Bar Chart) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Daily Task Completion (Last 7 Days)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height={300} minWidth={0}>
              <BarChart data={barData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#88888840" vertical={false} />
                <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: '#88888820' }} 
                  contentStyle={{ backgroundColor: 'var(--tw-prose-body, #1f2937)', color: '#fff', border: 'none', borderRadius: '8px' }} 
                />
                <Bar dataKey="completed" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Category Split (Donut Chart) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Task Distribution (All Time)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height={300} minWidth={0}>
              <PieChart>
                <Pie 
                  data={donutData || []} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={80} 
                  outerRadius={110} 
                  paddingAngle={5}
                >
                  {(donutData || []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', color: '#fff', border: 'none', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="flex justify-center gap-4 mt-4">
            {(donutData || []).map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{entry.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Weekly Completion Trend (Line Chart) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Weekly Completion Trend</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height={300} minWidth={0}>
              <LineChart data={lineData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#88888840" vertical={false} />
                <XAxis dataKey="week" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', color: '#fff', border: 'none', borderRadius: '8px' }} />
                <Line 
                  type="monotone" 
                  dataKey="rate" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }} 
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Habit Heatmap */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <HabitHeatmap />
        </motion.div>
      </div>
      </div>
    </PageShell>
  )
}
