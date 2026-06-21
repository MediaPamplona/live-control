import { useState, useEffect, useRef } from 'react'
import type { Cue } from '@/lib/types'
import { CAM_COLORS } from '@/lib/types'

function fmtSec(sec: number) {
  const m = Math.floor(sec / 60)
  const s = (sec % 60).toFixed(1)
  return `${m}:${s.padStart(4, '0')}`
}

function parseSec(val: string): number | null {
  // Accept "1:30.0", "90", "90.5"
  const colonMatch = val.match(/^(\d+):(\d+\.?\d*)$/)
  if (colonMatch) return parseInt(colonMatch[1]) * 60 + parseFloat(colonMatch[2])
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

interface Props {
  cue: Cue | null
  onUpdate: (id: string, patch: Partial<Omit<Cue, 'id' | 'song_id'>>) => void
  onDelete: (id: string) => void
  onUploadImage: (id: string, file: File) => Promise<string | null>
}

export default function CueProperties({ cue, onUpdate, onDelete, onUploadImage }: Props) {
  const [startVal, setStartVal] = useState('')
  const [endVal, setEndVal] = useState('')
  const [note, setNote] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!cue) return
    setStartVal(fmtSec(cue.start_sec))
    setEndVal(fmtSec(cue.end_sec))
    setNote(cue.note ?? '')
  }, [cue?.id, cue?.start_sec, cue?.end_sec, cue?.note])

  if (!cue) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
        <div className="text-muted" style={{ fontSize: 32 }}>⊡</div>
        <p className="font-mono text-muted text-xs">
          Selecciona un cue<br />o arrastra sobre una pista<br />para crear uno
        </p>
      </div>
    )
  }

  const color = CAM_COLORS[cue.camera_number - 1]

  const commitStart = () => {
    const sec = parseSec(startVal)
    if (sec !== null && sec < cue.end_sec) {
      onUpdate(cue.id, { start_sec: Math.round(sec * 10) / 10 })
    } else {
      setStartVal(fmtSec(cue.start_sec))
    }
  }

  const commitEnd = () => {
    const sec = parseSec(endVal)
    if (sec !== null && sec > cue.start_sec) {
      onUpdate(cue.id, { end_sec: Math.round(sec * 10) / 10 })
    } else {
      setEndVal(fmtSec(cue.end_sec))
    }
  }

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    await onUploadImage(cue.id, file)
    setUploading(false)
  }

  return (
    <div className="flex flex-col h-full text-xs">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="font-display text-xs uppercase tracking-widest text-muted">Propiedades</span>
        <button
          className="text-muted hover:text-tally font-mono"
          onClick={() => onDelete(cue.id)}
          title="Eliminar cue"
        >
          Borrar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
        {/* Camera */}
        <div>
          <label className="font-mono text-muted uppercase tracking-widest" style={{ fontSize: 9 }}>Cámara</label>
          <div
            className="mt-1 font-display text-2xl font-semibold"
            style={{ color }}
          >
            CAM {cue.camera_number}
          </div>
        </div>

        {/* Start / End */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="font-mono text-muted uppercase tracking-widest" style={{ fontSize: 9 }}>Inicio</label>
            <input
              className="mt-1 w-full bg-panel border border-border rounded px-2 py-1 font-mono text-cream outline-none focus:border-muted"
              value={startVal}
              onChange={(e) => setStartVal(e.target.value)}
              onBlur={commitStart}
              onKeyDown={(e) => e.key === 'Enter' && commitStart()}
            />
          </div>
          <div>
            <label className="font-mono text-muted uppercase tracking-widest" style={{ fontSize: 9 }}>Fin</label>
            <input
              className="mt-1 w-full bg-panel border border-border rounded px-2 py-1 font-mono text-cream outline-none focus:border-muted"
              value={endVal}
              onChange={(e) => setEndVal(e.target.value)}
              onBlur={commitEnd}
              onKeyDown={(e) => e.key === 'Enter' && commitEnd()}
            />
          </div>
        </div>

        {/* Duration display */}
        <div className="font-mono text-muted" style={{ fontSize: 10 }}>
          Duración: {(cue.end_sec - cue.start_sec).toFixed(1)}s
        </div>

        {/* Note */}
        <div>
          <label className="font-mono text-muted uppercase tracking-widest" style={{ fontSize: 9 }}>Nota</label>
          <textarea
            className="mt-1 w-full bg-panel border border-border rounded px-2 py-1 font-mono text-cream outline-none focus:border-muted resize-none"
            rows={2}
            placeholder="Plano general, primer plano..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => onUpdate(cue.id, { note: note || null })}
          />
        </div>

        {/* Image */}
        <div>
          <label className="font-mono text-muted uppercase tracking-widest" style={{ fontSize: 9 }}>Foto referencia</label>
          {cue.image_url ? (
            <div className="mt-1 relative">
              <img
                src={cue.image_url}
                alt="Referencia"
                className="w-full rounded border border-border object-cover"
                style={{ maxHeight: 120 }}
              />
              <button
                className="absolute top-1 right-1 bg-bg text-muted hover:text-tally rounded px-1 font-mono"
                style={{ fontSize: 9 }}
                onClick={() => onUpdate(cue.id, { image_url: null })}
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              className="mt-1 w-full border border-dashed border-border rounded p-3 text-muted hover:border-muted hover:text-cream transition-colors font-mono"
              style={{ fontSize: 10 }}
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Subiendo...' : '+ Añadir foto'}
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImagePick}
          />
          {cue.image_url && (
            <button
              className="mt-1 w-full text-muted hover:text-cream font-mono"
              style={{ fontSize: 9 }}
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Subiendo...' : 'Cambiar foto'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
