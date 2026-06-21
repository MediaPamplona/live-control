import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useShow } from '@/hooks/useShow'
import { useClock } from '@/hooks/useClock'
import { useCameraReceive } from '@/hooks/useRealtime'
import type { Cue, ClockState } from '@/lib/types'
import { CAM_COLORS } from '@/lib/types'

function fmt(sec: number) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function getActiveCue(cues: Cue[], positionSec: number): Cue | null {
  return cues.find((c) => c.start_sec <= positionSec && c.end_sec > positionSec) ?? null
}

function getNextCue(cues: Cue[], positionSec: number): Cue | null {
  const future = cues.filter((c) => c.start_sec > positionSec)
  if (!future.length) return null
  return future.reduce((a, b) => a.start_sec < b.start_sec ? a : b)
}

export default function CameraView() {
  const { showCode, camNum } = useParams<{ showCode: string; camNum: string }>()
  const navigate = useNavigate()
  const camNumber = parseInt(camNum ?? '1', 10)
  const { cues, songs, loading, error } = useShow({ showCode })
  const { positionSec, syncExternal } = useClock()
  const [songId, setSongId] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [lastSync, setLastSync] = useState(0)

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
  const activeCue = getActiveCue(songCues, positionSec)
  const nextCue = getNextCue(songCues, positionSec)

  const isLive = !!activeCue
  const camColor = CAM_COLORS[camNumber - 1]
  const secsToNext = nextCue ? nextCue.start_sec - positionSec : null

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

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6 relative">

        {/* Reference photo background (live) */}
        {isLive && activeCue?.image_url && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `url(${activeCue.image_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.15,
            }}
          />
        )}

        {isLive ? (
          /* ── LIVE STATE ── */
          <div className="flex flex-col items-center gap-4 z-10 text-center">
            {/* Live indicator */}
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-tally animate-pulse" style={{ boxShadow: '0 0 16px #E1262C' }} />
              <span className="font-display font-bold text-tally tracking-widest" style={{ fontSize: 22 }}>
                AL AIRE
              </span>
            </div>

            {/* Time remaining in cue */}
            <div
              className="font-mono font-bold tabular-nums text-white"
              style={{ fontSize: 72, lineHeight: 1, textShadow: '0 0 40px #E1262C88' }}
            >
              {fmt(activeCue.end_sec - positionSec)}
            </div>
            <div className="font-mono text-white opacity-50" style={{ fontSize: 13 }}>
              restantes en este plano
            </div>

            {/* Note */}
            {activeCue.note && (
              <div
                className="font-mono text-white opacity-70 border border-white border-opacity-20 rounded px-4 py-2"
                style={{ fontSize: 14 }}
              >
                {activeCue.note}
              </div>
            )}

            {/* Reference photo corner */}
            {activeCue.image_url && (
              <img
                src={activeCue.image_url}
                alt="Referencia"
                className="rounded border-2 border-white border-opacity-30 object-cover"
                style={{ width: 180, height: 100 }}
              />
            )}
          </div>
        ) : (
          /* ── STANDBY STATE ── */
          <div className="flex flex-col items-center gap-6 z-10 text-center">
            {/* Next cue countdown */}
            {secsToNext !== null && secsToNext > 0 ? (
              <>
                <div className="font-mono text-muted uppercase tracking-widest" style={{ fontSize: 12 }}>
                  próximo turno en
                </div>
                <div
                  className="font-mono font-bold tabular-nums"
                  style={{
                    fontSize: 80,
                    lineHeight: 1,
                    color: secsToNext < 10 ? '#F2A93B' : camColor,
                    textShadow: secsToNext < 10 ? '0 0 30px #F2A93B88' : undefined,
                    transition: 'color 0.3s',
                  }}
                >
                  {secsToNext < 60 ? `${Math.ceil(secsToNext)}s` : fmt(secsToNext)}
                </div>

                {/* Next cue reference photo */}
                {nextCue?.image_url && (
                  <div className="flex flex-col items-center gap-2">
                    <span className="font-mono text-muted uppercase tracking-widest" style={{ fontSize: 9 }}>
                      Prepara este encuadre
                    </span>
                    <img
                      src={nextCue.image_url}
                      alt="Siguiente encuadre"
                      className="rounded border border-border object-cover"
                      style={{ width: 280, height: 158, maxWidth: '80vw' }}
                    />
                    {nextCue.note && (
                      <p className="font-mono text-muted" style={{ fontSize: 12 }}>
                        {nextCue.note}
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div
                  className="font-mono font-bold tabular-nums"
                  style={{ fontSize: 80, lineHeight: 1, color: '#6B6F76' }}
                >
                  ESPERA
                </div>
                <p className="font-mono text-muted text-sm">Sin cues para esta cámara</p>
              </div>
            )}
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
