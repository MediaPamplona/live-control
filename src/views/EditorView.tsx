import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useShow } from '@/hooks/useShow'
import { useClock } from '@/hooks/useClock'
import Timeline from '@/components/timeline/Timeline'
import SongList from '@/components/SongList'
import CueProperties from '@/components/CueProperties'
import InstrumentList from '@/components/InstrumentList'
import type { Cue, Song, Instrument, InstrumentCue, Singer, SingerCue } from '@/lib/types'
import { CAM_COLORS, MUSIC_TRACK_NUM, SINGER_COLORS } from '@/lib/types'
import { suggestEmoji } from '@/lib/emojiSuggest'

function fmtSec(sec: number) {
  const m = Math.floor(sec / 60)
  const s = (sec % 60).toFixed(1)
  return `${m}:${s.padStart(4, '0')}`
}

function parseSec(val: string): number | null {
  const colonMatch = val.match(/^(\d+):(\d+\.?\d*)$/)
  if (colonMatch) return parseInt(colonMatch[1]) * 60 + parseFloat(colonMatch[2])
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

function EmojiField({
  name, emoji, onChange,
}: {
  name: string
  emoji: string | null
  onChange: (emoji: string | null) => void
}) {
  const suggestion = suggestEmoji(name)
  return (
    <div>
      <label className="font-mono text-muted uppercase tracking-widest" style={{ fontSize: 9 }}>
        Emoji (alternativa a la foto)
      </label>
      <div className="mt-1 flex gap-1.5 items-center">
        <input
          className="w-12 bg-panel border border-border rounded px-2 py-1.5 text-center text-xl outline-none focus:border-muted"
          value={emoji ?? ''}
          placeholder="＋"
          onChange={(e) => onChange(e.target.value.trim() || null)}
        />
        {suggestion && suggestion !== emoji && (
          <button
            className="font-mono text-muted hover:text-cream transition-colors"
            style={{ fontSize: 9 }}
            onClick={() => onChange(suggestion)}
          >
            Usar {suggestion}
          </button>
        )}
        {emoji && (
          <button
            className="font-mono text-muted hover:text-tally transition-colors ml-auto"
            style={{ fontSize: 9 }}
            onClick={() => onChange(null)}
          >
            Quitar
          </button>
        )}
      </div>
    </div>
  )
}

function InstrumentCuePanel({
  cue, instrument, onUpdate, onDelete, onUploadInstrumentImage, onUpdateInstrumentEmoji,
}: {
  cue: InstrumentCue | null
  instrument: Instrument | null
  onUpdate: (id: string, patch: Partial<Pick<InstrumentCue, 'start_sec' | 'end_sec' | 'note'>>) => void
  onDelete: (id: string) => void
  onUploadInstrumentImage: (instrumentId: string, file: File) => Promise<string | null>
  onUpdateInstrumentEmoji: (instrumentId: string, emoji: string | null) => void
}) {
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

  if (!cue || !instrument) return null

  const commitStart = () => {
    const sec = parseSec(startVal)
    if (sec !== null && sec < cue.end_sec) onUpdate(cue.id, { start_sec: Math.round(sec * 10) / 10 })
    else setStartVal(fmtSec(cue.start_sec))
  }
  const commitEnd = () => {
    const sec = parseSec(endVal)
    if (sec !== null && sec > cue.start_sec) onUpdate(cue.id, { end_sec: Math.round(sec * 10) / 10 })
    else setEndVal(fmtSec(cue.end_sec))
  }

  return (
    <div className="flex flex-col h-full text-xs">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="font-display text-xs uppercase tracking-widest text-muted">Propiedades</span>
        <button className="text-muted hover:text-tally font-mono" onClick={() => onDelete(cue.id)}>Borrar</button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
        <div>
          <label className="font-mono text-muted uppercase tracking-widest" style={{ fontSize: 9 }}>Instrumento</label>
          <div className="mt-1 font-display text-2xl font-semibold" style={{ color: instrument.color }}>
            {instrument.name}
          </div>
        </div>
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
        <div>
          <label className="font-mono text-muted uppercase tracking-widest" style={{ fontSize: 9 }}>
            Foto del instrumento
          </label>
          <p className="font-mono text-muted mt-0.5 mb-1" style={{ fontSize: 9, opacity: 0.6 }}>
            Se aplica a todos los bloques de {instrument.name}
          </p>
          {instrument.image_url ? (
            <div className="mt-1 relative">
              <img src={instrument.image_url} alt="" className="w-full rounded border border-border object-cover" style={{ maxHeight: 100 }} />
            </div>
          ) : null}
          <button
            className="mt-1 w-full border border-dashed border-border rounded p-3 text-muted hover:border-muted hover:text-cream transition-colors font-mono"
            style={{ fontSize: 10 }}
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Subiendo...' : instrument.image_url ? 'Cambiar foto' : '+ Añadir foto'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              setUploading(true)
              await onUploadInstrumentImage(instrument.id, file)
              setUploading(false)
              e.target.value = ''
            }}
          />
        </div>
        <EmojiField
          name={instrument.name}
          emoji={instrument.emoji}
          onChange={(emoji) => onUpdateInstrumentEmoji(instrument.id, emoji)}
        />
        <div>
          <label className="font-mono text-muted uppercase tracking-widest" style={{ fontSize: 9 }}>Nota</label>
          <textarea
            className="mt-1 w-full bg-panel border border-border rounded px-2 py-1 font-mono text-cream outline-none focus:border-muted resize-none"
            rows={2}
            placeholder="Intro, solo, refrán..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => onUpdate(cue.id, { note: note || null })}
          />
        </div>
      </div>
    </div>
  )
}

