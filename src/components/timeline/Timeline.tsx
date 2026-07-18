import { useRef, useState, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react'
import type { Cue, Instrument, InstrumentCue, Singer, SingerCue } from '@/lib/types'
import { NUM_CAMERAS, MUSIC_TRACK_NUM, CAM_COLORS } from '@/lib/types'
import TimelineRuler from './TimelineRuler'
import TimelineTrack, { TimelineTrackLabel } from './TimelineTrack'

const SNAP_PX = 8

function snapToPoints(sec: number, points: number[], pxPerSec: number): number {
  const threshold = SNAP_PX / pxPerSec
  let best = sec
  let bestDist = threshold
  for (const p of points) {
    const d = Math.abs(p - sec)
    if (d < bestDist) { bestDist = d; best = p }
  }
  return best
}

function getSnapPoints(cues: { start_sec: number; end_sec: number; id: string }[], excludeId?: string): number[] {
  return cues.filter((c) => c.id !== excludeId).flatMap((c) => [c.start_sec, c.end_sec])
}

// ── Camera drag ops ──
type DragOp =
  | { type: 'idle' }
  | { type: 'creating'; camNum: number; startSec: number; endSec: number; containerRef: React.RefObject<HTMLDivElement | null> }
  | { type: 'moving'; cueId: string; startX: number; origStart: number; origEnd: number }
  | { type: 'resizing-left'; cueId: string; startX: number; origStart: number; origEnd: number }
  | { type: 'resizing-right'; cueId: string; startX: number; origEnd: number; origStart: number }

// ── Instrument drag ops ──
type InstrDragOp =
  | { type: 'idle' }
  | { type: 'creating'; instrumentId: string; startSec: number; endSec: number; containerRef: React.RefObject<HTMLDivElement | null> }
  | { type: 'moving'; cueId: string; startX: number; origStart: number; origEnd: number }
  | { type: 'resizing-left'; cueId: string; startX: number; origStart: number; origEnd: number }
  | { type: 'resizing-right'; cueId: string; startX: number; origEnd: number; origStart: number }

// ── Singer drag ops ──
type SingerDragOp =
  | { type: 'idle' }
  | { type: 'creating'; singerId: string; startSec: number; endSec: number; containerRef: React.RefObject<HTMLDivElement | null> }
  | { type: 'moving'; cueId: string; startX: number; origStart: number; origEnd: number }
  | { type: 'resizing-left'; cueId: string; startX: number; origStart: number; origEnd: number }
  | { type: 'resizing-right'; cueId: string; startX: number; origEnd: number; origStart: number }

export interface TimelineHandle {
  scrollToSec: (sec: number) => void
}

interface Props {
  cues: Cue[]
  durationSecs: number
  pxPerSec?: number
  onPxPerSecChange?: (px: number) => void
  readonly?: boolean
  playing?: boolean
  selectedCueId?: string | null
  playheadSec?: number
  songId?: string | null
  audioUrl?: string | null
  instruments?: Instrument[]
  instrumentCues?: InstrumentCue[]
  selectedInstrumentCueId?: string | null
  activeInstrumentId?: string | null
  singers?: Singer[]
  singerCues?: SingerCue[]
  selectedSingerCueId?: string | null
  activeSingerId?: string | null
  highlightCameraNumber?: number | null
  onCueCreate?: (cue: Omit<Cue, 'id'>) => Promise<Cue | null>
  onCueUpdate?: (id: string, patch: Partial<Omit<Cue, 'id' | 'song_id'>>) => void
  onCueSelect?: (id: string | null) => void
  onCueDelete?: (id: string) => void
  onInstrumentCueCreate?: (cue: Omit<InstrumentCue, 'id'>) => Promise<InstrumentCue | null>
  onInstrumentCueUpdate?: (id: string, patch: Partial<Pick<InstrumentCue, 'start_sec' | 'end_sec' | 'note'>>) => void
  onInstrumentCueSelect?: (id: string | null) => void
  onInstrumentCueDelete?: (id: string) => void
  onSingerCueCreate?: (cue: Omit<SingerCue, 'id'>) => Promise<SingerCue | null>
  onSingerCueUpdate?: (id: string, patch: Partial<Pick<SingerCue, 'start_sec' | 'end_sec' | 'note'>>) => void
  onSingerCueSelect?: (id: string | null) => void
  onSingerCueDelete?: (id: string) => void
  onSeek?: (sec: number) => void
}

const Timeline = forwardRef<TimelineHandle, Props>(function Timeline(
  {
    cues,
    durationSecs,
    pxPerSec = 14,
    onPxPerSecChange,
    readonly = false,
    playing = false,
    selectedCueId = null,
    playheadSec,
    songId,
    audioUrl,
    instruments = [],
    instrumentCues = [],
    selectedInstrumentCueId = null,
    activeInstrumentId = null,
    singers = [],
    singerCues = [],
    selectedSingerCueId = null,
    activeSingerId = null,
    highlightCameraNumber = null,
    onCueCreate,
    onCueUpdate,
    onCueSelect,
    onCueDelete,
    onInstrumentCueCreate,
    onInstrumentCueUpdate,
    onInstrumentCueSelect,
    onInstrumentCueDelete,
    onSingerCueCreate,
    onSingerCueUpdate,
    onSingerCueSelect,
    onSingerCueDelete,
    onSeek,
  },
  ref
) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const labelColRef = useRef<HTMLDivElement>(null)
  const [localCues, setLocalCues] = useState<Cue[]>(cues)
  const [localInstrumentCues, setLocalInstrumentCues] = useState<InstrumentCue[]>(instrumentCues)
  const [localSingerCues, setLocalSingerCues] = useState<SingerCue[]>(singerCues)
  const [dragOp, setDragOp] = useState<DragOp>({ type: 'idle' })
  const [instrDragOp, setInstrDragOp] = useState<InstrDragOp>({ type: 'idle' })
  const [singerDragOp, setSingerDragOp] = useState<SingerDragOp>({ type: 'idle' })

  useEffect(() => { if (dragOp.type === 'idle') setLocalCues(cues) }, [cues, dragOp.type])
  useEffect(() => { if (instrDragOp.type === 'idle') setLocalInstrumentCues(instrumentCues) }, [instrumentCues, instrDragOp.type])
  useEffect(() => { if (singerDragOp.type === 'idle') setLocalSingerCues(singerCues) }, [singerCues, singerDragOp.type])

  // Scroll changes triggered by our own code (tape mode, resets, scrollToSec)
  // are marked here so the user-scroll listener below can ignore them.
  const programmaticScrollUntilRef = useRef(0)
  const markProgrammaticScroll = () => { programmaticScrollUntilRef.current = performance.now() + 600 }

  useImperativeHandle(ref, () => ({
    scrollToSec(sec) {
      markProgrammaticScroll()
      scrollRef.current?.scrollTo({ left: Math.max(0, sec * pxPerSec), behavior: 'smooth' })
    },
  }))

  // Tape mode
  useEffect(() => {
    if (!playing || playheadSec == null) return
    const el = scrollRef.current
    if (el) { markProgrammaticScroll(); el.scrollLeft = Math.max(0, playheadSec * pxPerSec) }
  }, [playing, playheadSec, pxPerSec])

  // Reset scroll on playhead = 0
  useEffect(() => {
    if (playheadSec === 0) { markProgrammaticScroll(); scrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' }) }
  }, [playheadSec])

  // Two-finger / trackpad pan while paused scrubs the playhead — so pressing
  // play afterwards resumes from wherever the timeline was panned to.
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !onSeek || readonly) return
    const onScroll = () => {
      if (playing) return
      if (performance.now() < programmaticScrollUntilRef.current) return
      onSeek(Math.max(0, Math.min(durationSecs, el.scrollLeft / pxPerSec)))
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [onSeek, playing, pxPerSec, durationSecs, readonly])

  // Keep the fixed label column's vertical position in lockstep with the
  // scrollable area — it lives outside scrollRef so it never scrolls sideways.
  useEffect(() => {
    const el = scrollRef.current
    const labelCol = labelColRef.current
    if (!el || !labelCol) return
    const onScroll = () => { labelCol.style.transform = `translateY(${-el.scrollTop}px)` }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // Keep the time at the left edge stable whenever the zoom level changes
  // (pinch or +/- buttons), instead of jumping to a random new range.
  const prevPxPerSecRef = useRef(pxPerSec)
  useEffect(() => {
    const el = scrollRef.current
    if (el && prevPxPerSecRef.current !== pxPerSec) {
      markProgrammaticScroll()
      el.scrollLeft = (el.scrollLeft / prevPxPerSecRef.current) * pxPerSec
    }
    prevPxPerSecRef.current = pxPerSec
  }, [pxPerSec])

  // Pinch-to-zoom (two-finger touch)
  const pinchRef = useRef<{ startDist: number; startPx: number } | null>(null)
  const touchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchRef.current = { startDist: touchDistance(e.touches), startPx: pxPerSec }
    }
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current && onPxPerSecChange) {
      e.preventDefault()
      const scale = touchDistance(e.touches) / pinchRef.current.startDist
      onPxPerSecChange(pinchRef.current.startPx * scale)
    }
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchRef.current = null
  }

  const pointerToSec = useCallback((clientX: number) => {
    const el = scrollRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    return Math.max(0, Math.min(durationSecs, (clientX - rect.left + el.scrollLeft) / pxPerSec))
  }, [durationSecs, pxPerSec])

  // ── Camera track drag handlers ──

  const camOnPointerDownCreate = useCallback(
    (e: React.PointerEvent, camNum: number, containerRef: React.RefObject<HTMLDivElement | null>) => {
      if (readonly || !songId) return
      if (camNum === MUSIC_TRACK_NUM && localCues.some((c) => c.camera_number === MUSIC_TRACK_NUM)) return
      e.preventDefault()
      const el = scrollRef.current!
      const rect = containerRef.current!.getBoundingClientRect()
      const startSec = Math.max(0, (e.clientX - rect.left + el.scrollLeft) / pxPerSec)
      setDragOp({ type: 'creating', camNum, startSec, endSec: startSec, containerRef })
      const snapPts = getSnapPoints(localCues)
      const onMove = (me: PointerEvent) => {
        const rawEnd = Math.max(startSec, (me.clientX - rect.left + el.scrollLeft) / pxPerSec)
        const snapped = snapToPoints(rawEnd, snapPts, pxPerSec)
        setDragOp((d) => d.type === 'creating' ? { ...d, endSec: Math.min(snapped, durationSecs) } : d)
      }
      const onUp = async () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        setDragOp((prev) => {
          if (prev.type !== 'creating' || prev.endSec - prev.startSec < 0.5) return { type: 'idle' }
          onCueCreate?.({
            song_id: songId!,
            camera_number: prev.camNum,
            start_sec: Math.round(prev.startSec * 10) / 10,
            end_sec: Math.round(prev.endSec * 10) / 10,
            image_url: null,
            note: null,
          })
          return { type: 'idle' }
        })
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [readonly, songId, pxPerSec, localCues, durationSecs, onCueCreate]
  )

  const camOnPointerDownMove = useCallback(
    (e: React.PointerEvent, cueId: string) => {
      if (readonly) return
      e.preventDefault()
      const cue = localCues.find((c) => c.id === cueId)!
      const duration = cue.end_sec - cue.start_sec
      setDragOp({ type: 'moving', cueId, startX: e.clientX, origStart: cue.start_sec, origEnd: cue.end_sec })
      const snapPts = getSnapPoints(localCues, cueId)
      const onMove = (me: PointerEvent) => {
        const dx = (me.clientX - e.clientX) / pxPerSec
        let newStart = Math.max(0, cue.start_sec + dx)
        const snappedStart = snapToPoints(newStart, snapPts, pxPerSec)
        const snappedEnd = snapToPoints(newStart + duration, snapPts, pxPerSec)
        if (Math.abs(snappedStart - newStart) < Math.abs(snappedEnd - (newStart + duration))) newStart = snappedStart
        else newStart = snappedEnd - duration
        newStart = Math.max(0, Math.min(durationSecs - duration, newStart))
        setLocalCues((prev) => prev.map((c) => c.id === cueId ? { ...c, start_sec: newStart, end_sec: newStart + duration } : c))
      }
      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        setLocalCues((prev) => {
          const updated = prev.find((c) => c.id === cueId)
          if (updated) onCueUpdate?.(cueId, { start_sec: updated.start_sec, end_sec: updated.end_sec })
          return prev
        })
        setDragOp({ type: 'idle' })
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [readonly, pxPerSec, localCues, durationSecs, onCueUpdate]
  )

  const camOnPointerDownResizeLeft = useCallback(
    (e: React.PointerEvent, cueId: string) => {
      if (readonly) return
      e.preventDefault()
      const cue = localCues.find((c) => c.id === cueId)!
      setDragOp({ type: 'resizing-left', cueId, startX: e.clientX, origStart: cue.start_sec, origEnd: cue.end_sec })
      const snapPts = getSnapPoints(localCues, cueId)
      const onMove = (me: PointerEvent) => {
        const dx = (me.clientX - e.clientX) / pxPerSec
        const snapped = snapToPoints(cue.start_sec + dx, snapPts, pxPerSec)
        const newStart = Math.max(0, Math.min(cue.end_sec - 0.5, snapped))
        setLocalCues((prev) => prev.map((c) => c.id === cueId ? { ...c, start_sec: newStart } : c))
      }
      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        setLocalCues((prev) => {
          const updated = prev.find((c) => c.id === cueId)
          if (updated) onCueUpdate?.(cueId, { start_sec: updated.start_sec })
          return prev
        })
        setDragOp({ type: 'idle' })
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [readonly, pxPerSec, localCues, onCueUpdate]
  )

  const camOnPointerDownResizeRight = useCallback(
    (e: React.PointerEvent, cueId: string) => {
      if (readonly) return
      e.preventDefault()
      const cue = localCues.find((c) => c.id === cueId)!
      setDragOp({ type: 'resizing-right', cueId, startX: e.clientX, origEnd: cue.end_sec, origStart: cue.start_sec })
      const snapPts = getSnapPoints(localCues, cueId)
      const onMove = (me: PointerEvent) => {
        const dx = (me.clientX - e.clientX) / pxPerSec
        const snapped = snapToPoints(cue.end_sec + dx, snapPts, pxPerSec)
        const newEnd = Math.min(durationSecs, Math.max(cue.start_sec + 0.5, snapped))
        setLocalCues((prev) => prev.map((c) => c.id === cueId ? { ...c, end_sec: newEnd } : c))
      }
      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        setLocalCues((prev) => {
          const updated = prev.find((c) => c.id === cueId)
          if (updated) onCueUpdate?.(cueId, { end_sec: updated.end_sec })
          return prev
        })
        setDragOp({ type: 'idle' })
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [readonly, pxPerSec, localCues, durationSecs, onCueUpdate]
  )

  // ── Instrument track drag handlers ──

  const instOnPointerDownCreate = useCallback(
    (instrumentId: string) => (e: React.PointerEvent, containerRef: React.RefObject<HTMLDivElement | null>) => {
      if (readonly || !songId) return
      e.preventDefault()
      const el = scrollRef.current!
      const rect = containerRef.current!.getBoundingClientRect()
      const startSec = Math.max(0, (e.clientX - rect.left + el.scrollLeft) / pxPerSec)
      setInstrDragOp({ type: 'creating', instrumentId, startSec, endSec: startSec, containerRef })
      const snapPts = getSnapPoints(localInstrumentCues.filter((c) => c.instrument_id === instrumentId))
      const onMove = (me: PointerEvent) => {
        const rawEnd = Math.max(startSec, (me.clientX - rect.left + el.scrollLeft) / pxPerSec)
        const snapped = snapToPoints(rawEnd, snapPts, pxPerSec)
        setInstrDragOp((d) => d.type === 'creating' ? { ...d, endSec: Math.min(snapped, durationSecs) } : d)
      }
      const onUp = async () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        setInstrDragOp((prev) => {
          if (prev.type !== 'creating' || prev.endSec - prev.startSec < 0.5) return { type: 'idle' }
          onInstrumentCueCreate?.({
            song_id: songId!,
            instrument_id: prev.instrumentId,
            start_sec: Math.round(prev.startSec * 10) / 10,
            end_sec: Math.round(prev.endSec * 10) / 10,
            note: null,
          })
          return { type: 'idle' }
        })
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [readonly, songId, pxPerSec, localInstrumentCues, durationSecs, onInstrumentCueCreate]
  )

  const instOnPointerDownMove = useCallback(
    (e: React.PointerEvent, cueId: string) => {
      if (readonly) return
      e.preventDefault()
      const cue = localInstrumentCues.find((c) => c.id === cueId)!
      const duration = cue.end_sec - cue.start_sec

      // Alt/Option+drag: leave the original in place and drag off a copy;
      // the copy is only persisted (as a new cue) on release.
      if (e.altKey) {
        const tempId = `temp-${Date.now()}`
        const ghost: InstrumentCue = { ...cue, id: tempId }
        const snapPts = getSnapPoints(localInstrumentCues.filter((c) => c.instrument_id === cue.instrument_id))
        setLocalInstrumentCues((prev) => [...prev, ghost])
        setInstrDragOp({ type: 'moving', cueId: tempId, startX: e.clientX, origStart: cue.start_sec, origEnd: cue.end_sec })
        const onMove = (me: PointerEvent) => {
          const dx = (me.clientX - e.clientX) / pxPerSec
          let newStart = Math.max(0, Math.min(durationSecs - duration, cue.start_sec + dx))
          const snappedStart = snapToPoints(newStart, snapPts, pxPerSec)
          const snappedEnd = snapToPoints(newStart + duration, snapPts, pxPerSec)
          if (Math.abs(snappedStart - newStart) < Math.abs(snappedEnd - (newStart + duration))) newStart = snappedStart
          else newStart = snappedEnd - duration
          newStart = Math.max(0, Math.min(durationSecs - duration, newStart))
          setLocalInstrumentCues((prev) => prev.map((c) => c.id === tempId ? { ...c, start_sec: newStart, end_sec: newStart + duration } : c))
        }
        const onUp = () => {
          window.removeEventListener('pointermove', onMove)
          window.removeEventListener('pointerup', onUp)
          setLocalInstrumentCues((prev) => {
            const dropped = prev.find((c) => c.id === tempId)
            if (dropped) {
              onInstrumentCueCreate?.({
                song_id: cue.song_id,
                instrument_id: cue.instrument_id,
                start_sec: dropped.start_sec,
                end_sec: dropped.end_sec,
                note: cue.note,
              })
            }
            return prev.filter((c) => c.id !== tempId)
          })
          setInstrDragOp({ type: 'idle' })
        }
        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
        return
      }

      setInstrDragOp({ type: 'moving', cueId, startX: e.clientX, origStart: cue.start_sec, origEnd: cue.end_sec })
      const snapPts = getSnapPoints(localInstrumentCues.filter((c) => c.instrument_id === cue.instrument_id), cueId)
      const onMove = (me: PointerEvent) => {
        const dx = (me.clientX - e.clientX) / pxPerSec
        let newStart = Math.max(0, Math.min(durationSecs - duration, cue.start_sec + dx))
        const snappedStart = snapToPoints(newStart, snapPts, pxPerSec)
        const snappedEnd = snapToPoints(newStart + duration, snapPts, pxPerSec)
        if (Math.abs(snappedStart - newStart) < Math.abs(snappedEnd - (newStart + duration))) newStart = snappedStart
        else newStart = snappedEnd - duration
        newStart = Math.max(0, Math.min(durationSecs - duration, newStart))
        setLocalInstrumentCues((prev) => prev.map((c) => c.id === cueId ? { ...c, start_sec: newStart, end_sec: newStart + duration } : c))
      }
      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        setLocalInstrumentCues((prev) => {
          const updated = prev.find((c) => c.id === cueId)
          if (updated) onInstrumentCueUpdate?.(cueId, { start_sec: updated.start_sec, end_sec: updated.end_sec })
          return prev
        })
        setInstrDragOp({ type: 'idle' })
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [readonly, pxPerSec, localInstrumentCues, durationSecs, onInstrumentCueUpdate, onInstrumentCueCreate]
  )

  const instOnPointerDownResizeLeft = useCallback(
    (e: React.PointerEvent, cueId: string) => {
      if (readonly) return
      e.preventDefault()
      const cue = localInstrumentCues.find((c) => c.id === cueId)!
      setInstrDragOp({ type: 'resizing-left', cueId, startX: e.clientX, origStart: cue.start_sec, origEnd: cue.end_sec })
      const onMove = (me: PointerEvent) => {
        const dx = (me.clientX - e.clientX) / pxPerSec
        const newStart = Math.max(0, Math.min(cue.end_sec - 0.5, cue.start_sec + dx))
        setLocalInstrumentCues((prev) => prev.map((c) => c.id === cueId ? { ...c, start_sec: newStart } : c))
      }
      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        setLocalInstrumentCues((prev) => {
          const updated = prev.find((c) => c.id === cueId)
          if (updated) onInstrumentCueUpdate?.(cueId, { start_sec: updated.start_sec })
          return prev
        })
        setInstrDragOp({ type: 'idle' })
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [readonly, pxPerSec, localInstrumentCues, onInstrumentCueUpdate]
  )

  const instOnPointerDownResizeRight = useCallback(
    (e: React.PointerEvent, cueId: string) => {
      if (readonly) return
      e.preventDefault()
      const cue = localInstrumentCues.find((c) => c.id === cueId)!
      setInstrDragOp({ type: 'resizing-right', cueId, startX: e.clientX, origEnd: cue.end_sec, origStart: cue.start_sec })
      const onMove = (me: PointerEvent) => {
        const dx = (me.clientX - e.clientX) / pxPerSec
        const newEnd = Math.min(durationSecs, Math.max(cue.start_sec + 0.5, cue.end_sec + dx))
        setLocalInstrumentCues((prev) => prev.map((c) => c.id === cueId ? { ...c, end_sec: newEnd } : c))
      }
      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        setLocalInstrumentCues((prev) => {
          const updated = prev.find((c) => c.id === cueId)
          if (updated) onInstrumentCueUpdate?.(cueId, { end_sec: updated.end_sec })
          return prev
        })
        setInstrDragOp({ type: 'idle' })
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [readonly, pxPerSec, localInstrumentCues, durationSecs, onInstrumentCueUpdate]
  )

  // ── Singer track drag handlers ──

  const singerOnPointerDownCreate = useCallback(
    (singerId: string) => (e: React.PointerEvent, containerRef: React.RefObject<HTMLDivElement | null>) => {
      if (readonly || !songId) return
      e.preventDefault()
      const el = scrollRef.current!
      const rect = containerRef.current!.getBoundingClientRect()
      const startSec = Math.max(0, (e.clientX - rect.left + el.scrollLeft) / pxPerSec)
      setSingerDragOp({ type: 'creating', singerId, startSec, endSec: startSec, containerRef })
      const snapPts = getSnapPoints(localSingerCues.filter((c) => c.singer_id === singerId))
      const onMove = (me: PointerEvent) => {
        const rawEnd = Math.max(startSec, (me.clientX - rect.left + el.scrollLeft) / pxPerSec)
        const snapped = snapToPoints(rawEnd, snapPts, pxPerSec)
        setSingerDragOp((d) => d.type === 'creating' ? { ...d, endSec: Math.min(snapped, durationSecs) } : d)
      }
      const onUp = async () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        setSingerDragOp((prev) => {
          if (prev.type !== 'creating' || prev.endSec - prev.startSec < 0.5) return { type: 'idle' }
          onSingerCueCreate?.({
            song_id: songId!,
            singer_id: prev.singerId,
            start_sec: Math.round(prev.startSec * 10) / 10,
            end_sec: Math.round(prev.endSec * 10) / 10,
            note: null,
          })
          return { type: 'idle' }
        })
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [readonly, songId, pxPerSec, localSingerCues, durationSecs, onSingerCueCreate]
  )

  const singerOnPointerDownMove = useCallback(
    (e: React.PointerEvent, cueId: string) => {
      if (readonly) return
      e.preventDefault()
      const cue = localSingerCues.find((c) => c.id === cueId)!
      const duration = cue.end_sec - cue.start_sec

      // Alt/Option+drag: leave the original in place and drag off a copy;
      // the copy is only persisted (as a new cue) on release.
      if (e.altKey) {
        const tempId = `temp-${Date.now()}`
        const ghost: SingerCue = { ...cue, id: tempId }
        const snapPts = getSnapPoints(localSingerCues.filter((c) => c.singer_id === cue.singer_id))
        setLocalSingerCues((prev) => [...prev, ghost])
        setSingerDragOp({ type: 'moving', cueId: tempId, startX: e.clientX, origStart: cue.start_sec, origEnd: cue.end_sec })
        const onMove = (me: PointerEvent) => {
          const dx = (me.clientX - e.clientX) / pxPerSec
          let newStart = Math.max(0, Math.min(durationSecs - duration, cue.start_sec + dx))
          const snappedStart = snapToPoints(newStart, snapPts, pxPerSec)
          const snappedEnd = snapToPoints(newStart + duration, snapPts, pxPerSec)
          if (Math.abs(snappedStart - newStart) < Math.abs(snappedEnd - (newStart + duration))) newStart = snappedStart
          else newStart = snappedEnd - duration
          newStart = Math.max(0, Math.min(durationSecs - duration, newStart))
          setLocalSingerCues((prev) => prev.map((c) => c.id === tempId ? { ...c, start_sec: newStart, end_sec: newStart + duration } : c))
        }
        const onUp = () => {
          window.removeEventListener('pointermove', onMove)
          window.removeEventListener('pointerup', onUp)
          setLocalSingerCues((prev) => {
            const dropped = prev.find((c) => c.id === tempId)
            if (dropped) {
              onSingerCueCreate?.({
                song_id: cue.song_id,
                singer_id: cue.singer_id,
                start_sec: dropped.start_sec,
                end_sec: dropped.end_sec,
                note: cue.note,
              })
            }
            return prev.filter((c) => c.id !== tempId)
          })
          setSingerDragOp({ type: 'idle' })
        }
        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
        return
      }

      setSingerDragOp({ type: 'moving', cueId, startX: e.clientX, origStart: cue.start_sec, origEnd: cue.end_sec })
      const snapPts = getSnapPoints(localSingerCues.filter((c) => c.singer_id === cue.singer_id), cueId)
      const onMove = (me: PointerEvent) => {
        const dx = (me.clientX - e.clientX) / pxPerSec
        let newStart = Math.max(0, Math.min(durationSecs - duration, cue.start_sec + dx))
        const snappedStart = snapToPoints(newStart, snapPts, pxPerSec)
        const snappedEnd = snapToPoints(newStart + duration, snapPts, pxPerSec)
        if (Math.abs(snappedStart - newStart) < Math.abs(snappedEnd - (newStart + duration))) newStart = snappedStart
        else newStart = snappedEnd - duration
        newStart = Math.max(0, Math.min(durationSecs - duration, newStart))
        setLocalSingerCues((prev) => prev.map((c) => c.id === cueId ? { ...c, start_sec: newStart, end_sec: newStart + duration } : c))
      }
      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        setLocalSingerCues((prev) => {
          const updated = prev.find((c) => c.id === cueId)
          if (updated) onSingerCueUpdate?.(cueId, { start_sec: updated.start_sec, end_sec: updated.end_sec })
          return prev
        })
        setSingerDragOp({ type: 'idle' })
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [readonly, pxPerSec, localSingerCues, durationSecs, onSingerCueUpdate, onSingerCueCreate]
  )

  const singerOnPointerDownResizeLeft = useCallback(
    (e: React.PointerEvent, cueId: string) => {
      if (readonly) return
      e.preventDefault()
      const cue = localSingerCues.find((c) => c.id === cueId)!
      setSingerDragOp({ type: 'resizing-left', cueId, startX: e.clientX, origStart: cue.start_sec, origEnd: cue.end_sec })
      const onMove = (me: PointerEvent) => {
        const dx = (me.clientX - e.clientX) / pxPerSec
        const newStart = Math.max(0, Math.min(cue.end_sec - 0.5, cue.start_sec + dx))
        setLocalSingerCues((prev) => prev.map((c) => c.id === cueId ? { ...c, start_sec: newStart } : c))
      }
      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        setLocalSingerCues((prev) => {
          const updated = prev.find((c) => c.id === cueId)
          if (updated) onSingerCueUpdate?.(cueId, { start_sec: updated.start_sec })
          return prev
        })
        setSingerDragOp({ type: 'idle' })
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [readonly, pxPerSec, localSingerCues, onSingerCueUpdate]
  )

  const singerOnPointerDownResizeRight = useCallback(
    (e: React.PointerEvent, cueId: string) => {
      if (readonly) return
      e.preventDefault()
      const cue = localSingerCues.find((c) => c.id === cueId)!
      setSingerDragOp({ type: 'resizing-right', cueId, startX: e.clientX, origEnd: cue.end_sec, origStart: cue.start_sec })
      const onMove = (me: PointerEvent) => {
        const dx = (me.clientX - e.clientX) / pxPerSec
        const newEnd = Math.min(durationSecs, Math.max(cue.start_sec + 0.5, cue.end_sec + dx))
        setLocalSingerCues((prev) => prev.map((c) => c.id === cueId ? { ...c, end_sec: newEnd } : c))
      }
      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        setLocalSingerCues((prev) => {
          const updated = prev.find((c) => c.id === cueId)
          if (updated) onSingerCueUpdate?.(cueId, { end_sec: updated.end_sec })
          return prev
        })
        setSingerDragOp({ type: 'idle' })
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [readonly, pxPerSec, localSingerCues, durationSecs, onSingerCueUpdate]
  )

  // Delete key
  useEffect(() => {
    if (readonly) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return
      if (selectedCueId) onCueDelete?.(selectedCueId)
      if (selectedInstrumentCueId) onInstrumentCueDelete?.(selectedInstrumentCueId)
      if (selectedSingerCueId) onSingerCueDelete?.(selectedSingerCueId)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [readonly, selectedCueId, selectedInstrumentCueId, selectedSingerCueId, onCueDelete, onInstrumentCueDelete, onSingerCueDelete])

  const displayCues = dragOp.type === 'idle' ? cues : localCues
  const displayInstrumentCues = instrDragOp.type === 'idle' ? instrumentCues : localInstrumentCues
  const displaySingerCues = singerDragOp.type === 'idle' ? singerCues : localSingerCues

  return (
    <div
      className="relative flex-1 overflow-hidden no-select flex"
      style={{ background: '#0B0C0E', cursor: dragOp.type !== 'idle' || instrDragOp.type !== 'idle' || singerDragOp.type !== 'idle' ? 'grabbing' : undefined }}
    >
      {/* Fixed label column — lives outside the horizontally scrolling area so
          labels never rely on position:sticky (Safari can fail to keep those
          pinned during fast scrolls). Vertical position is synced in JS. */}
      <div className="flex-shrink-0 overflow-hidden border-r border-border" style={{ width: 56, background: '#0F1114' }}>
        <div ref={labelColRef}>
          <div style={{ height: 28 }} />
          {instruments.length > 0 && <TimelineTrackLabel trackLabel="INST" trackColor="#6B6F76" trackHeight={48} />}
          {singers.length > 0 && <TimelineTrackLabel trackLabel="VOCES" trackColor="#6B6F76" trackHeight={48} />}
          {Array.from({ length: NUM_CAMERAS }, (_, i) => i + 1).map((camNum) => (
            <div
              key={camNum}
              style={highlightCameraNumber === camNum ? {
                background: `${CAM_COLORS[camNum - 1]}14`,
                boxShadow: `inset 3px 0 0 ${CAM_COLORS[camNum - 1]}`,
              } : undefined}
            >
              <TimelineTrackLabel cameraNumber={camNum} />
            </div>
          ))}
          <TimelineTrackLabel cameraNumber={MUSIC_TRACK_NUM} />
        </div>
      </div>

      <div
        ref={scrollRef}
        className="overflow-x-auto overflow-y-auto h-full flex-1"
        style={{ touchAction: 'pan-x pan-y' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Ruler */}
        <div className="sticky top-0 z-20" style={{ background: '#0F1114' }}>
          <div
            className="relative"
            style={{ cursor: onSeek ? 'pointer' : 'default' }}
            onClick={onSeek ? (e) => {
              const sec = pointerToSec(e.clientX)
              onSeek(sec)
              const el = scrollRef.current
              if (el) el.scrollLeft = Math.max(0, sec * pxPerSec)
            } : undefined}
          >
            <TimelineRuler durationSecs={durationSecs} pxPerSec={pxPerSec} />
          </div>
        </div>

        {/* Single instrument track — first, above cameras */}
        {instruments.length > 0 && (
          <TimelineTrack
            trackLabel="INST"
            trackColor="#6B6F76"
            trackHeight={48}
            cues={displayInstrumentCues}
            durationSecs={durationSecs}
            pxPerSec={pxPerSec}
            selectedCueId={selectedInstrumentCueId}
            readonly={readonly || !activeInstrumentId}
            onSelectCue={(id) => { onCueSelect?.(null); onSingerCueSelect?.(null); onInstrumentCueSelect?.(id) }}
            ghostCue={instrDragOp.type === 'creating'
              ? { start_sec: instrDragOp.startSec, end_sec: instrDragOp.endSec }
              : null}
            getClipStyle={(cueId) => {
              const ic = displayInstrumentCues.find((c) => c.id === cueId)
              const inst = ic ? instruments.find((i) => i.id === ic.instrument_id) : null
              return inst
                ? { color: inst.color, label: inst.name, imageUrl: inst.image_url, imageFullOpacity: true }
                : { color: '#6B6F76', label: '?', imageUrl: null }
            }}
            dragHandlers={readonly || !activeInstrumentId ? undefined : {
              onPointerDownMove: instOnPointerDownMove,
              onPointerDownResizeLeft: instOnPointerDownResizeLeft,
              onPointerDownResizeRight: instOnPointerDownResizeRight,
              onPointerDownCreate: instOnPointerDownCreate(activeInstrumentId!),
            }}
          />
        )}

        {/* Single singer track — above cameras, below instruments */}
        {singers.length > 0 && (
          <TimelineTrack
            trackLabel="VOCES"
            trackColor="#6B6F76"
            trackHeight={48}
            cues={displaySingerCues}
            durationSecs={durationSecs}
            pxPerSec={pxPerSec}
            selectedCueId={selectedSingerCueId}
            readonly={readonly || !activeSingerId}
            onSelectCue={(id) => { onCueSelect?.(null); onInstrumentCueSelect?.(null); onSingerCueSelect?.(id) }}
            ghostCue={singerDragOp.type === 'creating'
              ? { start_sec: singerDragOp.startSec, end_sec: singerDragOp.endSec }
              : null}
            getClipStyle={(cueId) => {
              const sc = displaySingerCues.find((c) => c.id === cueId)
              const singer = sc ? singers.find((s) => s.id === sc.singer_id) : null
              return singer
                ? { color: singer.color, label: singer.name, imageUrl: singer.image_url, imageFullOpacity: true }
                : { color: '#6B6F76', label: '?', imageUrl: null }
            }}
            dragHandlers={readonly || !activeSingerId ? undefined : {
              onPointerDownMove: singerOnPointerDownMove,
              onPointerDownResizeLeft: singerOnPointerDownResizeLeft,
              onPointerDownResizeRight: singerOnPointerDownResizeRight,
              onPointerDownCreate: singerOnPointerDownCreate(activeSingerId!),
            }}
          />
        )}

        {/* Camera tracks */}
        {Array.from({ length: NUM_CAMERAS }, (_, i) => i + 1).map((camNum) => (
          <div
            key={camNum}
            style={highlightCameraNumber === camNum ? {
              background: `${CAM_COLORS[camNum - 1]}14`,
              boxShadow: `inset 3px 0 0 ${CAM_COLORS[camNum - 1]}`,
            } : undefined}
          >
          <TimelineTrack
            cameraNumber={camNum}
            cues={displayCues.filter((c) => c.camera_number === camNum)}
            durationSecs={durationSecs}
            pxPerSec={pxPerSec}
            selectedCueId={selectedCueId}
            readonly={readonly}
            onSelectCue={(id) => { onInstrumentCueSelect?.(null); onSingerCueSelect?.(null); onCueSelect?.(id) }}
            ghostCue={dragOp.type === 'creating' && dragOp.camNum === camNum
              ? { start_sec: dragOp.startSec, end_sec: dragOp.endSec } : null}
            dragHandlers={readonly ? undefined : {
              onPointerDownMove: camOnPointerDownMove,
              onPointerDownResizeLeft: camOnPointerDownResizeLeft,
              onPointerDownResizeRight: camOnPointerDownResizeRight,
              onPointerDownCreate: (e, ref) => camOnPointerDownCreate(e, camNum, ref),
            }}
          />
          </div>
        ))}

        {/* MÚSICA track — last */}
        <TimelineTrack
          cameraNumber={MUSIC_TRACK_NUM}
          audioUrl={audioUrl}
          cues={displayCues.filter((c) => c.camera_number === MUSIC_TRACK_NUM)}
          durationSecs={durationSecs}
          pxPerSec={pxPerSec}
          selectedCueId={selectedCueId}
          readonly={readonly}
          onSelectCue={(id) => { onInstrumentCueSelect?.(null); onSingerCueSelect?.(null); onCueSelect?.(id) }}
          ghostCue={dragOp.type === 'creating' && dragOp.camNum === MUSIC_TRACK_NUM
            ? { start_sec: dragOp.startSec, end_sec: dragOp.endSec } : null}
          dragHandlers={readonly ? undefined : {
            onPointerDownMove: camOnPointerDownMove,
            onPointerDownResizeLeft: camOnPointerDownResizeLeft,
            onPointerDownResizeRight: camOnPointerDownResizeRight,
            onPointerDownCreate: (e, ref) => camOnPointerDownCreate(e, MUSIC_TRACK_NUM, ref),
          }}
        />
      </div>

      {/* Fixed playhead */}
      {playheadSec != null && (
        <div
          className="absolute top-0 bottom-0 z-30 pointer-events-none"
          style={{ left: 56, width: 2, background: '#E1262C', opacity: 0.9 }}
        >
          <div style={{
            position: 'absolute', top: 0, left: -5,
            width: 12, height: 12,
            background: '#E1262C',
            clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
          }} />
        </div>
      )}
    </div>
  )
})

export default Timeline
