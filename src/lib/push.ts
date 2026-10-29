import { supabase } from './supabase'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // @ts-expect-error - iOS Safari specific property
    Boolean(window.navigator.standalone)
  )
}

export function getPermissionState(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  const reg = await navigator.serviceWorker.ready
  return await reg.pushManager.getSubscription()
}

export async function subscribeToPush(userId: string): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) {
    return { success: false, error: 'Push notifications are not supported on this browser.' }
  }

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!vapidPublicKey) {
    return { success: false, error: 'VAPID public key is not configured.' }
  }

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      return { success: false, error: 'Notification permission was denied.' }
    }

    const registration = await navigator.serviceWorker.ready
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // Passing ArrayBuffer
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      })
    }

    const rawJson = subscription.toJSON()
    const p256dh = rawJson.keys?.p256dh
    const auth = rawJson.keys?.auth

    if (!p256dh || !auth) {
      return { success: false, error: 'Failed to extract push encryption keys.' }
    }

    // Persist to push_subscriptions table
    const { error: dbError } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent,
      },
      { onConflict: 'endpoint' }
    )

    if (dbError) throw dbError

    // Also enable notifications flag in profiles
    await supabase.from('profiles').update({ notif_on: true }).eq('id', userId)

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Subscription failed'
    console.error('[FocusOS Push Error]:', err)
    return { success: false, error: message }
  }
}

export async function unsubscribeFromPush(userId: string): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) return { success: true }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()
      // Remove from database
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', subscription.endpoint)
    }

    // Disable in profile
    await supabase.from('profiles').update({ notif_on: false }).eq('id', userId)
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unsubscribe failed'
    return { success: false, error: message }
  }
}
