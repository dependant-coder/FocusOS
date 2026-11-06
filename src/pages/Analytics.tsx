import { useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Flame, CheckCircle2, Lightbulb, Sparkles, AlertCircle, Timer } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts'
import { StatCard } from '../components/analytics/StatCard'
import { HabitHeatmap } from '../components/analytics/HabitHeatmap'
import {
  useTaskCompletionTrend,
  useCategoryDistribution,
  useWeeklyCompletionTrend,
  useAnalyticsSummary,
  useFocusTrend,
  type AnalyticsRange,
} from '../hooks/useAnalytics'
import PageShell from '../components/layout/PageShell'
import { CATEGORY_HEX_COLORS } from '../lib/constants'

const RANGE_OPTIONS: { label: string; value: AnalyticsRange }[] = [
  { label: '7 Days', value: 7 },
  { label: '30 Days', value: 30 },
  { label: '90 Days', value: 90 },
]

export function Analytics() {
  const [rangeDays, setRangeDays] = useState<AnalyticsRange>(30)

  const { data: summary } = useAnalyticsSummary(rangeDays)
  const { data: barData, isLoading: isBarLoading } = useTaskCompletionTrend(rangeDays)
  const { data: donutData, isLoading: isDonutLoading } = useCategoryDistribution(rangeDays)
  const { data: lineData, isLoading: isLineLoading } = useWeeklyCompletionTrend()
  const { data: focusData, isLoading: isFocusLoading } = useFocusTrend(rangeDays)

  const totalCompletedInRange = summary?.tasksInRange ?? 0
  const totalFocusMinutes = summary?.focusMinutesInRange ?? 0
  const totalCategoryTasks = donutData?.reduce((acc, curr) => acc + curr.value, 0) ?? 0

  return (
    <PageShell title="Analytics" size="wide">
      <div className="w-full pb-20 pt-2 px-1 sm:px-4 space-y-6">
        {/* Header & Range Selector */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Visualize your habits, completed tasks, and productivity patterns
            </p>
          </div>

          {/* Range segmented control */}
          <div
            role="tablist"
            aria-label="Time range"
            className="inline-flex p-1 bg-gray-200/60 dark:bg-gray-800/60 rounded-xl text-xs font-medium"
          >
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                role="tab"
                aria-selected={rangeDays === opt.value}
                onClick={() => setRangeDays(opt.value)}
                className={`px-3 py-1.5 rounded-lg transition-all font-semibold ${
                  rangeDays === opt.value
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-2xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Productivity Insight Banner */}
        {summary?.bestWeekday && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-900 dark:text-indigo-200 shadow-2xs"
          >
            <div className="p-2 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 shrink-0">
              <Sparkles size={18} />
            </div>
            <div className="text-xs sm:text-sm">
              <p className="font-semibold">Productivity Pattern</p>
              <p className="text-indigo-700 dark:text-indigo-300">
                You complete the most tasks on <strong>{summary.bestWeekday}s</strong>. Plan deep work sessions accordingly!
              </p>
            </div>
          </motion.div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <StatCard
            title={`Completed (${rangeDays}d)`}
            value={totalCompletedInRange}
            icon={CheckCircle2}
            color="primary"
          />
          <StatCard
            title={`Focus Time (${rangeDays}d)`}
            value={`${totalFocusMinutes}m`}
            icon={Timer}
            color="purple"
          />
          <StatCard
            title="All-Time Done"
            value={summary?.allTimeCompleted || 0}
            icon={Trophy}
            color="green"
          />
          <StatCard
            title="Habit Consistency"
            value={`${summary?.habitConsistencyRate || 0}%`}
            icon={Lightbulb}
            color="blue"
          />
          <StatCard
            title="Top Streak"
            value={`${summary?.longestStreak || 0} d`}
            icon={Flame}
            color="orange"
          />
        </div>

        {/* 2-Column Responsive Grid on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Tasks Completed Per Day (Bar Chart based on completed_at) */}
          <div
            className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-2xs"
            aria-label={`Daily task completion for the last ${rangeDays} days`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  Tasks Completed ({rangeDays} Days)
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Logged from actual completion timestamps
                </p>
              </div>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
                {totalCompletedInRange} total
              </span>
            </div>

            {isBarLoading ? (
              <div className="h-[260px] bg-gray-100 dark:bg-gray-800/40 rounded-xl animate-pulse" />
            ) : totalCompletedInRange === 0 ? (
              <div className="h-[260px] flex flex-col items-center justify-center text-center p-6 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                <AlertCircle size={24} className="text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  No completed tasks in this period
                </p>
                <p className="text-xs text-gray-400 mt-1 max-w-[220px]">
                  Complete tasks from Today or Vault to visualize your daily progress.
                </p>
              </div>
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height={260} minWidth={0}>
                  <BarChart data={barData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#88888825" vertical={false} />
                    <XAxis dataKey="date" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: '#88888815' }}
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="completed" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Chart 2: Category Split (Donut Chart) */}
          <div
            className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-2xs"
            aria-label="Task category distribution"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  Category Distribution ({rangeDays} Days)
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Breakdown across College, Personal, and Skill
                </p>
              </div>
            </div>

            {isDonutLoading ? (
              <div className="h-[260px] bg-gray-100 dark:bg-gray-800/40 rounded-xl animate-pulse" />
            ) : totalCategoryTasks === 0 ? (
              <div className="h-[260px] flex flex-col items-center justify-center text-center p-6 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                <AlertCircle size={24} className="text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  No categorized tasks completed yet
                </p>
                <p className="text-xs text-gray-400 mt-1 max-w-[220px]">
                  Categorize tasks to see how your time is divided.
                </p>
              </div>
            ) : (
              <div>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height={200} minWidth={0}>
                    <PieChart>
                      <Pie
                        data={donutData || []}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                      >
                        {(donutData || []).map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={CATEGORY_HEX_COLORS[entry.name] || '#8b5cf6'}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '10px',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Accessible Legend */}
                <div className="flex justify-center gap-6 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800/60">
                  {(donutData || []).map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2 text-xs">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: CATEGORY_HEX_COLORS[entry.name] || '#8b5cf6' }}
                      />
                      <span className="text-gray-600 dark:text-gray-400 capitalize font-medium">
                        {entry.name}
                      </span>
                      <span className="text-gray-900 dark:text-white font-semibold tabular-nums">
                        ({entry.value})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chart 3: Weekly Completion Trend (Line Chart) */}
          <div
            className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-2xs"
            aria-label="Weekly completion trend over the last 12 weeks"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  Weekly Completion Rate (Last 12 Weeks)
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Historic consistency recorded from your weekly reviews
                </p>
              </div>
            </div>

            {isLineLoading ? (
              <div className="h-[260px] bg-gray-100 dark:bg-gray-800/40 rounded-xl animate-pulse" />
            ) : (lineData?.length ?? 0) === 0 ? (
              <div className="h-[260px] flex flex-col items-center justify-center text-center p-6 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                <AlertCircle size={24} className="text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  No weekly reviews completed yet
                </p>
                <p className="text-xs text-gray-400 mt-1 max-w-[240px]">
                  Complete weekly reviews on the Weekly page to see your multi-week consistency trend.
                </p>
              </div>
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height={260} minWidth={0}>
                  <LineChart data={lineData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#88888825" vertical={false} />
                    <XAxis dataKey="week" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#888888"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      unit="%"
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '12px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{ fill: '#10b981', strokeWidth: 1, r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Chart: Focus Time Per Day (Bar Chart based on focus_sessions) */}
          <div
            className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-2xs"
            aria-label={`Daily focus minutes for the last ${rangeDays} days`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  Focus Time ({rangeDays} Days)
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Logged from completed and tracked focus sessions
                </p>
              </div>
              <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 tabular-nums">
                {totalFocusMinutes}m total
              </span>
            </div>

            {isFocusLoading ? (
              <div className="h-[260px] bg-gray-100 dark:bg-gray-800/40 rounded-xl animate-pulse" />
            ) : totalFocusMinutes === 0 ? (
              <div className="h-[260px] flex flex-col items-center justify-center text-center p-6 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                <AlertCircle size={24} className="text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  No focus sessions recorded in this period
                </p>
                <p className="text-xs text-gray-400 mt-1 max-w-[220px]">
                  Start a timer on the Focus page or from a task to track your deep work.
                </p>
              </div>
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height={260} minWidth={0}>
                  <BarChart data={focusData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#88888825" vertical={false} />
                    <XAxis dataKey="date" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} unit="m" allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: '#88888815' }}
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '12px',
                      }}
                      formatter={(val) => [`${val ?? 0} min`, 'Focus Time']}
                    />
                    <Bar dataKey="minutes" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Chart 4: Frequency-Aware Habit Heatmap */}
          <div className="lg:col-span-2">
            <HabitHeatmap rangeDays={rangeDays} />
          </div>
        </div>
      </div>
    </PageShell>
  )
}

export default Analytics
