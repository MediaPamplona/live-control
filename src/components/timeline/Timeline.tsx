import { useRef, useState, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react'
import type { Cue } from '@/lib/types'
import { NUM_CAMERAS } from '@/lib/types'
import TimelineRuler from './TimelineRuler'
import TimelineTrack from './TimelineTrack'

// Snap threshold in pixels
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

function getSnapPoints(cues: Cue[], excludeId?: string): number[] {
  return cues
    .filter((c) => c.id !== excludeId)
    .flatMap((c) => [c.start_sec, c.end_sec])
}

type DragOp =
  | { type: 'idle' }
  | { type: 'creating'; camNum: number; startSec: number; endSec: number; containerRef: React.RefObject<HTMLDivElement | null> }
  | { type: 'moving'; cue: Cue; startX: number; origStart: number; origEnd: number }
  | { type: 'resizing-left'; cue: Cue; startX: number; origStart: number }
  | { type: 'resizing-right'; cue: Cue; startX: number; origEnd: number }

export interface TimelineHandle {
  scrollToSec: (sec: number) => void
}

interface Props {
  cues: Cue[]
  durationSecs: number
  pxPerSec?: number
  readonly?: boolean
  selectedCueId?: string | null
  playheadSec?: number
  songId?: string | null
  onCueCreate?: (cue: Omit<Cue, 'id'>) => Promise<Cue | null>
  onCueUpdate?: (id: string, patch: Partial<Omit<Cue, 'id' | 'song_id'>>) => void
  onCueSelect?: (id: string | null) => void
}

const Timeline = forwardRef<TimelineHandle, Props>(function Timeline(
  {
    cues,
    durationSecs,
    pxPerSec = 14,
    readonly = false,
    selectedCueId = null,
    playheadSec,
    songId,
    onCueCreate,
    onCueUpdate,
    onCueSelect,
  },
  ref
) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [localCues, setLocalCues] = useState<Cue[]>(cues)
  const [dragOp, setDragOp] = useState<DragOp>({ type: 'idle' })

  // Keep localCues in sync with incoming cues (from DB)
  useEffect(() => {
    if (dragOp.type === 'idle') setLocalCues(cues)
  }, [cues, dragOp.type])

  useImperativeHandle(ref, () => ({
    scrollToSec(sec) {
      const el = scrollRef.current
      if (!el) return
      const targetScroll = sec * pxPerSec - el.clientWidth / 2
      el.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' })
    },
  }))

  // Auto-scroll playhead into view in readonly (director) mode
  useEffect(() => {
    if (!readonly || playheadSec == null) return
    const el = scrollRef.current
    if (!el) return
    const playheadPx = playheadSec * pxPerSec
    const margin = 80
    if (playheadPx < el.scrollLeft + margin || playheadPx > el.scrollLeft + el.clientWidth - margin) {
      el.scrollTo({ left: Math.max(0, playheadPx - el.clientWidth / 3), behavior: 'smooth' })
    }
  }, [playheadSec, pxPerSec, readonly])

  // ───── Drag handlers ─────

  const onPointerDownCreate = useCallback(
    (e: React.PointerEvent, camNum: number, containerRef: React.RefObject<HTMLDivElement | null>) => {
      if (readonly || !songId) return
      e.preventDefault()
      const el = scrollRef.current!
      const rect = containerRef.current!.getBoundingClientRect()
      const scrollLeft = el.scrollLeft
      const startSec = Math.max(0, (e.clientX - rect.left + scrollLeft) / pxPerSec)

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
          if (prev.type !== 'creating' || prev.endSec - prev.startSec < 0.5) {
            return { type: 'idle' }
          }
          const newCue: Omit<Cue, 'id'> = {
            song_id: songId!,
            camera_number: prev.camNum,
            start_sec: Math.round(prev.startSec * 10) / 10,
            end_sec: Math.round(prev.endSec * 10) / 10,
            image_url: null,
            note: null,
          }
          onCueCreate?.(newCue)
          return { type: 'idle' }
        })
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [readonly, songId, pxPerSec, localCues, durationSecs, onCueCreate]
  )

  const onPointerDownMove = useCallback(
    (e: React.PointerEvent, cue: Cue) => {
      if (readonly) return
      e.preventDefault()
      const op: DragOp = { type: 'moving', cue, startX: e.clientX, origStart: cue.start_sec, origEnd: cue.end_sec }
      setDragOp(op)
      const duration = cue.end_sec - cue.start_sec
      const snapPts = getSnapPoints(localCues, cue.id)

      const onMove = (me: PointerEvent) => {
        const dx = (me.clientX - e.clientX) / pxPerSec
        let newStart = Math.max(0, cue.start_sec + dx)
        const snappedStart = snapToPoints(newStart, snapPts, pxPerSec)
        const snappedEnd = snapToPoints(newStart + duration, snapPts, pxPerSec)
        if (Math.abs(snappedStart - newStart) < Math.abs(snappedEnd - (newStart + duration))) {
          newStart = snappedStart
        } else {
          newStart = snappedEnd - duration
        }
        newStart = Math.max(0, Math.min(durationSecs - duration, newStart))
        setLocalCues((prev) =>
          prev.map((c) => c.id === cue.id ? { ...c, start_sec: newStart, end_sec: newStart + duration } : c)
        )
      }
      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        setLocalCues((prev) => {
          const updated = prev.find((c) => c.id === cue.id)
          if (updated) {
            onCueUpdate?.(cue.id, { start_sec: updated.start_sec, end_sec: updated.end_sec })
          }
          return prev
        })
        setDragOp({ type: 'idle' })
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [readonly, pxPerSec, localCues, durationSecs, onCueUpdate]
  )

  const onPointerDownResizeLeft = useCallback(
    (e: React.PointerEvent, cue: Cue) => {
      if (readonly) return
      e.preventDefault()
      setDragOp({ type: 'resizing-left', cue, startX: e.clientX, origStart: cue.start_sec })
      const snapPts = getSnapPoints(localCues, cue.id)

      const onMove = (me: PointerEvent) => {
        const dx = (me.clientX - e.clientX) / pxPerSec
        const rawStart = cue.start_sec + dx
        const snapped = snapToPoints(rawStart, snapPts, pxPerSec)
        const newStart = Math.max(0, Math.min(cue.end_sec - 0.5, snapped))
        setLocalCues((prev) =>
          prev.map((c) => c.id === cue.id ? { ...c, start_sec: newStart } : c)
        )
      }
      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        setLocalCues((prev) => {
          const updated = prev.find((c) => c.id === cue.id)
          if (updated) onCueUpdate?.(cue.id, { start_sec: updated.start_sec })
          return prev
        })
        setDragOp({ type: 'idle' })
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [readonly, pxPerSec, localCues, onCueUpdate]
  )

  const onPointerDownResizeRight = useCallback(
    (e: React.PointerEvent, cue: Cue) => {
      if (readonly) return
      e.preventDefault()
      setDragOp({ type: 'resizing-right', cue, startX: e.clientX, origEnd: cue.end_sec })
      const snapPts = getSnapPoints(localCues, cue.id)

      const onMove = (me: PointerEvent) => {
        const dx = (me.clientX - e.clientX) / pxPerSec
        const rawEnd = cue.end_sec + dx
        const snapped = snapToPoints(rawEnd, snapPts, pxPerSec)
        const newEnd = Math.min(durationSecs, Math.max(cue.start_sec + 0.5, snapped))
        setLocalCues((prev) =>
          prev.map((c) => c.id === cue.id ? { ...c, end_sec: newEnd } : c)
        )
      }
      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        setLocalCues((prev) => {
          const updated = prev.find((c) => c.id === cue.id)
          if (updated) onCueUpdate?.(cue.id, { end_sec: updated.end_sec })
          return prev
        })
        setDragOp({ type: 'idle' })
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [readonly, pxPerSec, localCues, durationSecs, onCueUpdate]
  )

  // Delete key handler
  useEffect(() => {
    if (readonly || !selectedCueId) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return
        // Signal deletion via selecting null (EditorView will handle actual deletion)
        onCueSelect?.(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [readonly, selectedCueId, onCueSelect])

  const displayCues = dragOp.type === 'idle' ? cues : localCues

  return (
    <div
      ref={scrollRef}
      className="relative overflow-x-auto overflow-y-auto flex-1 no-select"
      style={{ background: '#0B0C0E', cursor: dragOp.type !== 'idle' ? 'grabbing' : undefined }}
    >
      {/* Fixed label column + ruler */}
      <div className="flex sticky top-0 z-20" style={{ background: '#0F1114' }}>
        <div className="flex-shrink-0 border-r border-b border-border" style={{ width: 56, height: 28 }} />
        <TimelineRuler durationSecs={durationSecs} pxPerSec={pxPerSec} />
      </div>

      {/* Tracks */}
      {Array.from({ length: NUM_CAMERAS }, (_, i) => i + 1).map((camNum) => {
        const trackCues = displayCues.filter((c) => c.camera_number === camNum)
        const ghost =
          dragOp.type === 'creating' && dragOp.camNum === camNum
            ? { start_sec: dragOp.startSec, end_sec: dragOp.endSec }
            : null

        return (
          <TimelineTrack
            key={camNum}
            cameraNumber={camNum}
            cues={trackCues}
            durationSecs={durationSecs}
            pxPerSec={pxPerSec}
            selectedCueId={selectedCueId}
            readonly={readonly}
            onSelectCue={(id) => onCueSelect?.(id)}
            ghostCue={ghost}
            dragHandlers={
              readonly
                ? undefined
                : { onPointerDownMove, onPointerDownResizeLeft, onPointerDownResizeRight, onPointerDownCreate }
            }
          />
        )
      })}

      {/* Playhead */}
      {playheadSec != null && (
        <div
          className="absolute top-0 bottom-0 pointer-events-none z-30"
          style={{ left: 56 + playheadSec * pxPerSec, width: 2, background: '#E1262C', opacity: 0.9 }}
        >
          <div
            className="absolute top-0"
            style={{ left: -5, width: 12, height: 12, background: '#E1262C', clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }}
          />
        </div>
      )}
    </div>
  )
})

export default Timeline
