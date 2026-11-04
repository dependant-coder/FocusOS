import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { QueryClient, dehydrate, hydrate, onlineManager } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { registerMutationDefaults, MUTATION_KEYS } from '../lib/mutationDefaults'

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
})
