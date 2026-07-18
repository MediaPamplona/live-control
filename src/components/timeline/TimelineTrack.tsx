import { useRef } from 'react'
import { CAM_COLORS, MUSIC_TRACK_NUM, MUSIC_COLOR } from '@/lib/types'
import TimelineClip from './TimelineClip'

interface DragHandlers {
  onPointerDownMove: (e: React.PointerEvent, id: string) => void
  onPointerDownResizeLeft: (e: React.PointerEvent, id: string) => void
  onPointerDownResizeRight: (e: React.PointerEvent, id: string) => void
  onPointerDownCreate: (e: React.PointerEvent, containerRef: React.RefObject<HTMLDivElement | null>) => void
}

// Minimal shape needed for display — works with Cue and InstrumentCue
interface DisplayCue {
  id: string
  start_sec: number
  end_sec: number
  note: string | null
  image_url?: string | null
}

interface Props {
  cameraNumber?: number
  trackLabel?: string
  trackColor?: string
  trackHeight?: number
  cues: DisplayCue[]
  durationSecs: number
  pxPerSec: number
  selectedCueId: string | null
  readonly: boolean
  onSelectCue: (id: string | null) => void
  dragHandlers?: DragHandlers
  ghostCue?: { start_sec: number; end_sec: number } | null
  audioUrl?: string | null
  // Per-clip color/label/image override (used for the single instrument track)
  getClipStyle?: (cueId: string) => { color: string; label: string; imageUrl?: string | null; imageFullOpacity?: boolean } | undefined
}

export default function TimelineTrack({
  cameraNumber,
  trackLabel,
  trackColor,
  trackHeight,
  cues,
  durationSecs,
  pxPerSec,
  selectedCueId,
  readonly,
  onSelectCue,
  dragHandlers,
  ghostCue,
  audioUrl,
  getClipStyle,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isMusicTrack = cameraNumber === MUSIC_TRACK_NUM

  // Resolve label and color — generic override takes precedence over camera defaults
  const color = trackColor ?? (isMusicTrack ? MUSIC_COLOR : CAM_COLORS[(cameraNumber ?? 1) - 1])
  const label = trackLabel ?? (isMusicTrack ? 'MÚSICA' : `CAM ${cameraNumber}`)
  const height = trackHeight ?? (isMusicTrack ? 40 : 64)

  return (
    <div className="flex" style={{ height }}>
      {/* Sticky label */}
      <div
        className="flex-shrink-0 flex items-center justify-center font-mono font-medium border-r border-border z-10"
        style={{
          width: 56,
          fontSize: label.length > 6 ? 8 : 11,
          color,
          background: '#0F1114',
          position: 'sticky',
          left: 0,
          textAlign: 'center',
          padding: '0 2px',
          lineHeight: 1.2,
          wordBreak: 'break-word',
          transform: 'translateZ(0)',
          willChange: 'transform',
        }}
      >
        {label}
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
                  dragHandlers.onPointerDownCreate(e, containerRef as React.RefObject<HTMLDivElement | null>)
                }
              }
        }
        onClick={() => onSelectCue(null)}
      >
        <div className="absolute inset-x-0 top-1/2 border-t border-border opacity-20" />

        {cues.map((cue) => {
          const perClip = getClipStyle?.(cue.id)
          return (
            <TimelineClip
              key={cue.id}
              id={cue.id}
              startSec={cue.start_sec}
              endSec={cue.end_sec}
              note={cue.note}
              label={perClip?.label ?? (isMusicTrack ? '♪' : label)}
              color={perClip?.color ?? color}
              imageUrl={perClip?.imageUrl !== undefined ? perClip.imageUrl : cue.image_url}
              imageFullOpacity={perClip?.imageFullOpacity}
              audioUrl={isMusicTrack ? audioUrl : null}
              pxPerSec={pxPerSec}
              selected={cue.id === selectedCueId}
              readonly={readonly}
              onSelect={() => onSelectCue(cue.id)}
              onPointerDownMove={(e) => dragHandlers?.onPointerDownMove(e, cue.id)}
              onPointerDownResizeLeft={(e) => dragHandlers?.onPointerDownResizeLeft(e, cue.id)}
              onPointerDownResizeRight={(e) => dragHandlers?.onPointerDownResizeRight(e, cue.id)}
            />
          )
        })}

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
