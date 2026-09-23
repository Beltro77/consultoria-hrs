import { supabase } from '@/lib/supabase'

const TABLE = 'push_subscriptions'

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const array = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) array[i] = rawData.charCodeAt(i)
  return array
}

export async function subscribeToPush(): Promise<void> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!publicKey) throw new Error('NEXT_PUBLIC_VAPID_PUBLIC_KEY no configurada')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Permiso de notificaciones denegado')

  const registration = await navigator.serviceWorker.register('/push-sw.js')
  await navigator.serviceWorker.ready

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  })

  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id
  if (!userId) throw new Error('No hay sesión activa')

  const json = subscription.toJSON()
  const { error } = await supabase.from(TABLE).upsert({
    user_id: userId,
    endpoint: json.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
  }, { onConflict: 'endpoint' })

  if (error) {
    console.error('Error guardando la suscripción push:', error)
    throw error
  }
}

export async function getPushSubscriptionStatus(): Promise<NotificationPermission | 'unsupported'> {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission
}

// Se llama sola al entrar al dashboard: si nunca se pidió el permiso, lo pide
// (dispara el prompt del navegador); si ya estaba concedido, revalida/renueva
// la suscripción en silencio (sin mostrar nada). Nunca lanza: solo loguea.
export async function ensurePushSubscription(): Promise<void> {
  if (!isPushSupported()) return
  if (Notification.permission === 'denied') return
  try {
    await subscribeToPush()
  } catch (e) {
    console.error('No se pudo activar el push automáticamente:', e)
  }
}
