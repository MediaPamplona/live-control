import { useState, useRef } from 'react'
import type { Instrument } from '@/lib/types'
import { INSTRUMENT_COLORS } from '@/lib/types'

interface Props {
  instruments: Instrument[]
  selectedId?: string | null
  onSelect?: (id: string) => void
  onAdd: (name: string) => void
  onRename: (id: string, name: string) => void
  onColorChange: (id: string, color: string) => void
  onDelete: (id: string) => void
}

export default function InstrumentList({ instruments, selectedId, onSelect, onAdd, onRename, onColorChange, onDelete }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const commitRename = (id: string) => {
    if (editVal.trim()) onRename(id, editVal.trim())
    setEditingId(null)
  }

  const commitAdd = () => {
    if (newName.trim()) onAdd(newName.trim())
    setNewName('')
    setAdding(false)
  }

  return (
    <div className="flex flex-col" style={{ maxHeight: 200 }}>
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-b border-border flex-shrink-0" style={{ background: '#0F1114' }}>
        <span className="font-display text-xs uppercase tracking-widest text-muted">Instrumentos</span>
        <button
          className="text-muted hover:text-cream font-mono text-base leading-none"
          onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(), 0) }}
          title="Añadir instrumento"
        >+</button>
      </div>

      <div className="overflow-y-auto flex flex-col">
        {adding && (
          <div className="flex items-center gap-1 px-2 py-1 border-b border-border">
            <input
              ref={inputRef}
              className="flex-1 bg-transparent border-b border-muted text-cream font-mono outline-none"
              style={{ fontSize: 11 }}
              placeholder="Nombre..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={commitAdd}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitAdd()
                if (e.key === 'Escape') { setAdding(false); setNewName('') }
              }}
            />
          </div>
        )}

        {instruments.length === 0 && !adding && (
          <p className="font-mono text-muted px-3 py-2" style={{ fontSize: 10 }}>
            Sin instrumentos aún
          </p>
        )}

        {instruments.map((inst) => {
          const isSelected = inst.id === selectedId
          return (
            <div
              key={inst.id}
              className="flex items-center gap-1.5 px-2 py-1 group border-b border-border cursor-pointer"
              style={{
                borderColor: '#1A1D2240',
                background: isSelected ? `${inst.color}18` : 'transparent',
              }}
              onClick={() => editingId !== inst.id && onSelect?.(inst.id)}
            >
              {/* Selected indicator */}
              <div
                className="flex-shrink-0 rounded-sm transition-all"
                style={{ width: 3, height: 14, background: isSelected ? inst.color : 'transparent' }}
              />

              {/* Color dot — click to cycle through colors */}
              <button
                className="flex-shrink-0 rounded-full border border-transparent hover:border-muted transition-colors"
                style={{ width: 9, height: 9, background: inst.color }}
                title="Cambiar color"
                onClick={(e) => {
                  e.stopPropagation()
                  const idx = INSTRUMENT_COLORS.indexOf(inst.color)
                  onColorChange(inst.id, INSTRUMENT_COLORS[(idx + 1) % INSTRUMENT_COLORS.length])
                }}
              />

              {/* Name */}
              {editingId === inst.id ? (
                <input
                  autoFocus
                  className="flex-1 bg-transparent border-b border-muted text-cream font-mono outline-none"
                  style={{ fontSize: 11 }}
                  value={editVal}
                  onChange={(e) => setEditVal(e.target.value)}
                  onBlur={() => commitRename(inst.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename(inst.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className="flex-1 font-mono truncate"
                  style={{ fontSize: 11, color: isSelected ? inst.color : '#9CA3AF' }}
                  onDoubleClick={(e) => { e.stopPropagation(); setEditingId(inst.id); setEditVal(inst.name) }}
                  title="Doble clic para renombrar"
                >
                  {inst.name}
                </span>
              )}

              {/* Delete */}
              <button
                className="opacity-0 group-hover:opacity-100 text-muted hover:text-tally font-mono transition-opacity flex-shrink-0"
                style={{ fontSize: 10 }}
                onClick={(e) => { e.stopPropagation(); onDelete(inst.id) }}
                title="Eliminar"
              >✕</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
