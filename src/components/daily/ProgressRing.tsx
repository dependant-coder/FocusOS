interface ProgressRingProps {
  completed: number
  total: number
  size?: number
  strokeWidth?: number
}

export default function ProgressRing({ completed, total, size = 88, strokeWidth = 6 }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const percentage = total > 0 ? (completed / total) * 100 : 0
  const offset = circumference - (percentage / 100) * circumference

  const getColor = () => {
    if (percentage >= 100) return { stroke: '#10b981', text: 'text-emerald-500' }
    if (percentage >= 60) return { stroke: '#6366f1', text: 'text-indigo-500' }
    if (percentage >= 30) return { stroke: '#f59e0b', text: 'text-amber-500' }
    return { stroke: '#ef4444', text: 'text-red-500' }
  }

  const color = getColor()

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-gray-100 dark:text-gray-800"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-lg font-bold ${color.text}`}>
          {completed}/{total}
        </span>
        <span className="text-[9px] uppercase tracking-wider text-gray-400 font-medium">done</span>
      </div>
    </div>
  )
}
