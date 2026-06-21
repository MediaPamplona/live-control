import { CAM_COLORS } from '@/lib/types'
import type { Cue } from '@/lib/types'

interface Props {
  cue: Cue
  pxPerSec: number
  selected: boolean
  readonly: boolean
  onSelect?: () => void
  onPointerDownMove?: (e: React.PointerEvent) => void
  onPointerDownResizeLeft?: (e: React.PointerEvent) => void
  onPointerDownResizeRight?: (e: React.PointerEvent) => void
}

export default function TimelineClip({
  cue,
  pxPerSec,
  selected,
  readonly,
  onSelect,
  onPointerDownMove,
  onPointerDownResizeLeft,
  onPointerDownResizeRight,
}: Props) {
  const left = cue.start_sec * pxPerSec
  const width = Math.max(4, (cue.end_sec - cue.start_sec) * pxPerSec)
  const color = CAM_COLORS[cue.camera_number - 1]

  return (
    <div
      className="absolute top-1 bottom-1 rounded overflow-hidden no-select"
      style={{
        left,
        width,
        background: `${color}33`,
        border: `2px solid ${selected ? color : color + '88'}`,
        boxShadow: selected ? `0 0 0 1px ${color}` : undefined,
        cursor: readonly ? 'default' : 'grab',
        zIndex: selected ? 10 : 1,
      }}
      onPointerDown={readonly ? undefined : (e) => {
        e.stopPropagation()
        onSelect?.()
        onPointerDownMove?.(e)
      }}
      onClick={(e) => { e.stopPropagation(); onSelect?.() }}
    >
      {/* Thumbnail */}
      {cue.image_url && (
        <img
          src={cue.image_url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none"
        />
      )}

      {/* Label */}
      <span
        className="absolute left-1 top-0 bottom-0 flex items-center font-mono text-cream pointer-events-none"
        style={{ fontSize: 10, color, zIndex: 2 }}
      >
        CAM {cue.camera_number}
        {cue.note && <span className="ml-1 text-cream opacity-60 truncate">{cue.note}</span>}
      </span>

      {/* Duration label */}
      {width > 48 && (
        <span
          className="absolute right-2 top-0 bottom-0 flex items-center font-mono opacity-50 pointer-events-none"
          style={{ fontSize: 9, color: '#F4F1EA', zIndex: 2 }}
        >
          {(cue.end_sec - cue.start_sec).toFixed(0)}s
        </span>
      )}

      {/* Resize handles — editor only */}
      {!readonly && (
        <>
          <div
            className="clip-resize-handle clip-resize-left"
            onPointerDown={(e) => { e.stopPropagation(); onSelect?.(); onPointerDownResizeLeft?.(e) }}
          />
          <div
            className="clip-resize-handle clip-resize-right"
            onPointerDown={(e) => { e.stopPropagation(); onSelect?.(); onPointerDownResizeRight?.(e) }}
          />
        </>
      )}
    </div>
  )
}
