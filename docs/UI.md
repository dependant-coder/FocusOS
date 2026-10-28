# FocusOS — UI Design Primitives (`src/components/ui/`)

FocusOS design primitives follow a strict mobile-first design constitution:
- **44×44 px minimum touch targets** for all interactive elements on mobile devices.
- **16 px font-size on form inputs** to prevent iOS WebKit automatic zoom on focus.
- **Accessible by default**: mandatory `aria-label` on icon-only actions, `:focus-visible` focus rings, and dark mode support.
- **Brand color token**: uses Tailwind `brand-*` palette consistently.

---

## 1. `Button` (`src/components/ui/Button.tsx`)
Primary interactive button with loading state, size choices, and accessible keyboard focus.

### Props
- `variant`: `'primary' | 'secondary' | 'ghost' | 'danger'` (default: `'primary'`)
- `size`: `'sm' | 'md' | 'lg'` (default: `'md'`, all ≥ 44px height)
- `loading`: `boolean` (displays spinner and disables button)
- `fullWidth`: `boolean`
- `icon`: `React.ReactNode`

### Example
```tsx
import { Button } from './components/ui/Button'
import { Plus } from 'lucide-react'

// Primary with icon
<Button variant="primary" icon={<Plus size={16} />}>
  Add Task
</Button>

// Loading state
<Button loading={isSubmitting}>
  Saving...
</Button>

// Danger action
<Button variant="danger" size="sm">
  Delete Forever
</Button>
```

---

## 2. `Input` (`src/components/ui/Input.tsx`)
Standard single-line text input with label, 16px font-size, error messaging, and optional left/right icons.

### Props
- `label`: `string`
- `error`: `string`
- `hint`: `string`
- `leftIcon`: `React.ReactNode`
- `rightIcon`: `React.ReactNode`
- Standard `React.InputHTMLAttributes<HTMLInputElement>` (`autoComplete`, `type`, etc.)

### Example
```tsx
import { Input } from './components/ui/Input'
import { Search } from 'lucide-react'

<Input
  label="Task Title"
  placeholder="e.g. CS 101 Problem Set"
  autoComplete="off"
  error={errors.title}
/>

<Input
  placeholder="Search tasks..."
  leftIcon={<Search size={16} />}
/>
```

---

## 3. `Textarea` (`src/components/ui/Textarea.tsx`)
Multi-line input with automatic 16px font-size to prevent iOS zoom, accessible label, and error slots.

### Props
- `label`: `string`
- `error`: `string`
- `hint`: `string`
- `rows`: `number` (default: 3)
- Standard `React.TextareaHTMLAttributes<HTMLTextAreaElement>`

### Example
```tsx
import { Textarea } from './components/ui/Textarea'

<Textarea
  label="Notes / Description"
  placeholder="Add reference links or instructions..."
  rows={4}
/>
```

---

## 4. `Select` (`src/components/ui/Select.tsx`)
Accessible dropdown select element with styled chevron indicator and 16px text.

### Props
- `label`: `string`
- `error`: `string`
- `hint`: `string`
- `options`: `{ value: string; label: string; disabled?: boolean }[]`
- Standard `React.SelectHTMLAttributes<HTMLSelectElement>`

### Example
```tsx
import { Select } from './components/ui/Select'

<Select
  label="Priority"
  options={[
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ]}
  value={priority}
  onChange={(e) => setPriority(e.target.value)}
/>
```

---

## 5. `Card` (`src/components/ui/Card.tsx`)
Surface container with border, subtle shadow, and optional interactive hover/press states.

### Props
- `interactive`: `boolean` (default: `false`)
- `padding`: `'none' | 'sm' | 'md' | 'lg'` (default: `'md'`)
- Standard `React.HTMLAttributes<HTMLDivElement>`

### Example
```tsx
import { Card } from './components/ui/Card'

<Card interactive onClick={handleOpen}>
  <h4 className="font-semibold text-gray-900 dark:text-white">CS 101 Problem Set</h4>
  <p className="text-xs text-gray-500 mt-1">Due today at 11:59 PM</p>
</Card>
```

---

## 6. `SectionHeader` (`src/components/ui/SectionHeader.tsx`)
Consistent section header implementing the uppercase tracking-wider pattern with optional icon, badge, and trailing action.

### Props
- `title`: `string`
- `icon`: `React.ReactNode`
- `badge`: `React.ReactNode`
- `action`: `React.ReactNode`

### Example
```tsx
import { SectionHeader } from './components/ui/SectionHeader'
import { Crosshair } from 'lucide-react'

<SectionHeader
  title="Today's Priorities"
  icon={<Crosshair size={15} className="text-brand-500" />}
  badge={<span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">3/5</span>}
  action={<button className="text-xs text-brand-600 font-medium">See all</button>}
/>
```

---

## 7. `Chip` (`src/components/ui/Chip.tsx`)
Pill-shaped toggle / filter button with minimum 44px touch height, active state, and optional count badge.

### Props
- `active`: `boolean` (default: `false`)
- `icon`: `React.ReactNode`
- `count`: `number | string`
- Standard `React.ButtonHTMLAttributes<HTMLButtonElement>`

### Example
```tsx
import { Chip } from './components/ui/Chip'
import { GraduationCap } from 'lucide-react'

<Chip
  active={filter === 'college'}
  icon={<GraduationCap size={14} />}
  count={4}
  onClick={() => setFilter('college')}
>
  College
</Chip>
```

---

## 8. `Badge` (`src/components/ui/Badge.tsx`)
Status and category indicator pill.

### Props
- `variant`: `'default' | 'brand' | 'success' | 'warning' | 'danger' | 'outline'`
- `size`: `'sm' | 'md'`
- `icon`: `React.ReactNode`

### Example
```tsx
import { Badge } from './components/ui/Badge'
import { AlertCircle } from 'lucide-react'

<Badge variant="danger" icon={<AlertCircle size={12} />}>
  Overdue
</Badge>
```

---

## 9. `IconButton` (`src/components/ui/IconButton.tsx`)
Accessible button for icon-only actions with guaranteed 44×44 px hit target and mandatory `aria-label`.

### Props
- `'aria-label'`: `string` (required for accessibility)
- `variant`: `'primary' | 'secondary' | 'ghost' | 'danger'` (default: `'ghost'`)
- `size`: `'sm' | 'md' | 'lg'` (default: `'md'`)
- `icon`: `React.ReactNode`

### Example
```tsx
import { IconButton } from './components/ui/IconButton'
import { Trash2 } from 'lucide-react'

<IconButton
  aria-label="Delete habit"
  variant="danger"
  icon={<Trash2 size={18} />}
  onClick={handleDelete}
/>
```
