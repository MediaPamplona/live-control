export interface Show {
  id: string
  name: string
  code: string
  created_at: string
}

export interface Song {
  id: string
  show_id: string
  title: string
  duration_secs: number
  sort_order: number
  audio_url: string | null
  bpm: number | null
}

export interface Cue {
  id: string
  song_id: string
  camera_number: number
  start_sec: number
  end_sec: number
  image_url: string | null
  note: string | null
}

export interface ClockState {
  playing: boolean
  position_sec: number
  song_id: string | null
}

// Colors per camera (0-indexed: cam 1 = index 0)
export const CAM_COLORS = [
  '#E1262C', // cam 1
  '#2196F3', // cam 2
  '#4CAF50', // cam 3
  '#FF9800', // cam 4
  '#9C27B0', // cam 5
  '#00BCD4', // cam 6
]

export const NUM_CAMERAS = 6

// camera_number = 0 is the music track (special, max 1 cue per song)
export const MUSIC_TRACK_NUM = 0
export const MUSIC_COLOR = '#FBBF24' // amber

export interface Instrument {
  id: string
  show_id: string
  name: string
  color: string
  sort_order: number
  image_url: string | null
  emoji: string | null
}

export interface InstrumentCue {
  id: string
  song_id: string
  instrument_id: string
  start_sec: number
  end_sec: number
  note: string | null
}

export const INSTRUMENT_COLORS = [
  '#8B5CF6', '#EC4899', '#10B981', '#F59E0B',
  '#3B82F6', '#EF4444', '#06B6D4', '#F97316',
]

export interface Singer {
  id: string
  show_id: string
  name: string
  color: string
  sort_order: number
  image_url: string | null
  emoji: string | null
}

export interface SingerCue {
  id: string
  song_id: string
  singer_id: string
  start_sec: number
  end_sec: number
  note: string | null
}

export const SINGER_COLORS = [
  '#F43F5E', '#14B8A6', '#A855F7', '#EAB308',
  '#0EA5E9', '#22C55E', '#D946EF', '#FB923C',
]
