import { createContext, useContext, type ReactNode } from 'react'

export interface LayoutContextType {
  title: string
  setTitle: (title: string) => void
  action: ReactNode | null
  setAction: (action: ReactNode | null) => void
}

export const LayoutContext = createContext<LayoutContextType>({
  title: 'FocusOS',
  setTitle: () => {},
  action: null,
  setAction: () => {},
})

export function useLayout() {
  return useContext(LayoutContext)
}
