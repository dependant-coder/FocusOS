// Priority color system
export const PRIORITY_COLORS = {
  critical: {
    border: 'border-red-500',
    bg: 'bg-red-50',
    text: 'text-red-700',
    dark: { bg: 'dark:bg-red-950', text: 'dark:text-red-300' },
    dot: 'bg-red-500',
  },
  high: {
    border: 'border-orange-500',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    dark: { bg: 'dark:bg-orange-950', text: 'dark:text-orange-300' },
    dot: 'bg-orange-500',
  },
  medium: {
    border: 'border-yellow-500',
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    dark: { bg: 'dark:bg-yellow-950', text: 'dark:text-yellow-300' },
    dot: 'bg-yellow-500',
  },
  low: {
    border: 'border-green-500',
    bg: 'bg-green-50',
    text: 'text-green-700',
    dark: { bg: 'dark:bg-green-950', text: 'dark:text-green-300' },
    dot: 'bg-green-500',
  },
} as const

// Category color system
export const CATEGORY_COLORS = {
  college: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    dark: { bg: 'dark:bg-blue-950', text: 'dark:text-blue-300' },
    icon: 'graduation-cap',
    label: 'College',
  },
  personal: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    dark: { bg: 'dark:bg-purple-950', text: 'dark:text-purple-300' },
    icon: 'brain',
    label: 'Personal',
  },
  skill: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dark: { bg: 'dark:bg-amber-950', text: 'dark:text-amber-300' },
    icon: 'lightbulb',
    label: 'Skill',
  },
} as const

// 30 daily motivational quotes
export const DAILY_QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "Your limitation—it's only your imagination.", author: "Unknown" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
  { text: "Great things never come from comfort zones.", author: "Unknown" },
  { text: "Dream it. Wish it. Do it.", author: "Unknown" },
  { text: "Stay focused, go after your dreams and keep moving toward your goals.", author: "LL Cool J" },
  { text: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery" },
  { text: "Little things make big days.", author: "Unknown" },
  { text: "It's going to be hard, but hard does not mean impossible.", author: "Unknown" },
  { text: "Don't wait for opportunity. Create it.", author: "Unknown" },
  { text: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
  { text: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Unknown" },
  { text: "Don't stop when you're tired. Stop when you're done.", author: "Unknown" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The beginning is always today.", author: "Mary Shelley" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" },
  { text: "Setting goals is the first step in turning the invisible into the visible.", author: "Tony Robbins" },
  { text: "Productivity is never an accident. It is the result of a commitment to excellence.", author: "Paul J. Meyer" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "What you do today can improve all your tomorrows.", author: "Ralph Marston" },
] as const

// Priority config with hex colors (for badge components)
export const PRIORITY_CONFIG = {
  critical: { label: 'Critical', color: '#ef4444' },
  high: { label: 'High', color: '#f97316' },
  medium: { label: 'Medium', color: '#eab308' },
  low: { label: 'Low', color: '#22c55e' },
} as const

// Category config with hex colors (for badge components)
export const CATEGORY_CONFIG = {
  college: { label: 'College', icon: 'graduation-cap', color: '#3b82f6' },
  personal: { label: 'Personal', icon: 'brain', color: '#a855f7' },
  skill: { label: 'Skill', icon: 'lightbulb', color: '#f59e0b' },
} as const

// Priority order for sorting
export const PRIORITY_ORDER = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
} as const

// Status labels
export const STATUS_LABELS = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  done: 'Done',
} as const

export type Priority = keyof typeof PRIORITY_COLORS
export type Category = keyof typeof CATEGORY_COLORS
export type TaskStatus = keyof typeof STATUS_LABELS

// Chart palette unified with category and priority colors
export const CHART_COLORS = {
  primary: '#4f46e5',
  secondary: '#06b6d4',
  college: '#3b82f6',
  personal: '#a855f7',
  skill: '#f59e0b',
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  palette: ['#3b82f6', '#a855f7', '#f59e0b', '#10b981', '#ef4444'],
} as const
