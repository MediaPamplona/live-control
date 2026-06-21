import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Show, Song, Cue } from '@/lib/types'

interface UseShowOptions {
  showId?: string
  showCode?: string
}

export function useShow({ showId, showCode }: UseShowOptions) {
  const [show, setShow] = useState<Show | null>(null)
  const [songs, setSongs] = useState<Song[]>([])
  const [cues, setCues] = useState<Cue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      } else {
        setCues([])
      }
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
    if (err) { console.error(err); return null }
    const s = data as Show
    setShow(s)
    return s
  }, [])

  const updateShowName = useCallback(async (name: string) => {
    if (!show) return
    await supabase.from('shows').update({ name }).eq('id', show.id)
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

  const updateSong = useCallback(async (id: string, patch: Partial<Pick<Song, 'title' | 'duration_secs'>>) => {
    await supabase.from('songs').update(patch).eq('id', id)
    setSongs((prev) => prev.map((s) => s.id === id ? { ...s, ...patch } : s))
  }, [])

  const deleteSong = useCallback(async (id: string) => {
    await supabase.from('songs').delete().eq('id', id)
    setSongs((prev) => prev.filter((s) => s.id !== id))
    setCues((prev) => prev.filter((c) => c.song_id !== id))
  }, [])

  const reorderSongs = useCallback(async (reordered: Song[]) => {
    setSongs(reordered)
    await Promise.all(
      reordered.map((s, i) => supabase.from('songs').update({ sort_order: i }).eq('id', s.id))
    )
  }, [])

  // --- Cues ---
  const addCue = useCallback(async (cue: Omit<Cue, 'id'>): Promise<Cue | null> => {
    const { data, error: err } = await supabase.from('cues').insert(cue).select().single()
    if (err) { console.error(err); return null }
    const created = data as Cue
    setCues((prev) => [...prev, created])
    return created
  }, [])

  const updateCue = useCallback(async (id: string, patch: Partial<Omit<Cue, 'id' | 'song_id'>>) => {
    await supabase.from('cues').update(patch).eq('id', id)
    setCues((prev) => prev.map((c) => c.id === id ? { ...c, ...patch } : c))
  }, [])

  const deleteCue = useCallback(async (id: string) => {
    await supabase.from('cues').delete().eq('id', id)
    setCues((prev) => prev.filter((c) => c.id !== id))
  }, [])

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
    reload: loadShow,
    createShow, updateShowName,
    addSong, updateSong, deleteSong, reorderSongs,
    addCue, updateCue, deleteCue, uploadCueImage,
    setCues,
  }
}
