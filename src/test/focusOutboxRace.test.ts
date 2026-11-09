import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useFocusStore } from '../store/focusStore'
import { supabase } from '../lib/supabase'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

type Uploaded = { status: string; ended_at: string | null; interruptions: number }

function resetStore() {
  useFocusStore.setState({
    sessionId: null,
    status: 'stopped',
    pendingRows: [],
    conflictSession: null,
    completedSheetOpen: false,
    completedSummary: null,
  })
}

// A fake focus_sessions table whose upsert is slow (150 ms), like a weak mobile connection.
function mockSlowUpsert(uploaded: Uploaded[]) {
  return vi.spyOn(supabase, 'from').mockImplementation((() => ({
    upsert: async (rec: Uploaded) => {
      await sleep(150)
      uploaded.push({ status: rec.status, ended_at: rec.ended_at, interruptions: rec.interruptions })
      return { data: null, error: null }
    },
    select: () => ({ eq: () => ({ in: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
  })) as never)
}

describe('focus outbox: newer snapshots must never be lost while an older upload is in flight', () => {
  beforeEach(resetStore)
  afterEach(() => vi.restoreAllMocks())

  it('stop while the start-upload is still in flight -> the DB ends up with status "stopped"', async () => {
    const uploaded: Uploaded[] = []
    mockSlowUpsert(uploaded)

    const startP = useFocusStore.getState().startSession({ userId: 'u1', plannedSeconds: 1500 })
    await sleep(30) // the first (running) upload is now in flight
    await useFocusStore.getState().stopSession('u1')
    await startP
    await sleep(800) // allow follow-up sync passes / retries

    expect(uploaded[uploaded.length - 1]?.status).toBe('stopped')
    expect(useFocusStore.getState().pendingRows).toHaveLength(0)
  })

  it('an interruption recorded during an in-flight upload still reaches the DB', async () => {
    const uploaded: Uploaded[] = []
    mockSlowUpsert(uploaded)

    const startP = useFocusStore.getState().startSession({ userId: 'u1', plannedSeconds: 1500 })
    await sleep(30)
    await useFocusStore.getState().incrementInterruptions()
    await startP
    await sleep(800)

    expect(uploaded[uploaded.length - 1]?.interruptions).toBe(1)
  })
})
