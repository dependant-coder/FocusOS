import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { QueryClient, dehydrate, hydrate, onlineManager } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { registerMutationDefaults, MUTATION_KEYS } from '../lib/mutationDefaults'
import * as datesModule from '../lib/dates'

describe('P2-5 Offline Writes & Resumed Mutations', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    onlineManager.setOnline(true)
  })

  afterEach(() => {
    onlineManager.setOnline(true)
  })

  it('offline toggle -> reload (new QueryClient) -> mutation resumes once', async () => {
    // Mock user auth
    vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: {
        user: { id: 'test-offline-user', email: 'test@offline.dev' } as unknown as import('@supabase/supabase-js').User,
      },
      error: null,
    })

    // Mock supabase update call
    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    })
    vi.spyOn(supabase, 'from').mockReturnValue({
      update: updateSpy,
    } as unknown as ReturnType<typeof supabase.from>)

    // 1. Initial client while OFFLINE
    onlineManager.setOnline(false)

    const client1 = new QueryClient({
      defaultOptions: {
        mutations: {
          retry: 1,
        },
      },
    })
    registerMutationDefaults(client1)

    // Trigger toggle mutation while offline
    const mutation = client1.getMutationCache().build(client1, {
      mutationKey: MUTATION_KEYS.toggleDailyTodo,
    })

    // Execute mutation while offline - should pause
    const executePromise = mutation.execute({
      id: 'todo-offline-1',
      done: true,
      habitId: null,
      date: '2026-10-30',
      userId: 'test-offline-user',
    })
    void executePromise

    // Allow mutation to enter paused state
    await new Promise((r) => setTimeout(r, 20))

    expect(mutation.state.isPaused).toBe(true)
    expect(updateSpy).not.toHaveBeenCalled()

    // 2. Persist state across "reload" (dehydrate paused mutations)
    const dehydrated = dehydrate(client1, {
      shouldDehydrateMutation: () => true,
    })

    expect(dehydrated.mutations.length).toBe(1)
    expect(dehydrated.mutations[0].mutationKey).toEqual(MUTATION_KEYS.toggleDailyTodo)

    // 3. Simulate reload with a brand new QueryClient
    const client2 = new QueryClient({
      defaultOptions: {
        mutations: {
          retry: 1,
        },
      },
    })
    // Must register mutation defaults on the new client so it knows how to execute paused mutations
    registerMutationDefaults(client2)

    // Hydrate paused mutations into the new QueryClient
    hydrate(client2, dehydrated)

    const pausedMutations = client2.getMutationCache().getAll()
    expect(pausedMutations.length).toBe(1)
    expect(pausedMutations[0].state.isPaused).toBe(true)

    // 4. Come back online and resume mutations
    onlineManager.setOnline(true)
    await client2.resumePausedMutations()

    // Allow async execution to complete
    await new Promise((r) => setTimeout(r, 50))

    // 5. Assert mutation resumed and synced to backend exactly once
    expect(updateSpy).toHaveBeenCalledTimes(1)
    expect(updateSpy).toHaveBeenCalledWith({ done: true })

    // Calling resumePausedMutations again does not duplicate executions
    await client2.resumePausedMutations()
    expect(updateSpy).toHaveBeenCalledTimes(1)
  })

  // Test 1: (1) offline create task then update it, reload, replay -> final state has the update
  it('offline create task then update it, reload, replay -> final state has the update in order via scope', async () => {
    const executionOrder: string[] = []

    const selectUpsertMock = vi.fn().mockResolvedValue({
      data: [{ id: 'task-offline-scoped', title: 'Task Initial', user_id: 'user-scoped' }],
      error: null,
    })
    const upsertMock = vi.fn().mockImplementation((payload: { title: string }) => {
      executionOrder.push(`create:${payload.title}`)
      return { select: selectUpsertMock }
    })

    const selectUpdateMock = vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'task-offline-scoped', title: 'Task Updated Final' },
        error: null,
      }),
    })
    const updateEqMock = vi.fn().mockImplementation(() => ({
      select: selectUpdateMock,
    }))
    const updateMock = vi.fn().mockImplementation((payload: { title: string }) => {
      executionOrder.push(`update:${payload.title}`)
      return { eq: updateEqMock }
    })

    vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      if (table === 'tasks') {
        return {
          upsert: upsertMock,
          update: updateMock,
        }
      }
      return {}
    }) as unknown as typeof supabase.from)

    // Client 1 offline
    onlineManager.setOnline(false)
    const client1 = new QueryClient()
    registerMutationDefaults(client1)

    const createMutation = client1.getMutationCache().build(client1, {
      mutationKey: MUTATION_KEYS.createTask,
    })
    const updateMutation = client1.getMutationCache().build(client1, {
      mutationKey: MUTATION_KEYS.updateTask,
    })

    // Enqueue create then update while offline
    void createMutation.execute({
      id: 'task-offline-scoped',
      title: 'Task Initial',
      category: 'personal',
      priority: 'medium',
      userId: 'user-scoped',
    })

    void updateMutation.execute({
      id: 'task-offline-scoped',
      title: 'Task Updated Final',
      userId: 'user-scoped',
    })

    await new Promise((r) => setTimeout(r, 20))

    // Dehydrate
    const dehydrated = dehydrate(client1, {
      shouldDehydrateMutation: () => true,
    })
    expect(dehydrated.mutations.length).toBe(2)

    // Reload into Client 2
    const client2 = new QueryClient()
    registerMutationDefaults(client2)
    hydrate(client2, dehydrated)

    // Come back online & resume
    onlineManager.setOnline(true)
    await client2.resumePausedMutations()
    await new Promise((r) => setTimeout(r, 60))

    // Assert operations executed in order: create first, then update
    expect(executionOrder).toEqual(['create:Task Initial', 'update:Task Updated Final'])
  })

  // Test 2: (2) adhoc todo created before midnight replays after midnight with the ORIGINAL date
  it('adhoc todo created before midnight replays after midnight with the ORIGINAL date', async () => {
    let insertedPayload: Record<string, unknown> | null = null

    const selectMock = vi.fn().mockResolvedValue({
      data: [{ id: 'adhoc-before-midnight', title: 'Submit essay draft', date: '2026-11-04' }],
      error: null,
    })
    const upsertMock = vi.fn().mockImplementation((insert: Record<string, unknown>) => {
      insertedPayload = insert
      return { select: selectMock }
    })

    vi.spyOn(supabase, 'from').mockReturnValue({
      upsert: upsertMock,
    } as unknown as ReturnType<typeof supabase.from>)

    // 1. Created before midnight (date = 2026-11-04) while offline
    onlineManager.setOnline(false)
    const client1 = new QueryClient()
    registerMutationDefaults(client1)

    const mutation = client1.getMutationCache().build(client1, {
      mutationKey: MUTATION_KEYS.createAdhocTodo,
    })

    // Call time date is captured before midnight
    const originalDate = '2026-11-04'
    void mutation.execute({
      id: 'adhoc-before-midnight',
      title: 'Submit essay draft',
      date: originalDate,
      userId: 'user-midnight-test',
    })

    await new Promise((r) => setTimeout(r, 20))

    // Dehydrate
    const dehydrated = dehydrate(client1, {
      shouldDehydrateMutation: () => true,
    })

    // 2. Midnight passes: todayLocal() now returns 2026-11-05
    vi.spyOn(datesModule, 'todayLocal').mockReturnValue('2026-11-05')

    // 3. Reload into Client 2 after midnight
    const client2 = new QueryClient()
    registerMutationDefaults(client2)
    hydrate(client2, dehydrated)

    // Online & resume
    onlineManager.setOnline(true)
    await client2.resumePausedMutations()
    await new Promise((r) => setTimeout(r, 50))

    // Verify it used the ORIGINAL captured date '2026-11-04', NOT the new post-midnight date
    expect(insertedPayload).not.toBeNull()
    expect((insertedPayload as unknown as Record<string, unknown>)?.date).toBe('2026-11-04')
  })

  // Test 3: (3) replaying an already-applied create does not error
  it('replaying an already-applied create does not error (idempotent upsert with ignoreDuplicates)', async () => {
    // When replaying an already-applied insert, ignoreDuplicates returns no rows in .select()
    const selectEmptyMock = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    })
    const upsertMock = vi.fn().mockReturnValue({
      select: selectEmptyMock,
    })

    // Then it fetches the existing record by id via .maybeSingle()
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: { id: 'task-already-exists', title: 'Already created task', user_id: 'user-replay' },
      error: null,
    })
    const eqMock = vi.fn().mockReturnValue({
      maybeSingle: maybeSingleMock,
    })
    const selectFetchMock = vi.fn().mockReturnValue({
      eq: eqMock,
    })

    vi.spyOn(supabase, 'from').mockReturnValue({
      upsert: upsertMock,
      select: selectFetchMock,
    } as unknown as ReturnType<typeof supabase.from>)

    const client = new QueryClient()
    registerMutationDefaults(client)

    const mutation = client.getMutationCache().build(client, {
      mutationKey: MUTATION_KEYS.createTask,
    })

    // Replay execution should resolve successfully without throwing
    const result = await mutation.execute({
      id: 'task-already-exists',
      title: 'Already created task',
      category: 'personal',
      priority: 'high',
      userId: 'user-replay',
    })

    expect(result).toEqual({
      id: 'task-already-exists',
      title: 'Already created task',
      user_id: 'user-replay',
    })
  })
})
