import { useState } from 'react'
import {
  DndContext, closestCenter,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Song } from '@/lib/types'

function SortableSong({
  song,
  selected,
  onSelect,
  onRename,
  onDelete,
  onDurationChange,
}: {
  song: Song
  selected: boolean
  onSelect: () => void
  onRename: (title: string) => void
  onDelete: () => void
  onDurationChange: (secs: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: song.id })
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingDur, setEditingDur] = useState(false)
  const [titleVal, setTitleVal] = useState(song.title)
  const [durVal, setDurVal] = useState(String(song.duration_secs))

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-1 px-2 py-1 rounded cursor-pointer select-none ${
        selected ? 'bg-panel-hover border border-border' : 'hover:bg-panel-hover'
      }`}
      onClick={onSelect}
    >
      {/* Drag handle */}
      <span
        {...attributes}
        {...listeners}
        className="text-muted cursor-grab active:cursor-grabbing flex-shrink-0 opacity-0 group-hover:opacity-100"
        style={{ fontSize: 12 }}
      >
        ⠿
      </span>

      {/* Title */}
      {editingTitle ? (
        <input
          autoFocus
          className="flex-1 bg-transparent border-b border-border text-cream font-mono text-xs outline-none"
          value={titleVal}
          onChange={(e) => setTitleVal(e.target.value)}
          onBlur={() => { setEditingTitle(false); onRename(titleVal) }}
          onKeyDown={(e) => { if (e.key === 'Enter') { setEditingTitle(false); onRename(titleVal) } }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className="flex-1 text-cream font-mono text-xs truncate"
          onDoubleClick={(e) => { e.stopPropagation(); setEditingTitle(true) }}
        >
          {song.title}
        </span>
      )}

      {/* Duration */}
      {editingDur ? (
        <input
          autoFocus
          className="w-10 bg-transparent border-b border-border text-muted font-mono text-xs outline-none text-right"
          value={durVal}
          onChange={(e) => setDurVal(e.target.value)}
          onBlur={() => {
            setEditingDur(false)
            const n = parseInt(durVal, 10)
            if (!isNaN(n) && n > 0) onDurationChange(n)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setEditingDur(false)
              const n = parseInt(durVal, 10)
              if (!isNaN(n) && n > 0) onDurationChange(n)
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className="text-muted font-mono text-xs flex-shrink-0"
          onDoubleClick={(e) => { e.stopPropagation(); setEditingDur(true) }}
        >
          {Math.floor(song.duration_secs / 60)}:{String(song.duration_secs % 60).padStart(2, '0')}
        </span>
      )}

      {/* Delete */}
      <button
        className="text-muted hover:text-tally opacity-0 group-hover:opacity-100 flex-shrink-0"
        style={{ fontSize: 12 }}
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        title="Eliminar canción"
      >
        ✕
      </button>
    </div>
  )
}

interface Props {
  songs: Song[]
  selectedSongId: string | null
  onSelectSong: (id: string) => void
  onAddSong: () => void
  onRenameSong: (id: string, title: string) => void
  onDeleteSong: (id: string) => void
  onDurationChange: (id: string, secs: number) => void
  onReorder: (songs: Song[]) => void
}

export default function SongList({
  songs, selectedSongId, onSelectSong, onAddSong,
  onRenameSong, onDeleteSong, onDurationChange, onReorder,
}: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIdx = songs.findIndex((s) => s.id === active.id)
    const newIdx = songs.findIndex((s) => s.id === over.id)
    onReorder(arrayMove(songs, oldIdx, newIdx))
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="font-display text-xs uppercase tracking-widest text-muted">Canciones</span>
        <button
          className="text-muted hover:text-cream font-mono text-lg leading-none"
          onClick={onAddSong}
          title="Añadir canción"
        >
          +
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-1">
        {songs.length === 0 ? (
          <p className="text-muted font-mono text-xs p-3 text-center">
            Sin canciones.<br />Pulsa + para añadir.
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={songs.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {songs.map((song) => (
                <SortableSong
                  key={song.id}
                  song={song}
                  selected={song.id === selectedSongId}
                  onSelect={() => onSelectSong(song.id)}
                  onRename={(title) => onRenameSong(song.id, title)}
                  onDelete={() => onDeleteSong(song.id)}
                  onDurationChange={(secs) => onDurationChange(song.id, secs)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div className="px-3 py-2 border-t border-border">
        <p className="font-mono text-muted" style={{ fontSize: 9 }}>
          Doble clic en nombre/duración para editar
        </p>
      </div>
    </div>
  )
}
