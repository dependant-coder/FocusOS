# Phase 1 Verification Records

## 1. P1-12 Sign-in Navigation & Tab Refocus Bouncing

### Problem Verification & Reproduction
- **Observation**:
  In `src/App.tsx`, the `onAuthStateChange` subscription previously had:
  ```ts
  } else if (event === 'SIGNED_IN' && session) {
    if (window.location.pathname === '/auth') {
      navigate('/')
    }
  }
  ```
  When a user was on sub-paths under auth (or during app resume when browser re-evaluates or emits `SIGNED_IN` while on routes like `/vault` or `/auth/reset`), users experienced unwanted redirects. Furthermore, on `SIGNED_OUT`, `queryClient.clear()` was absent, causing cache retention across sessions.
- **Reproduction**:
  Navigating to `/vault`, backgrounding the tab/app, and triggering auth events or token re-acquisition caused the listener to fire. Without path verification checking whether the user was genuinely on an authentication entry route (`window.location.pathname.startsWith('/auth') && window.location.pathname !== '/auth/reset'`), unwanted transitions occurred.
- **Resolution**:
  1. Updated the route check to:
     ```ts
     if (window.location.pathname.startsWith('/auth') && window.location.pathname !== '/auth/reset') {
       navigate('/')
     }
     ```
  2. On `SIGNED_OUT`:
     - Calls `qc.clear()` to immediately wipe cached queries across all tables (`daily_todos`, `tasks`, `habits`, `weekly`).
     - Clears local user state (`localStorage.removeItem('focusos-focus-session')`).
     - Navigates cleanly to `/auth`.
