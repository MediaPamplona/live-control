import { useRef } from 'react'
import type { Cue } from '@/lib/types'
import { CAM_COLORS } from '@/lib/types'
import TimelineClip from './TimelineClip'

interface DragHandlers {
  onPointerDownMove: (e: React.PointerEvent, cue: Cue) => void
  onPointerDownResizeLeft: (e: React.PointerEvent, cue: Cue) => void
  onPointerDownResizeRight: (e: React.PointerEvent, cue: Cue) => void
  onPointerDownCreate: (e: React.PointerEvent, camNum: number, containerRef: React.RefObject<HTMLDivElement | null>) => void
}

interface Props {
  cameraNumber: number
  cues: Cue[]
  durationSecs: number
  pxPerSec: number
  selectedCueId: string | null
  readonly: boolean
  onSelectCue: (id: string | null) => void
  dragHandlers?: DragHandlers
  /** For readonly/director: ghost clip being created */
  ghostCue?: { start_sec: number; end_sec: number } | null
}

export default function TimelineTrack({
  cameraNumber,
  cues,
  durationSecs,
  pxPerSec,
  selectedCueId,
  readonly,
  onSelectCue,
  dragHandlers,
  ghostCue,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const color = CAM_COLORS[cameraNumber - 1]

  return (
    <div className="flex" style={{ height: 64 }}>
      {/* Label */}
      <div
        className="flex-shrink-0 flex items-center justify-center font-mono font-medium border-r border-border z-10"
        style={{ width: 56, fontSize: 11, color, background: '#0F1114' }}
      >
        CAM {cameraNumber}
      </div>

      {/* Track body */}
      <div
        ref={containerRef}
        className="relative flex-shrink-0"
        style={{
          width: durationSecs * pxPerSec,
          background: '#12141780',
          borderBottom: '1px solid #2A2D3240',
          cursor: readonly ? 'default' : 'crosshair',
        }}
        onPointerDown={
          readonly || !dragHandlers
            ? undefined
            : (e) => {
                if ((e.target as HTMLElement) === e.currentTarget) {
                  dragHandlers.onPointerDownCreate(e, cameraNumber, containerRef as React.RefObject<HTMLDivElement | null>)
                }
              }
        }
        onClick={() => onSelectCue(null)}
      >
        {/* Horizontal grid line */}
        <div className="absolute inset-x-0 top-1/2 border-t border-border opacity-20" />

        {/* Existing clips */}
        {cues.map((cue) => (
          <TimelineClip
            key={cue.id}
            cue={cue}
            pxPerSec={pxPerSec}
            selected={cue.id === selectedCueId}
            readonly={readonly}
            onSelect={() => onSelectCue(cue.id)}
            onPointerDownMove={(e) => dragHandlers?.onPointerDownMove(e, cue)}
            onPointerDownResizeLeft={(e) => dragHandlers?.onPointerDownResizeLeft(e, cue)}
            onPointerDownResizeRight={(e) => dragHandlers?.onPointerDownResizeRight(e, cue)}
          />
        ))}

        {/* Ghost clip during creation */}
        {ghostCue && ghostCue.end_sec > ghostCue.start_sec && (
          <div
            className="absolute top-1 bottom-1 rounded pointer-events-none"
            style={{
              left: ghostCue.start_sec * pxPerSec,
              width: (ghostCue.end_sec - ghostCue.start_sec) * pxPerSec,
              border: `2px dashed ${color}`,
              background: `${color}22`,
            }}
          />
        )}
      </div>
    </div>
  )
}