function SingerCuePanel({
  cue, singer, onUpdate, onDelete, onUploadSingerImage, onUpdateSingerEmoji,
}: {
  cue: SingerCue | null
  singer: Singer | null
  onUpdate: (id: string, patch: Partial<Pick<SingerCue, 'start_sec' | 'end_sec' | 'note'>>) => void
  onDelete: (id: string) => void
  onUploadSingerImage: (singerId: string, file: File) => Promise<string | null>
  onUpdateSingerEmoji: (singerId: string, emoji: string | null) => void
}) {
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

  if (!cue || !singer) return null

  const commitStart = () => {
    const sec = parseSec(startVal)
    if (sec !== null && sec < cue.end_sec) onUpdate(cue.id, { start_sec: Math.round(sec * 10) / 10 })
    else setStartVal(fmtSec(cue.start_sec))
  }
  const commitEnd = () => {
    const sec = parseSec(endVal)
    if (sec !== null && sec > cue.start_sec) onUpdate(cue.id, { end_sec: Math.round(sec * 10) / 10 })
    else setEndVal(fmtSec(cue.end_sec))
  }

  return (
    <div className="flex flex-col h-full text-xs">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="font-display text-xs uppercase tracking-widest text-muted">Propiedades</span>
        <button className="text-muted hover:text-tally font-mono" onClick={() => onDelete(cue.id)}>Borrar</button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
        <div>
          <label className="font-mono text-muted uppercase tracking-widest" style={{ fontSize: 9 }}>Cantante / Solista</label>
          <div className="mt-1 font-display text-2xl font-semibold" style={{ color: singer.color }}>
            {singer.name}
          </div>
        </div>
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
        <div>
          <label className="font-mono text-muted uppercase tracking-widest" style={{ fontSize: 9 }}>
            Foto del cantante
          </label>
          <p className="font-mono text-muted mt-0.5 mb-1" style={{ fontSize: 9, opacity: 0.6 }}>
            Se aplica a todos los bloques de {singer.name}
          </p>
          {singer.image_url ? (
            <div className="mt-1 relative">
              <img src={singer.image_url} alt="" className="w-full rounded border border-border object-cover" style={{ maxHeight: 100 }} />
            </div>
          ) : null}
          <button
            className="mt-1 w-full border border-dashed border-border rounded p-3 text-muted hover:border-muted hover:text-cream transition-colors font-mono"
            style={{ fontSize: 10 }}
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Subiendo...' : singer.image_url ? 'Cambiar foto' : '+ Añadir foto'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              setUploading(true)
              await onUploadSingerImage(singer.id, file)
              setUploading(false)
              e.target.value = ''
            }}
          />
        </div>
        <EmojiField
          name={singer.name}
          emoji={singer.emoji}
          onChange={(emoji) => onUpdateSingerEmoji(singer.id, emoji)}
        />
        <div>
          <label className="font-mono text-muted uppercase tracking-widest" style={{ fontSize: 9 }}>Nota</label>
          <textarea
            className="mt-1 w-full bg-panel border border-border rounded px-2 py-1 font-mono text-cream outline-none focus:border-muted resize-none"
            rows={2}
            placeholder="Solo, dúo, coro..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => onUpdate(cue.id, { note: note || null })}
          />
        </div>
      </div>
    </div>
  )
}

const MIN_PX = 6
const MAX_PX = 60
const DEFAULT_PX = 14

