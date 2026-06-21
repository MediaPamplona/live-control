import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useShow } from '@/hooks/useShow'
import Timeline from '@/components/timeline/Timeline'
import SongList from '@/components/SongList'
import CueProperties from '@/components/CueProperties'
import type { Cue, Song } from '@/lib/types'

const PX_PER_SEC = 14

export default function EditorView() {
  const { showId } = useParams<{ showId: string }>()
  const navigate = useNavigate()
  const {
    show, songs, cues, loading, error,
    updateShowName,
    addSong, updateSong, deleteSong, reorderSongs,
    addCue, updateCue, deleteCue, uploadCueImage,
  } = useShow({ showId })

  const [selectedSongId, setSelectedSongId] = useState<string | null>(null)
  const [selectedCueId, setSelectedCueId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState('')
  const [copied, setCopied] = useState('')

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
  const selectedCue: Cue | null = cues.find((c) => c.id === selectedCueId) ?? null

  const handleCueCreate = useCallback(
    async (cueData: Omit<Cue, 'id'>) => {
      const created = await addCue(cueData)
      if (created) setSelectedCueId(created.id)
      return created
    },
    [addCue]
  )

  const handleCueUpdate = useCallback(
    (id: string, patch: Partial<Omit<Cue, 'id' | 'song_id'>>) => {
      updateCue(id, patch)
    },
    [updateCue]
  )

  const handleCueSelect = useCallback(
    (id: string | null) => {
      setSelectedCueId(id)
    },
    []
  )

  const handleDeleteCue = useCallback(
    (id: string) => {
      deleteCue(id)
      setSelectedCueId(null)
    },
    [deleteCue]
  )

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
        {/* Left: Song list */}
        <div className="w-48 flex-shrink-0 border-r border-border bg-panel overflow-hidden flex flex-col">
          <SongList
            songs={songs}
            selectedSongId={selectedSongId}
            onSelectSong={(id) => { setSelectedSongId(id); setSelectedCueId(null) }}
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
          />
        </div>

        {/* Center: Timeline */}
        <div className="flex-1 overflow-hidden flex flex-col">
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
                <span className="flex-1" />
                <span className="font-mono text-muted" style={{ fontSize: 9 }}>
                  Arrastra en la pista para crear · Bordes para redimensionar · Delete para eliminar
                </span>
              </div>
              <Timeline
                cues={songCues}
                durationSecs={selectedSong.duration_secs}
                pxPerSec={PX_PER_SEC}
                selectedCueId={selectedCueId}
                songId={selectedSong.id}
                onCueCreate={handleCueCreate}
                onCueUpdate={handleCueUpdate}
                onCueSelect={handleCueSelect}
              />
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
          <CueProperties
            cue={selectedCue}
            onUpdate={handleCueUpdate}
            onDelete={handleDeleteCue}
            onUploadImage={uploadCueImage}
          />
        </div>
      </div>
    </div>
  )
}
