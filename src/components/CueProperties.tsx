import { useState, useEffect, useRef } from 'react'
import type { Cue, Song } from '@/lib/types'
import { CAM_COLORS, MUSIC_TRACK_NUM, MUSIC_COLOR } from '@/lib/types'

function SongLibrary({
  songs,
  onUploadAudio,
  onAddMusicCue,
}: {
  songs: Song[]
  onUploadAudio?: (songId: string, file: File) => Promise<string | null>
  onAddMusicCue?: (songId: string) => void
}) {
  const [uploading, setUploading] = useState<string | null>(null)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  if (songs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
        <div className="text-muted" style={{ fontSize: 32 }}>⊡</div>
        <p className="font-mono text-muted text-xs">Añade canciones<br />en el panel izquierdo</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border">
        <span className="font-display text-xs uppercase tracking-widest text-muted">Canciones</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
        {songs.map((song) => (
          <div
            key={song.id}
            className="border border-border rounded p-2 flex flex-col gap-2"
            style={{ background: '#12141780' }}
          >
            {/* Song title + audio indicator */}
            <div className="flex items-center gap-2">
              <span
                className="font-mono flex-shrink-0"
                style={{ fontSize: 13, color: song.audio_url ? MUSIC_COLOR : '#3A3D44' }}
              >
                ♪
              </span>
              <span className="font-mono text-cream flex-1 truncate" style={{ fontSize: 11 }}>
                {song.title}
              </span>
              <span className="font-mono text-muted flex-shrink-0" style={{ fontSize: 9 }}>
                {Math.floor(song.duration_secs / 60)}:{String(song.duration_secs % 60).padStart(2, '0')}
              </span>
            </div>

            {/* Upload audio */}
            <input
              ref={(el) => { fileRefs.current[song.id] = el }}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file || !onUploadAudio) return
                setUploading(song.id)
                await onUploadAudio(song.id, file)
                setUploading(null)
                e.target.value = ''
              }}
            />
            <button
              className="w-full font-mono rounded border py-1 transition-colors"
              style={{
                fontSize: 9,
                borderColor: song.audio_url ? MUSIC_COLOR + '60' : '#3A3D44',
                color: song.audio_url ? MUSIC_COLOR : '#6B6F76',
                background: song.audio_url ? MUSIC_COLOR + '12' : 'transparent',
              }}
              onClick={() => fileRefs.current[song.id]?.click()}
              disabled={uploading === song.id}
            >
              {uploading === song.id ? 'Subiendo...' : song.audio_url ? '♪ Audio cargado · cambiar' : '♪ Subir audio'}
            </button>

            {/* Add to MÚSICA track — always enabled */}
            <button
              className="w-full font-mono rounded border py-1.5 transition-colors"
              style={{
                fontSize: 10,
                borderColor: MUSIC_COLOR,
                color: MUSIC_COLOR,
                background: MUSIC_COLOR + '18',
              }}
              onClick={() => onAddMusicCue?.(song.id)}
            >
              + Añadir a pista MÚSICA
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

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
  song?: Song | null
  onUploadSongAudio?: (file: File) => Promise<string | null>
  // Song library (shown when no cue selected)
  songs?: Song[]
  onUploadAudioForSong?: (songId: string, file: File) => Promise<string | null>
  onAddMusicCue?: (songId: string) => void
}

export default function CueProperties({ cue, onUpdate, onDelete, onUploadImage, song, onUploadSongAudio, songs, onUploadAudioForSong, onAddMusicCue }: Props) {
  const [startVal, setStartVal] = useState('')
  const [endVal, setEndVal] = useState('')
  const [note, setNote] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!cue) return
    setStartVal(fmtSec(cue.start_sec))
    setEndVal(fmtSec(cue.end_sec))
    setNote(cue.note ?? '')
  }, [cue?.id, cue?.start_sec, cue?.end_sec, cue?.note])

  if (!cue) {
    return <SongLibrary songs={songs ?? []} onUploadAudio={onUploadAudioForSong} onAddMusicCue={onAddMusicCue} />
  }

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

  const isMusicCue = cue.camera_number === MUSIC_TRACK_NUM
  const color = isMusicCue ? MUSIC_COLOR : CAM_COLORS[cue.camera_number - 1]

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
        {/* Header: music or camera */}
        <div>
          <label className="font-mono text-muted uppercase tracking-widest" style={{ fontSize: 9 }}>
            {isMusicCue ? 'Pista' : 'Cámara'}
          </label>
          <div className="mt-1 font-display text-2xl font-semibold" style={{ color }}>
            {isMusicCue ? '♪ MÚSICA' : `CAM ${cue.camera_number}`}
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

        <div className="font-mono text-muted" style={{ fontSize: 10 }}>
          Duración: {(cue.end_sec - cue.start_sec).toFixed(1)}s
        </div>

        {/* Note */}
        <div>
          <label className="font-mono text-muted uppercase tracking-widest" style={{ fontSize: 9 }}>Nota</label>
          <textarea
            className="mt-1 w-full bg-panel border border-border rounded px-2 py-1 font-mono text-cream outline-none focus:border-muted resize-none"
            rows={2}
            placeholder={isMusicCue ? 'Intro, verso, coro...' : 'Plano general, primer plano...'}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => onUpdate(cue.id, { note: note || null })}
          />
        </div>

        {/* Music cue: audio upload */}
        {isMusicCue ? (
          <div>
            <label className="font-mono text-muted uppercase tracking-widest" style={{ fontSize: 9 }}>
              Audio de la canción
            </label>
            {song?.audio_url ? (
              <div className="mt-2 flex flex-col gap-2">
                <div className="flex items-center gap-2 bg-panel border border-border rounded px-2 py-1.5">
                  <span style={{ color: MUSIC_COLOR, fontSize: 14 }}>♪</span>
                  <span className="font-mono text-cream truncate flex-1" style={{ fontSize: 10 }}>
                    Audio cargado
                  </span>
                </div>
                <button
                  className="w-full border border-dashed border-border rounded p-2 text-muted hover:border-muted hover:text-cream transition-colors font-mono"
                  style={{ fontSize: 10 }}
                  onClick={() => audioRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Subiendo...' : 'Cambiar audio'}
                </button>
              </div>
            ) : (
              <button
                className="mt-1 w-full border border-dashed rounded p-3 transition-colors font-mono"
                style={{ fontSize: 10, borderColor: MUSIC_COLOR + '80', color: MUSIC_COLOR }}
                onClick={() => audioRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Subiendo...' : '♪ Subir MP3 / audio'}
              </button>
            )}
            <input
              ref={audioRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file || !onUploadSongAudio) return
                setUploading(true)
                await onUploadSongAudio(file)
                setUploading(false)
                e.target.value = ''
              }}
            />
          </div>
        ) : (
          /* Camera cue: image upload */
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
        )}
      </div>
    </div>
  )
}
