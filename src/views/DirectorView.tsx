import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useShow } from '@/hooks/useShow'
import { useClock } from '@/hooks/useClock'
import { useDirectorBroadcast } from '@/hooks/useRealtime'
import Timeline, { type TimelineHandle } from '@/components/timeline/Timeline'
import type { Cue } from '@/lib/types'
import { CAM_COLORS } from '@/lib/types'

function fmt(sec: number) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const PX_PER_SEC = 14

function getActiveCue(cues: Cue[], positionSec: number): Cue | null {
  return (
    cues.find(
      (c) => c.start_sec <= positionSec && c.end_sec > positionSec
    ) ?? null
  )
}

export default function DirectorView() {
  const { showCode } = useParams<{ showCode: string }>()
  const navigate = useNavigate()
  const { show, songs, cues, loading, error } = useShow({ showCode })
  const { playing, positionSec, play, pause, reset } = useClock()
  const { broadcast } = useDirectorBroadcast(showCode ?? '')
  const timelineRef = useRef<TimelineHandle>(null)
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null)

  useEffect(() => {
    if (songs.length > 0 && !selectedSongId) {
      setSelectedSongId(songs[0].id)
    }
  }, [songs, selectedSongId])

  const selectedSong = songs.find((s) => s.id === selectedSongId)
  const songCues = selectedSong ? cues.filter((c) => c.song_id === selectedSong.id) : []
  const activeCue = getActiveCue(songCues, positionSec)

  // Broadcast on every tick (~100ms via RAF)
  const broadcastRef = useRef(broadcast)
  broadcastRef.current = broadcast
  useEffect(() => {
    if (!selectedSong) return
    broadcastRef.current({
      playing,
      position_sec: positionSec,
      song_id: selectedSongId,
    })
  }, [playing, Math.floor(positionSec * 5) / 5, selectedSongId]) // broadcast ~5x/sec

  // Spacebar → play/pause
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      e.preventDefault()
      playing ? pause() : play()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [playing, play, pause])

  const handleReset = useCallback(() => {
    reset()
    timelineRef.current?.scrollToSec(0)
  }, [reset])

  const handleSongSelect = useCallback((id: string) => {
    reset()
    setSelectedSongId(id)
    timelineRef.current?.scrollToSec(0)
  }, [reset])

  if (loading) {
    return (
      <div className="h-screen bg-bg flex items-center justify-center">
        <p className="font-mono text-muted text-sm animate-pulse">Cargando…</p>
      </div>
    )
  }

  if (error || !show) {
    return (
      <div className="h-screen bg-bg flex flex-col items-center justify-center gap-4">
        <p className="font-mono text-tally text-sm">{error ?? 'Show no encontrado'}</p>
        <button className="font-mono text-muted hover:text-cream" onClick={() => navigate('/')}>
          ← Inicio
        </button>
      </div>
    )
  }

  const activeCamColor = activeCue ? CAM_COLORS[activeCue.camera_number - 1] : null

  return (
    <div className="h-screen bg-bg flex flex-col overflow-hidden">
      {/* ── Top bar ── */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-border bg-panel flex-shrink-0">
        <button className="font-mono text-muted hover:text-cream text-sm" onClick={() => navigate('/')}>←</button>
        <h1 className="font-display font-bold uppercase tracking-widest text-cream text-lg">{show.name}</h1>
        <div className="flex items-center gap-1 bg-bg border border-border rounded px-2 py-0.5">
          <span className="font-mono text-muted" style={{ fontSize: 9 }}>CÓDIGO</span>
          <span className="font-mono font-bold text-cream">{show.code}</span>
        </div>
        <div className="flex-1" />
        <span className="font-mono text-muted text-xs">REALIZADOR</span>
      </div>

      {/* ── Song chips ── */}
      <div className="flex gap-2 px-4 py-2 border-b border-border overflow-x-auto flex-shrink-0">
        {songs.map((s) => (
          <button
            key={s.id}
            className={`flex-shrink-0 font-mono text-xs px-3 py-1 rounded border transition-colors ${
              s.id === selectedSongId
                ? 'border-cream text-cream bg-panel-hover'
                : 'border-border text-muted hover:border-muted'
            }`}
            onClick={() => handleSongSelect(s.id)}
          >
            {s.title}
          </button>
        ))}
      </div>

      {/* ── Timeline ── */}
      <div className="flex-1 overflow-hidden">
        {selectedSong ? (
          <Timeline
            ref={timelineRef}
            cues={songCues}
            durationSecs={selectedSong.duration_secs}
            pxPerSec={PX_PER_SEC}
            readonly
            playing={playing}
            playheadSec={positionSec}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="font-mono text-muted text-sm">Selecciona una canción</p>
          </div>
        )}
      </div>

      {/* ── Controls ── */}
      <div
        className="flex-shrink-0 flex items-center gap-6 px-6 py-4 border-t border-border"
        style={{ background: '#0F1114' }}
      >
        {/* Active camera indicator */}
        <div
          className="flex items-center gap-2 min-w-24"
          style={{ opacity: activeCue ? 1 : 0.3 }}
        >
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: activeCamColor ?? '#6B6F76', boxShadow: activeCamColor ? `0 0 8px ${activeCamColor}` : undefined }}
          />
          <span className="font-display font-bold text-sm" style={{ color: activeCamColor ?? '#6B6F76' }}>
            {activeCue ? `CAM ${activeCue.camera_number}` : 'SIN CUE'}
          </span>
        </div>

        <div className="flex-1" />

        {/* Transport controls */}
        <div className="flex items-center gap-4">
          <button
            className="w-10 h-10 rounded-full border border-border text-muted hover:text-cream hover:border-muted transition-colors font-mono text-lg flex items-center justify-center"
            onClick={handleReset}
            title="Reiniciar"
          >
            ⏮
          </button>
          <button
            className="w-14 h-14 rounded-full border-2 font-mono text-2xl flex items-center justify-center transition-colors"
            style={{
              borderColor: playing ? '#E1262C' : '#F4F1EA',
              color: playing ? '#E1262C' : '#F4F1EA',
              background: playing ? '#E1262C22' : 'transparent',
            }}
            onClick={playing ? pause : play}
          >
            {playing ? '⏸' : '▶'}
          </button>
        </div>

        <div className="flex-1" />

        {/* Cronómetro */}
        <div className="text-right">
          <div
            className="font-mono font-bold tabular-nums"
            style={{ fontSize: 32, color: playing ? '#F4F1EA' : '#6B6F76' }}
          >
            {fmt(positionSec)}
          </div>
          {selectedSong && (
            <div className="font-mono text-muted" style={{ fontSize: 10 }}>
              / {fmt(selectedSong.duration_secs)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
