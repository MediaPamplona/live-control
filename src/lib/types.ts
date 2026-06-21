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
