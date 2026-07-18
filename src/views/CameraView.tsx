import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useShow } from '@/hooks/useShow'
import { useClock } from '@/hooks/useClock'
import { useCameraReceive } from '@/hooks/useRealtime'
import Timeline, { type TimelineHandle } from '@/components/timeline/Timeline'
import type { Cue, ClockState } from '@/lib/types'
import { CAM_COLORS } from '@/lib/types'

const MIN_PX = 3
const MAX_PX = 40
const DEFAULT_PX = 8

function fmt(sec: number) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function getActiveCue(cues: Cue[], positionSec: number): Cue | null {
  return cues.find((c) => c.start_sec <= positionSec && c.end_sec > positionSec) ?? null
}

export default function CameraView() {
  const { showCode, camNum } = useParams<{ showCode: string; camNum: string }>()
  const navigate = useNavigate()
  const camNumber = parseInt(camNum ?? '1', 10)
  const { cues, songs, instruments, instrumentCues, singers, singerCues, loading, error } = useShow({ showCode })
  const { positionSec, playing, syncExternal } = useClock()
  const [songId, setSongId] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [lastSync, setLastSync] = useState(0)
  const [pxPerSec, setPxPerSec] = useState(DEFAULT_PX)
  const timelineRef = useRef<TimelineHandle>(null)

  const onClock = useCallback(
    (state: ClockState) => {
      setConnected(true)
      setLastSync(Date.now())
      setSongId(state.song_id)
      syncExternal(state.playing, state.position_sec)
    },
    [syncExternal]
  )

  useCameraReceive(showCode ?? '', onClock)

  // Detect connection loss (no broadcast for >5s)
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastSync > 0 && Date.now() - lastSync > 5000) {
        setConnected(false)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [lastSync])

  const selectedSong = songs.find((s) => s.id === songId)
  const songCues = selectedSong
    ? cues.filter((c) => c.song_id === selectedSong.id && c.camera_number === camNumber)
    : []
  const allSongCues = selectedSong ? cues.filter((c) => c.song_id === selectedSong.id) : []
  const songInstrumentCues = selectedSong ? instrumentCues.filter((c) => c.song_id === selectedSong.id) : []
  const songSingerCues = selectedSong ? singerCues.filter((c) => c.song_id === selectedSong.id) : []
  const activeCue = getActiveCue(songCues, positionSec)

  const isLive = !!activeCue
  const camColor = CAM_COLORS[camNumber - 1]

  // Reset scroll when the director switches songs
  useEffect(() => {
    timelineRef.current?.scrollToSec(0)
  }, [songId])

  if (loading) {
    return (
      <div className="h-screen bg-bg flex items-center justify-center">
        <p className="font-mono text-muted animate-pulse">Conectando…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen bg-bg flex flex-col items-center justify-center gap-4">
        <p className="font-mono text-tally">{error}</p>
        <button className="font-mono text-muted hover:text-cream" onClick={() => navigate('/')}>
          ← Inicio
        </button>
      </div>
    )
  }

  return (
    <div
      className="h-screen flex flex-col overflow-hidden transition-colors duration-300"
      style={{ background: isLive ? '#1A0203' : '#0B0C0E' }}
    >
      {/* ── Tally header ── */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-6 py-4"
        style={{
          background: isLive ? '#E1262C' : '#15171A',
          transition: 'background 0.15s ease',
        }}
      >
        <span
          className="font-mono font-bold"
          style={{ fontSize: 11, color: isLive ? '#fff' : camColor, letterSpacing: 3 }}
        >
          CAM {camNumber}
        </span>

        <div className="flex items-center gap-3">
          {!connected && (
            <span className="font-mono text-xs animate-pulse" style={{ color: '#F2A93B' }}>
              ● SIN SEÑAL
            </span>
          )}
          {isLive ? (
            <span className="font-display font-bold text-white tracking-widest" style={{ fontSize: 28 }}>
              EN DIRECTO
            </span>
          ) : (
            <span className="font-display font-bold tracking-widest" style={{ fontSize: 28, color: '#6B6F76' }}>
              ESPERA
            </span>
          )}
        </div>

        <span className="font-mono text-xs" style={{ color: isLive ? '#ffffff88' : '#6B6F76', letterSpacing: 1 }}>
          {showCode}
        </span>
      </div>

      {/* ── Status strip ── */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2 border-b border-border">
        {isLive ? (
          <>
            <div className="w-2.5 h-2.5 rounded-full bg-tally animate-pulse flex-shrink-0" style={{ boxShadow: '0 0 10px #E1262C' }} />
            <span className="font-display font-bold text-tally tracking-widest flex-shrink-0" style={{ fontSize: 13 }}>
              AL AIRE
            </span>
            {activeCue?.note && (
              <span className="font-mono text-white opacity-70 truncate" style={{ fontSize: 12 }}>
                {activeCue.note}
              </span>
            )}
            {activeCue?.image_url && (
              <img
                src={activeCue.image_url}
                alt="Referencia"
                className="rounded border border-white border-opacity-30 object-cover flex-shrink-0 ml-auto"
                style={{ width: 44, height: 44 }}
              />
            )}
          </>
        ) : (
          <span className="font-mono text-muted uppercase tracking-widest" style={{ fontSize: 12 }}>
            En espera — mira la línea de tiempo para ver cuándo entras
          </span>
        )}

        <div className="flex items-center gap-1 ml-auto flex-shrink-0">
          <button
            className="w-7 h-7 rounded border border-border text-muted hover:text-cream hover:border-muted font-mono text-base flex items-center justify-center transition-colors"
            onClick={() => setPxPerSec((p) => Math.max(MIN_PX, p - 2))}
            title="Alejar"
          >−</button>
          <button
            className="w-7 h-7 rounded border border-border text-muted hover:text-cream hover:border-muted font-mono text-base flex items-center justify-center transition-colors"
            onClick={() => setPxPerSec((p) => Math.min(MAX_PX, p + 2))}
            title="Acercar"
          >+</button>
        </div>
      </div>

      {/* ── Timeline: instrumentos, voces y todas las cámaras ── */}
      <div className="flex-1 overflow-hidden">
        {selectedSong ? (
          <Timeline
            ref={timelineRef}
            cues={allSongCues}
            durationSecs={selectedSong.duration_secs}
            pxPerSec={pxPerSec}
            onPxPerSecChange={(px) => setPxPerSec(Math.max(MIN_PX, Math.min(MAX_PX, px)))}
            readonly
            playing={playing}
            playheadSec={positionSec}
            instruments={instruments}
            instrumentCues={songInstrumentCues}
            singers={singers}
            singerCues={songSingerCues}
            highlightCameraNumber={camNumber}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="font-mono text-muted text-sm">Esperando canción…</p>
          </div>
        )}
      </div>

      {/* ── Footer: global position ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-t border-border">
        <span className="font-mono text-muted text-xs">
          {selectedSong?.title ?? '—'}
        </span>
        <span className="font-mono tabular-nums" style={{ fontSize: 18, color: '#6B6F76' }}>
          {fmt(positionSec)}
        </span>
      </div>
    </div>
  )
}
