import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Show, Song, Cue, Instrument, InstrumentCue } from '@/lib/types'
import { INSTRUMENT_COLORS } from '@/lib/types'

interface UseShowOptions {
  showId?: string
  showCode?: string
}

export function useShow({ showId, showCode }: UseShowOptions) {
  const [show, setShow] = useState<Show | null>(null)
  const [songs, setSongs] = useState<Song[]>([])
  const [cues, setCues] = useState<Cue[]>([])
  const [instruments, setInstruments] = useState<Instrument[]>([])
  const [instrumentCues, setInstrumentCues] = useState<InstrumentCue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const notifyError = (msg: string) => {
    setSaveError(msg)
    setTimeout(() => setSaveError(null), 5000)
  }

  const loadShow = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let showData: Show | null = null

      if (showId) {
        const { data, error: err } = await supabase
          .from('shows').select('*').eq('id', showId).single()
        if (err) throw err
        showData = data as Show
      } else if (showCode) {
        const { data, error: err } = await supabase
          .from('shows').select('*').eq('code', showCode.toUpperCase()).single()
        if (err) throw err
        showData = data as Show
      }

      if (!showData) throw new Error('Show no encontrado')
      setShow(showData)

      const { data: songsRaw, error: songsErr } = await supabase
        .from('songs').select('*').eq('show_id', showData.id).order('sort_order')
      if (songsErr) throw songsErr
      const songsData = (songsRaw ?? []) as Song[]
      setSongs(songsData)

      const songIds = songsData.map((s: Song) => s.id)
      if (songIds.length > 0) {
        const { data: cuesRaw, error: cuesErr } = await supabase
          .from('cues').select('*').in('song_id', songIds)
        if (cuesErr) throw cuesErr
        setCues((cuesRaw ?? []) as Cue[])

        const { data: instCuesRaw } = await supabase
          .from('instrument_cues').select('*').in('song_id', songIds)
        setInstrumentCues((instCuesRaw ?? []) as InstrumentCue[])
      } else {
        setCues([])
        setInstrumentCues([])
      }

      const { data: instRaw } = await supabase
        .from('instruments').select('*').eq('show_id', showData.id).order('sort_order')
      setInstruments((instRaw ?? []) as Instrument[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [showId, showCode])

  useEffect(() => { loadShow() }, [loadShow])

  // --- Show ---
  const createShow = useCallback(async (name: string): Promise<Show | null> => {
    const { data, error: err } = await supabase
      .from('shows').insert({ name }).select().single()
    if (err) { console.error(err); notifyError(`Error al crear show: ${err.message}`); return null }
    const s = data as Show
    setShow(s)
    return s
  }, [])

  const updateShowName = useCallback(async (name: string) => {
    if (!show) return
    const { error: err } = await supabase.from('shows').update({ name }).eq('id', show.id)
    if (err) { notifyError(`Error al actualizar show: ${err.message}`); return }
    setShow((prev) => prev ? { ...prev, name } : prev)
  }, [show])

  // --- Songs ---
  const addSong = useCallback(async (): Promise<Song | null> => {
    if (!show) return null
    const maxOrder = songs.reduce((m: number, s: Song) => Math.max(m, s.sort_order), -1)
    const { data, error: err } = await supabase
      .from('songs')
      .insert({ show_id: show.id, title: 'Nueva canción', duration_secs: 180, sort_order: maxOrder + 1 })
      .select().single()
    if (err) { console.error(err); return null }
    const song = data as Song
    setSongs((prev) => [...prev, song])
    return song
  }, [show, songs])

  const updateSong = useCallback(async (id: string, patch: Partial<Pick<Song, 'title' | 'duration_secs' | 'audio_url'>>) => {
    const { error: err } = await supabase.from('songs').update(patch).eq('id', id)
    if (err) { notifyError(`Error al actualizar canción: ${err.message}`); return }
    setSongs((prev) => prev.map((s) => s.id === id ? { ...s, ...patch } : s))
  }, [])

  const deleteSong = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('songs').delete().eq('id', id)
    if (err) { notifyError(`Error al eliminar canción: ${err.message}`); return }
    setSongs((prev) => prev.filter((s) => s.id !== id))
    setCues((prev) => prev.filter((c) => c.song_id !== id))
  }, [])

  const reorderSongs = useCallback(async (reordered: Song[]) => {
    setSongs(reordered)
    const results = await Promise.all(
      reordered.map((s, i) => supabase.from('songs').update({ sort_order: i }).eq('id', s.id))
    )
    const failed = results.find((r) => r.error)
    if (failed?.error) notifyError(`Error al reordenar canciones: ${failed.error.message}`)
  }, [])

  // --- Cues ---
  const addCue = useCallback(async (cue: Omit<Cue, 'id'>): Promise<Cue | null> => {
    const { data, error: err } = await supabase.from('cues').insert(cue).select().single()
    if (err) {
      console.error(err)
      notifyError(`Error al guardar cue: ${err.message}`)
      return null
    }
    const created = data as Cue
    setCues((prev) => [...prev, created])
    return created
  }, [])

  const updateCue = useCallback(async (id: string, patch: Partial<Omit<Cue, 'id' | 'song_id'>>) => {
    const { error: err } = await supabase.from('cues').update(patch).eq('id', id)
    if (err) {
      console.error(err)
      notifyError(`Error al actualizar cue: ${err.message}`)
      return
    }
    setCues((prev) => prev.map((c) => c.id === id ? { ...c, ...patch } : c))
  }, [])

  const deleteCue = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('cues').delete().eq('id', id)
    if (err) { notifyError(`Error al eliminar cue: ${err.message}`); return }
    setCues((prev) => prev.filter((c) => c.id !== id))
  }, [])

  // --- Instruments ---
  const addInstrument = useCallback(async (name: string): Promise<Instrument | null> => {
    if (!show) return null
    const maxOrder = instruments.reduce((m, i) => Math.max(m, i.sort_order), -1)
    const color = INSTRUMENT_COLORS[instruments.length % INSTRUMENT_COLORS.length]
    const { data, error: err } = await supabase
      .from('instruments')
      .insert({ show_id: show.id, name, color, sort_order: maxOrder + 1 })
      .select().single()
    if (err) { notifyError(`Error al crear instrumento: ${err.message}`); return null }
    const inst = data as Instrument
    setInstruments((prev) => [...prev, inst])
    return inst
  }, [show, instruments])

  const updateInstrument = useCallback(async (id: string, patch: Partial<Pick<Instrument, 'name' | 'color'>>) => {
    const { error: err } = await supabase.from('instruments').update(patch).eq('id', id)
    if (err) { notifyError(`Error al actualizar instrumento: ${err.message}`); return }
    setInstruments((prev) => prev.map((i) => i.id === id ? { ...i, ...patch } : i))
  }, [])

  const deleteInstrument = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('instruments').delete().eq('id', id)
    if (err) { notifyError(`Error al eliminar instrumento: ${err.message}`); return }
    setInstruments((prev) => prev.filter((i) => i.id !== id))
    setInstrumentCues((prev) => prev.filter((c) => c.instrument_id !== id))
  }, [])

  // --- Instrument cues ---
  const addInstrumentCue = useCallback(async (cue: Omit<InstrumentCue, 'id'>): Promise<InstrumentCue | null> => {
    const { data, error: err } = await supabase.from('instrument_cues').insert(cue).select().single()
    if (err) { notifyError(`Error al guardar bloque: ${err.message}`); return null }
    const created = data as InstrumentCue
    setInstrumentCues((prev) => [...prev, created])
    return created
  }, [])

  const uploadInstrumentImage = useCallback(async (instrumentId: string, file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop()
    const path = `inst-${instrumentId}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('cue-images').upload(path, file, { upsert: true })
    if (upErr) { console.error(upErr); return null }
    const { data } = supabase.storage.from('cue-images').getPublicUrl(path)
    const url = data.publicUrl
    await supabase.from('instruments').update({ image_url: url }).eq('id', instrumentId)
    setInstruments((prev) => prev.map((i) => i.id === instrumentId ? { ...i, image_url: url } : i))
    return url
  }, [])

  const updateInstrumentCue = useCallback(async (id: string, patch: Partial<Pick<InstrumentCue, 'start_sec' | 'end_sec' | 'note'>>) => {
    const { error: err } = await supabase.from('instrument_cues').update(patch).eq('id', id)
    if (err) { notifyError(`Error al actualizar bloque: ${err.message}`); return }
    setInstrumentCues((prev) => prev.map((c) => c.id === id ? { ...c, ...patch } : c))
  }, [])

  const deleteInstrumentCue = useCallback(async (id: string) => {
    await supabase.from('instrument_cues').delete().eq('id', id)
    setInstrumentCues((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const uploadSongAudio = useCallback(async (songId: string, file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop()
    const path = `${songId}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('song-audio').upload(path, file, { upsert: true })
    if (upErr) {
      console.error(upErr)
      notifyError(`Error al subir audio: ${upErr.message}`)
      return null
    }
    const { data } = supabase.storage.from('song-audio').getPublicUrl(path)
    const url = data.publicUrl
    await updateSong(songId, { audio_url: url })
    return url
  }, [updateSong])

  const uploadCueImage = useCallback(async (cueId: string, file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop()
    const path = `${cueId}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('cue-images').upload(path, file, { upsert: true })
    if (upErr) { console.error(upErr); return null }
    const { data } = supabase.storage.from('cue-images').getPublicUrl(path)
    const url = data.publicUrl
    await updateCue(cueId, { image_url: url })
    return url
  }, [updateCue])

  return {
    show, songs, cues, loading, error,
    instruments, instrumentCues,
    reload: loadShow,
    createShow, updateShowName,
    saveError,
    addSong, updateSong, deleteSong, reorderSongs, uploadSongAudio,
    addCue, updateCue, deleteCue, uploadCueImage,
    addInstrument, updateInstrument, deleteInstrument, uploadInstrumentImage,
    addInstrumentCue, updateInstrumentCue, deleteInstrumentCue,
    setCues,
  }
}
