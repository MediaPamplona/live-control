import { useEffect, useRef, useCallback } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { ClockState } from '@/lib/types'

const CLOCK_EVENT = 'clock'
const KEEPALIVE_MS = 2000

export function useDirectorBroadcast(showCode: string) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const lastStateRef = useRef<ClockState | null>(null)
  const keepaliveRef = useRef<number | null>(null)

  useEffect(() => {
    if (!showCode) return
    const ch = supabase.channel(`show:${showCode}`)
    channelRef.current = ch
    ch.subscribe()

    keepaliveRef.current = window.setInterval(() => {
      if (lastStateRef.current) {
        ch.send({ type: 'broadcast', event: CLOCK_EVENT, payload: lastStateRef.current })
      }
    }, KEEPALIVE_MS)

    return () => {
      if (keepaliveRef.current) clearInterval(keepaliveRef.current)
      ch.unsubscribe()
      channelRef.current = null
    }
  }, [showCode])

  const broadcast = useCallback((state: ClockState) => {
    lastStateRef.current = state
    channelRef.current?.send({
      type: 'broadcast',
      event: CLOCK_EVENT,
      payload: state,
    })
  }, [])

  return { broadcast }
}

export function useCameraReceive(
  showCode: string,
  onClock: (state: ClockState) => void
) {
  const onClockRef = useRef(onClock)
  onClockRef.current = onClock

  useEffect(() => {
    if (!showCode) return
    const ch = supabase
      .channel(`show:${showCode}`)
      .on('broadcast', { event: CLOCK_EVENT }, ({ payload }: { payload: unknown }) => {
        onClockRef.current(payload as ClockState)
      })
      .subscribe()

    return () => {
      ch.unsubscribe()
    }
  }, [showCode])
}
