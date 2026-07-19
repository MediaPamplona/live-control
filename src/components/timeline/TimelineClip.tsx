import { useState, useEffect } from 'react'
import { MUSIC_COLOR } from '@/lib/types'

const waveCache = new Map<string, number[]>()

async function buildWaveform(url: string, bars: number): Promise<number[]> {
  if (waveCache.has(url)) return waveCache.get(url)!
  try {
    const res = await fetch(url)
    const buf = await res.arrayBuffer()
    const ctx = new AudioContext()
    const decoded = await ctx.decodeAudioData(buf)
    await ctx.close()
    const data = decoded.getChannelData(0)
    const block = Math.floor(data.length / bars)
    const peaks: number[] = []
    for (let i = 0; i < bars; i++) {
      let max = 0
      for (let j = 0; j < block; j++) {
        const v = Math.abs(data[i * block + j])
        if (v > max) max = v
      }
      peaks.push(max)
    }
    waveCache.set(url, peaks)
    return peaks
  } catch {
    return []
  }
}

function Waveform({ url, color, bars }: { url: string; color: string; bars: number }) {
  const [peaks, setPeaks] = useState<number[] | null>(null)
  useEffect(() => { buildWaveform(url, bars).then(setPeaks) }, [url, bars])

  if (!peaks) {
    return (
      <div className="absolute inset-y-1 inset-x-6 flex items-center gap-px overflow-hidden opacity-25 pointer-events-none">
        {Array.from({ length: Math.min(bars, 30) }, (_, i) => (
          <div key={i} className="flex-1 rounded-sm" style={{ background: color, height: `${30 + Math.sin(i * 1.3) * 25}%` }} />
        ))}
      </div>
    )
  }

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.45, padding: '4px 24px 4px 24px' }}
      preserveAspectRatio="none"
      viewBox={`0 0 ${peaks.length} 1`}
    >
      {peaks.map((p, i) => (
        <rect key={i} x={i} y={(1 - p) / 2} width={0.8} height={p} fill={color} rx="0.1" />
      ))}
    </svg>
  )
}

interface Props {
  id: string
  startSec: number
  endSec: number
  note: string | null
  label: string
  color: string
  imageUrl?: string | null
  imageFullOpacity?: boolean
  audioUrl?: string | null
  pxPerSec: number
  selected: boolean
  readonly: boolean
  onSelect?: () => void
  onPointerDownMove?: (e: React.PointerEvent) => void
  onPointerDownResizeLeft?: (e: React.PointerEvent) => void
  onPointerDownResizeRight?: (e: React.PointerEvent) => void
}

export default function TimelineClip({
  startSec, endSec, note, label, color, imageUrl, imageFullOpacity, audioUrl,
  pxPerSec, selected, readonly,
  onSelect, onPointerDownMove, onPointerDownResizeLeft, onPointerDownResizeRight,
}: Props) {
  const left = startSec * pxPerSec
  const width = Math.max(4, (endSec - startSec) * pxPerSec)
  const isMusicClip = color === MUSIC_COLOR
  const bars = Math.max(20, Math.floor(width / 4))

  return (
    <div
      className="absolute top-1 bottom-1 rounded overflow-hidden no-select"
      style={{
        left,
        width,
        background: `${color}${isMusicClip ? '22' : '33'}`,
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
      {/* Reference photo — anchored at the start, tiled to fill wider clips */}
      {!isMusicClip && !audioUrl && imageUrl && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${imageUrl})`,
            backgroundRepeat: 'repeat-x',
            backgroundSize: 'auto 100%',
            backgroundPosition: 'left center',
            opacity: imageFullOpacity ? 1 : 0.4,
          }}
        />
      )}

      {/* Waveform (music cue) */}
      {isMusicClip && audioUrl && (
        <Waveform url={audioUrl} color={color} bars={bars} />
      )}

      {/* Label */}
      <span
        className="absolute left-1 top-0 bottom-0 flex items-center font-mono pointer-events-none"
        style={{ fontSize: 10, color, zIndex: 2 }}
      >
        {label}
        {note && <span className="ml-1 text-cream opacity-60 truncate">{note}</span>}
      </span>

      {/* Duration */}
      {width > 48 && (
        <span
          className="absolute right-2 top-0 bottom-0 flex items-center font-mono opacity-50 pointer-events-none"
          style={{ fontSize: 9, color: '#F4F1EA', zIndex: 2 }}
        >
          {(endSec - startSec).toFixed(0)}s
        </span>
      )}

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