export default function EditorView() {
  const { showId } = useParams<{ showId: string }>()
  const navigate = useNavigate()
  const {
    show, songs, cues, loading, error, saveError,
    instruments, instrumentCues,
    singers, singerCues,
    updateShowName,
    addSong, updateSong, deleteSong, reorderSongs, uploadSongAudio,
    addCue, updateCue, deleteCue, uploadCueImage,
    addInstrument, updateInstrument, deleteInstrument, uploadInstrumentImage,
    addInstrumentCue, updateInstrumentCue, deleteInstrumentCue,
    addSinger, updateSinger, deleteSinger, uploadSingerImage,
    addSingerCue, updateSingerCue, deleteSingerCue,
  } = useShow({ showId })

  const [selectedSongId, setSelectedSongId] = useState<string | null>(null)
  const [selectedCueId, setSelectedCueId] = useState<string | null>(null)
  const [selectedInstrumentCueId, setSelectedInstrumentCueId] = useState<string | null>(null)
  const [activeInstrumentId, setActiveInstrumentId] = useState<string | null>(null)
  const [selectedSingerCueId, setSelectedSingerCueId] = useState<string | null>(null)
  const [activeSingerId, setActiveSingerId] = useState<string | null>(null)
  const [undoMessage, setUndoMessage] = useState<string | null>(null)
  const undoStackRef = useRef<{ label: string; undo: () => void }[]>([])
  const pushUndo = useCallback((entry: { label: string; undo: () => void }) => {
    undoStackRef.current.push(entry)
    if (undoStackRef.current.length > 50) undoStackRef.current.shift()
  }, [])
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState('')
  const [editingBpm, setEditingBpm] = useState(false)
  const [bpmVal, setBpmVal] = useState('')
  const [copied, setCopied] = useState('')
  const [pxPerSec, setPxPerSec] = useState(DEFAULT_PX)
  const timelineAreaRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { playing, positionSec, play, pause, reset: resetClock, seek } = useClock()

  // Ctrl+scroll to zoom
  useEffect(() => {
    const el = timelineAreaRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      setPxPerSec((prev) => Math.min(MAX_PX, Math.max(MIN_PX, prev - e.deltaY * 0.05)))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Select first song automatically
  useEffect(() => {
    if (songs.length > 0 && !selectedSongId) {
      setSelectedSongId(songs[0].id)
    }
  }, [songs, selectedSongId])

  useEffect(() => {
    if (show) setNameVal(show.name)
  }, [show?.name])


  const selectedSong: Song | undefined = songs.find((s) => s.id === selectedSongId)
  const songCues: Cue[] = selectedSong ? cues.filter((c) => c.song_id === selectedSong.id) : []
  const activeCue: Cue | undefined = songCues.find(
    (c) => c.camera_number !== MUSIC_TRACK_NUM && c.start_sec <= positionSec && c.end_sec > positionSec
  )
  const musicCue: Cue | undefined = songCues.find((c) => c.camera_number === MUSIC_TRACK_NUM)

  // Refs so event handlers always see fresh values without stale closures
  const selectedSongRef = useRef(selectedSong)
  const musicCueRef = useRef(musicCue)
  const positionSecRef = useRef(positionSec)
  selectedSongRef.current = selectedSong
  musicCueRef.current = musicCue
  positionSecRef.current = positionSec

  // ── Audio sync ──
  // Create a fresh Audio object whenever the song's audio URL changes
  useEffect(() => {
    const prev = audioRef.current
    if (prev) { prev.pause(); prev.src = '' }
    const url = selectedSong?.audio_url ?? null
    audioRef.current = url ? new Audio(url) : null
  }, [selectedSong?.audio_url])

  // Seek sync (when paused, positionSec changes via seek/reset)
  useEffect(() => {
    if (playing) return
    const audio = audioRef.current
    if (!audio || !selectedSong?.audio_url) return
    audio.currentTime = Math.max(0, positionSec - (musicCue?.start_sec ?? 0))
  }, [positionSec, playing, selectedSong?.audio_url, musicCue?.start_sec])

  // Play/pause helpers — called directly from user gesture to satisfy browser autoplay policy
  const handlePlay = useCallback(() => {
    play()
    const audio = audioRef.current
    const song = selectedSongRef.current
    const pos = positionSecRef.current
    const mc = musicCueRef.current
    if (!audio || !song?.audio_url) return
    audio.currentTime = Math.max(0, pos - (mc?.start_sec ?? 0))
    audio.play().catch(e => console.error('Audio play error:', e))
  }, [play])

  const handlePause = useCallback(() => {
    pause()
    audioRef.current?.pause()
  }, [pause])

  // Spacebar → play/pause
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      e.preventDefault()
      playing ? handlePause() : handlePlay()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [playing, handlePlay, handlePause])

  // Cmd/Ctrl+Z → undo last edit
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z' || e.shiftKey) return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      e.preventDefault()
      const entry = undoStackRef.current.pop()
      if (!entry) return
      entry.undo()
      setUndoMessage(`↩ Deshecho: ${entry.label}`)
      setTimeout(() => setUndoMessage(null), 2000)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Auto-reset clock when switching songs
  const handleSongSelect = useCallback((id: string) => {
    resetClock()
    setSelectedSongId(id)
    setSelectedCueId(null)
  }, [resetClock])
  const selectedCue: Cue | null = cues.find((c) => c.id === selectedCueId) ?? null

  const handleCueCreate = useCallback(
    async (cueData: Omit<Cue, 'id'>) => {
      const created = await addCue(cueData)
      if (created) {
        setSelectedCueId(created.id)
        pushUndo({ label: 'crear plano', undo: () => deleteCue(created.id) })
      }
      return created
    },
    [addCue, deleteCue, pushUndo]
  )

  const handleCueUpdate = useCallback(
    (id: string, patch: Partial<Omit<Cue, 'id' | 'song_id'>>) => {
      const prev = cues.find((c) => c.id === id)
      if (prev) {
        pushUndo({
          label: 'editar plano',
          undo: () => updateCue(id, {
            start_sec: prev.start_sec, end_sec: prev.end_sec, note: prev.note, image_url: prev.image_url,
          }),
        })
      }
      updateCue(id, patch)
    },
    [updateCue, cues, pushUndo]
  )

  const handleInstrumentCueCreate = useCallback(
    async (cueData: Omit<InstrumentCue, 'id'>) => {
      const created = await addInstrumentCue(cueData)
      if (created) pushUndo({ label: 'crear bloque de instrumento', undo: () => deleteInstrumentCue(created.id) })
      return created
    },
    [addInstrumentCue, deleteInstrumentCue, pushUndo]
  )

  const handleInstrumentCueUpdate = useCallback(
    (id: string, patch: Partial<Pick<InstrumentCue, 'start_sec' | 'end_sec' | 'note'>>) => {
      const prev = instrumentCues.find((c) => c.id === id)
      if (prev) {
        pushUndo({
          label: 'editar bloque de instrumento',
          undo: () => updateInstrumentCue(id, { start_sec: prev.start_sec, end_sec: prev.end_sec, note: prev.note }),
        })
      }
      updateInstrumentCue(id, patch)
    },
    [updateInstrumentCue, instrumentCues, pushUndo]
  )

  const handleSingerCueCreate = useCallback(
    async (cueData: Omit<SingerCue, 'id'>) => {
      const created = await addSingerCue(cueData)
      if (created) pushUndo({ label: 'crear bloque de voz', undo: () => deleteSingerCue(created.id) })
      return created
    },
    [addSingerCue, deleteSingerCue, pushUndo]
  )

  const handleSingerCueUpdate = useCallback(
    (id: string, patch: Partial<Pick<SingerCue, 'start_sec' | 'end_sec' | 'note'>>) => {
      const prev = singerCues.find((c) => c.id === id)
      if (prev) {
        pushUndo({
          label: 'editar bloque de voz',
          undo: () => updateSingerCue(id, { start_sec: prev.start_sec, end_sec: prev.end_sec, note: prev.note }),
        })
      }
      updateSingerCue(id, patch)
    },
    [updateSingerCue, singerCues, pushUndo]
  )

  const handleAddMusicCue = useCallback(async (songId: string) => {
    const song = songs.find((s) => s.id === songId)
    if (!song) return
    setSelectedSongId(songId)
    resetClock()
    // Remove existing music cue for this song first
    const existing = cues.find((c) => c.song_id === songId && c.camera_number === MUSIC_TRACK_NUM)
    if (existing) return // already has one — user can adjust it
    await addCue({
      song_id: songId,
      camera_number: MUSIC_TRACK_NUM,
      start_sec: 0,
      end_sec: song.duration_secs,
      image_url: null,
      note: null,
    })
  }, [songs, cues, addCue, resetClock])

  const handleSeek = useCallback((sec: number) => {
    seek(sec)
    const audio = audioRef.current
    if (audio && selectedSong?.audio_url) {
      audio.currentTime = sec
      if (playing) audio.play().catch(() => {})
    }
  }, [seek, playing, selectedSong?.audio_url])

  const handleCueSelect = useCallback((id: string | null) => {
    setSelectedCueId(id)
    if (id) { setSelectedInstrumentCueId(null); setSelectedSingerCueId(null) }
  }, [])

  const handleInstrumentCueSelect = useCallback((id: string | null) => {
    setSelectedInstrumentCueId(id)
    if (id) {
      setSelectedCueId(null)
      setSelectedSingerCueId(null)
      const cue = instrumentCues.find((c) => c.id === id)
      if (cue) setActiveInstrumentId(cue.instrument_id)
    }
  }, [instrumentCues])

  const handleSingerCueSelect = useCallback((id: string | null) => {
    setSelectedSingerCueId(id)
    if (id) {
      setSelectedCueId(null)
      setSelectedInstrumentCueId(null)
      const cue = singerCues.find((c) => c.id === id)
      if (cue) setActiveSingerId(cue.singer_id)
    }
  }, [singerCues])

  const handleDeleteCue = useCallback(
    (id: string) => {
      const prev = cues.find((c) => c.id === id)
      if (prev) {
        pushUndo({
          label: 'borrar plano',
          undo: () => {
            addCue({
              song_id: prev.song_id, camera_number: prev.camera_number,
              start_sec: prev.start_sec, end_sec: prev.end_sec,
              image_url: prev.image_url, note: prev.note,
            })
          },
        })
      }
      deleteCue(id)
      setSelectedCueId(null)
    },
    [deleteCue, cues, addCue, pushUndo]
  )

  const handleDeleteInstrumentCue = useCallback(
    (id: string) => {
      const prev = instrumentCues.find((c) => c.id === id)
      if (prev) {
        pushUndo({
          label: 'borrar bloque de instrumento',
          undo: () => {
            addInstrumentCue({
              song_id: prev.song_id, instrument_id: prev.instrument_id,
              start_sec: prev.start_sec, end_sec: prev.end_sec, note: prev.note,
            })
          },
        })
      }
      deleteInstrumentCue(id)
      setSelectedInstrumentCueId(null)
    },
    [deleteInstrumentCue, instrumentCues, addInstrumentCue, pushUndo]
  )

  const handleDeleteSingerCue = useCallback(
    (id: string) => {
      const prev = singerCues.find((c) => c.id === id)
      if (prev) {
        pushUndo({
          label: 'borrar bloque de voz',
          undo: () => {
            addSingerCue({
              song_id: prev.song_id, singer_id: prev.singer_id,
              start_sec: prev.start_sec, end_sec: prev.end_sec, note: prev.note,
            })
          },
        })
      }
      deleteSingerCue(id)
      setSelectedSingerCueId(null)
    },
    [deleteSingerCue, singerCues, addSingerCue, pushUndo]
  )

  const commitBpm = () => {
    setEditingBpm(false)
    if (!selectedSong) return
    const n = parseFloat(bpmVal)
    if (!isNaN(n) && n > 0) updateSong(selectedSong.id, { bpm: n })
  }

  const copyLink = (label: string, url: string) => {
    navigator.clipboard.writeText(url)
    setCopied(label)
    setTimeout(() => setCopied(''), 2000)
  }

  if (loading) {
    return (
      <div className="h-screen bg-bg flex items-center justify-center">
        <p className="font-mono text-muted text-sm animate-pulse">Cargando show…</p>
      </div>
    )
  }

  if (error || !show) {
    return (
      <div className="h-screen bg-bg flex flex-col items-center justify-center gap-4">
        <p className="font-mono text-tally text-sm">{error ?? 'Show no encontrado'}</p>
        <button className="font-mono text-muted hover:text-cream text-sm" onClick={() => navigate('/')}>
          ← Volver al inicio
        </button>
      </div>
    )
  }

  const base = window.location.origin
  const directorUrl = `${base}/director/${show.code}`
  const cameraUrls = [1,2,3,4,5,6].map((n) => `${base}/camera/${show.code}/${n}`)

  return (
    <div className="h-screen bg-bg flex flex-col overflow-hidden">
      {/* Save error toast */}
      {saveError && (
        <div
          className="fixed top-3 left-1/2 z-50 font-mono text-xs px-4 py-2 rounded border animate-pulse"
          style={{ transform: 'translateX(-50%)', background: '#2A0A0A', borderColor: '#E1262C', color: '#F4F1EA' }}
        >
          ⚠ {saveError}
        </div>
      )}
      {undoMessage && (
        <div
          className="fixed top-3 left-1/2 z-50 font-mono text-xs px-4 py-2 rounded border"
          style={{ transform: 'translateX(-50%)', background: '#0F1114', borderColor: '#6B6F76', color: '#F4F1EA' }}
        >
          {undoMessage}
        </div>
      )}
      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border flex-shrink-0 bg-panel">
        <button className="font-mono text-muted hover:text-cream text-sm" onClick={() => navigate('/')}>
          ←
        </button>

        {/* Show name */}
        {editingName ? (
          <input
            autoFocus
            className="bg-transparent border-b border-border text-cream font-display font-semibold text-lg uppercase outline-none"
            value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            onBlur={() => { setEditingName(false); updateShowName(nameVal) }}
            onKeyDown={(e) => { if (e.key === 'Enter') { setEditingName(false); updateShowName(nameVal) } }}
          />
        ) : (
          <h1
            className="font-display font-semibold text-lg uppercase tracking-widest text-cream cursor-pointer hover:opacity-80"
            onDoubleClick={() => setEditingName(true)}
            title="Doble clic para renombrar"
          >
            {show.name}
          </h1>
        )}

        {/* Code badge */}
        <div className="flex items-center gap-1 bg-bg border border-border rounded px-2 py-0.5">
          <span className="font-mono text-muted" style={{ fontSize: 9 }}>CÓDIGO</span>
          <span className="font-mono text-cream font-bold text-sm">{show.code}</span>
        </div>

        <div className="flex-1" />

        {/* Share links */}
        <div className="flex gap-2">
          <button
            className={`font-mono text-xs px-2 py-1 rounded border transition-colors ${
              copied === 'director'
                ? 'border-standby text-standby'
                : 'border-border text-muted hover:border-muted hover:text-cream'
            }`}
            onClick={() => copyLink('director', directorUrl)}
            title={directorUrl}
          >
            {copied === 'director' ? '✓ Copiado' : '⧉ Realizador'}
          </button>
          {[1,2,3].map((n) => (
            <button
              key={n}
              className={`font-mono text-xs px-2 py-1 rounded border transition-colors ${
                copied === `cam${n}`
                  ? 'border-standby text-standby'
                  : 'border-border text-muted hover:border-muted hover:text-cream'
              }`}
              onClick={() => copyLink(`cam${n}`, cameraUrls[n - 1])}
              title={cameraUrls[n - 1]}
            >
              {copied === `cam${n}` ? '✓' : `CAM ${n}`}
            </button>
          ))}
          {[4,5,6].map((n) => (
            <button
              key={n}
              className={`font-mono text-xs px-2 py-1 rounded border transition-colors ${
                copied === `cam${n}`
                  ? 'border-standby text-standby'
                  : 'border-border text-muted hover:border-muted hover:text-cream'
              }`}
              onClick={() => copyLink(`cam${n}`, cameraUrls[n - 1])}
              title={cameraUrls[n - 1]}
            >
              {copied === `cam${n}` ? '✓' : `CAM ${n}`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main layout: SongList | Timeline | Properties ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Song list + Instrument list */}
        <div className="w-48 flex-shrink-0 border-r border-border bg-panel overflow-hidden flex flex-col">
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <SongList
              songs={songs}
              selectedSongId={selectedSongId}
              onSelectSong={handleSongSelect}
              onAddSong={async () => {
                const s = await addSong()
                if (s) setSelectedSongId(s.id)
              }}
              onRenameSong={(id, title) => updateSong(id, { title })}
              onDeleteSong={(id) => {
                deleteSong(id)
                if (selectedSongId === id) setSelectedSongId(null)
              }}
              onDurationChange={(id, secs) => updateSong(id, { duration_secs: secs })}
              onReorder={reorderSongs}
              onUploadAudio={uploadSongAudio}
            />
          </div>
          <InstrumentList
            instruments={instruments}
            selectedId={activeInstrumentId}
            onSelect={(id) => setActiveInstrumentId((prev) => prev === id ? null : id)}
            onAdd={async (name) => {
              const inst = await addInstrument(name)
              if (inst) setActiveInstrumentId(inst.id)
            }}
            onRename={(id, name) => updateInstrument(id, { name })}
            onColorChange={(id, color) => updateInstrument(id, { color })}
            onDelete={(id) => {
              deleteInstrument(id)
              if (activeInstrumentId === id) setActiveInstrumentId(null)
            }}
          />
          <InstrumentList
            instruments={singers}
            selectedId={activeSingerId}
            title="Voces"
            colors={SINGER_COLORS}
            addPlaceholder="Nombre del cantante..."
            onSelect={(id) => setActiveSingerId((prev) => prev === id ? null : id)}
            onAdd={async (name) => {
              const singer = await addSinger(name)
              if (singer) setActiveSingerId(singer.id)
            }}
            onRename={(id, name) => updateSinger(id, { name })}
            onColorChange={(id, color) => updateSinger(id, { color })}
            onDelete={(id) => {
              deleteSinger(id)
              if (activeSingerId === id) setActiveSingerId(null)
            }}
          />
        </div>

        {/* Center: Timeline */}
        <div ref={timelineAreaRef} className="flex-1 overflow-hidden flex flex-col">
          {selectedSong ? (
            <>
              {/* Song header */}
              <div className="flex items-center gap-3 px-3 py-1.5 border-b border-border bg-panel flex-shrink-0">
                <span className="font-display font-semibold uppercase tracking-widest text-cream text-sm">
                  {selectedSong.title}
                </span>
                <span className="font-mono text-muted text-xs">
                  {Math.floor(selectedSong.duration_secs / 60)}:{String(selectedSong.duration_secs % 60).padStart(2, '0')} min
                </span>
                {editingBpm ? (
                  <input
                    autoFocus
                    className="w-14 bg-transparent border-b border-border text-cream font-mono text-xs outline-none"
                    value={bpmVal}
                    onChange={(e) => setBpmVal(e.target.value)}
                    onBlur={commitBpm}
                    onKeyDown={(e) => { if (e.key === 'Enter') commitBpm() }}
                  />
                ) : (
                  <span
                    className="font-mono text-muted text-xs cursor-pointer hover:text-cream"
                    onDoubleClick={() => { setBpmVal(selectedSong.bpm ? String(selectedSong.bpm) : ''); setEditingBpm(true) }}
                    title="Doble clic para corregir el BPM detectado"
                  >
                    {selectedSong.bpm ? `${selectedSong.bpm} BPM` : 'BPM: sin detectar'}
                  </span>
                )}
                <span className="flex-1" />
                <span className="font-mono text-muted hidden lg:block" style={{ fontSize: 9 }}>
                  Arrastra para crear · Bordes para redimensionar · Delete para eliminar
                </span>
                {/* Zoom controls */}
                <div className="flex items-center gap-1 ml-2">
                  <button
                    className="w-6 h-6 rounded border border-border text-muted hover:text-cream hover:border-muted font-mono text-sm flex items-center justify-center transition-colors"
                    onClick={() => setPxPerSec((p) => Math.max(MIN_PX, p - 3))}
                    title="Alejar (Ctrl+scroll)"
                  >−</button>
                  <span className="font-mono text-muted w-8 text-center" style={{ fontSize: 9 }}>
                    {Math.round((pxPerSec / DEFAULT_PX) * 100)}%
                  </span>
                  <button
                    className="w-6 h-6 rounded border border-border text-muted hover:text-cream hover:border-muted font-mono text-sm flex items-center justify-center transition-colors"
                    onClick={() => setPxPerSec((p) => Math.min(MAX_PX, p + 3))}
                    title="Acercar (Ctrl+scroll)"
                  >+</button>
                  <button
                    className="font-mono text-muted hover:text-cream px-1 transition-colors"
                    style={{ fontSize: 9 }}
                    onClick={() => setPxPerSec(DEFAULT_PX)}
                    title="Zoom al 100%"
                  >reset</button>
                </div>
              </div>
              <Timeline
                cues={songCues}
                durationSecs={selectedSong.duration_secs}
                pxPerSec={pxPerSec}
                selectedCueId={selectedCueId}
                songId={selectedSong.id}
                audioUrl={selectedSong.audio_url}
                playheadSec={playing || positionSec > 0 ? positionSec : undefined}
                playing={playing}
                instruments={instruments}
                instrumentCues={instrumentCues.filter((c) => c.song_id === selectedSong.id)}
                selectedInstrumentCueId={selectedInstrumentCueId}
                activeInstrumentId={activeInstrumentId}
                singers={singers}
                singerCues={singerCues.filter((c) => c.song_id === selectedSong.id)}
                selectedSingerCueId={selectedSingerCueId}
                activeSingerId={activeSingerId}
                onSeek={handleSeek}
                onCueCreate={handleCueCreate}
                onCueUpdate={handleCueUpdate}
                onCueSelect={handleCueSelect}
                onCueDelete={handleDeleteCue}
                onInstrumentCueCreate={handleInstrumentCueCreate}
                onInstrumentCueUpdate={handleInstrumentCueUpdate}
                onInstrumentCueSelect={handleInstrumentCueSelect}
                onInstrumentCueDelete={handleDeleteInstrumentCue}
                onSingerCueCreate={handleSingerCueCreate}
                onSingerCueUpdate={handleSingerCueUpdate}
                onSingerCueSelect={handleSingerCueSelect}
                onSingerCueDelete={handleDeleteSingerCue}
              />

              {/* ── Preview play bar ── */}
              <div
                className="flex-shrink-0 flex items-center gap-4 px-4 border-t border-border"
                style={{ height: 52, background: '#0F1114' }}
              >
                {/* Transport */}
                <button
                  className="w-7 h-7 rounded-full border border-border text-muted hover:text-cream hover:border-muted flex items-center justify-center font-mono transition-colors"
                  onClick={() => { resetClock(); audioRef.current?.pause(); if (audioRef.current) audioRef.current.currentTime = 0 }}
                  title="Reiniciar"
                >⏮</button>

                <button
                  className="w-10 h-10 rounded-full border-2 font-mono text-xl flex items-center justify-center transition-colors"
                  style={{
                    borderColor: playing ? '#E1262C' : '#6B6F76',
                    color: playing ? '#E1262C' : '#F4F1EA',
                    background: playing ? '#E1262C18' : 'transparent',
                  }}
                  onClick={playing ? handlePause : handlePlay}
                >
                  {playing ? '⏸' : '▶'}
                </button>

                {/* Cronómetro */}
                <span
                  className="font-mono tabular-nums"
                  style={{ fontSize: 20, color: playing ? '#F4F1EA' : '#6B6F76', minWidth: 64 }}
                >
                  {String(Math.floor(positionSec / 60)).padStart(2,'0')}:{String(Math.floor(positionSec % 60)).padStart(2,'0')}
                </span>

                <span className="font-mono text-muted" style={{ fontSize: 11 }}>
                  / {Math.floor(selectedSong.duration_secs / 60)}:{String(selectedSong.duration_secs % 60).padStart(2,'0')}
                </span>

                <div className="flex-1" />

                {/* Active cam indicator */}
                {activeCue ? (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full animate-pulse"
                      style={{ background: CAM_COLORS[activeCue.camera_number - 1] }}
                    />
                    <span
                      className="font-mono font-bold text-sm"
                      style={{ color: CAM_COLORS[activeCue.camera_number - 1] }}
                    >
                      CAM {activeCue.camera_number}
                    </span>
                    {activeCue.note && (
                      <span className="font-mono text-muted text-xs">— {activeCue.note}</span>
                    )}
                  </div>
                ) : (
                  <span className="font-mono text-muted text-xs">Sin cue activo</span>
                )}

                <span className="font-mono text-muted ml-2" style={{ fontSize: 9 }}>
                  PREVIEW (no emite a cámaras)
                </span>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="font-mono text-muted text-sm">
                Selecciona una canción en el panel izquierdo
              </p>
            </div>
          )}
        </div>

        {/* Right: Properties */}
        <div className="w-56 flex-shrink-0 border-l border-border bg-panel overflow-hidden flex flex-col">
          {selectedInstrumentCueId ? (
            <InstrumentCuePanel
              cue={instrumentCues.find((c) => c.id === selectedInstrumentCueId) ?? null}
              instrument={instruments.find((i) => instrumentCues.find((c) => c.id === selectedInstrumentCueId)?.instrument_id === i.id) ?? null}
              onUpdate={handleInstrumentCueUpdate}
              onDelete={handleDeleteInstrumentCue}
              onUploadInstrumentImage={uploadInstrumentImage}
              onUpdateInstrumentEmoji={(id, emoji) => updateInstrument(id, { emoji })}
            />
          ) : selectedSingerCueId ? (
            <SingerCuePanel
              cue={singerCues.find((c) => c.id === selectedSingerCueId) ?? null}
              singer={singers.find((s) => singerCues.find((c) => c.id === selectedSingerCueId)?.singer_id === s.id) ?? null}
              onUpdate={handleSingerCueUpdate}
              onDelete={handleDeleteSingerCue}
              onUploadSingerImage={uploadSingerImage}
              onUpdateSingerEmoji={(id, emoji) => updateSinger(id, { emoji })}
            />
          ) : (
            <CueProperties
              cue={selectedCue}
              onUpdate={handleCueUpdate}
              onDelete={handleDeleteCue}
              onUploadImage={uploadCueImage}
              song={selectedCue?.camera_number === MUSIC_TRACK_NUM ? selectedSong : null}
              onUploadSongAudio={selectedSong ? (file) => uploadSongAudio(selectedSong.id, file) : undefined}
              songs={songs}
              onUploadAudioForSong={uploadSongAudio}
              onAddMusicCue={handleAddMusicCue}
            />
          )}
        </div>
      </div>
    </div>
  )
}
