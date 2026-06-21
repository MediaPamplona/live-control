import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function HomeView() {
  const navigate = useNavigate()
  const [showName, setShowName] = useState('')
  const [dirCode, setDirCode] = useState('')
  const [camCode, setCamCode] = useState('')
  const [camNum, setCamNum] = useState('1')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const createShow = async () => {
    if (!showName.trim()) { setError('Escribe un nombre para el show'); return }
    setCreating(true)
    setError('')
    const { data, error: err } = await supabase
      .from('shows')
      .insert({ name: showName.trim() })
      .select()
      .single()
    setCreating(false)
    if (err || !data) { setError('Error al crear el show'); return }
    navigate(`/editor/${data.id}`)
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-10 p-6">
      {/* Logo / title */}
      <div className="text-center">
        <div className="flex items-center gap-3 justify-center mb-2">
          <div className="w-3 h-3 rounded-full bg-tally animate-pulse" />
          <h1 className="font-display text-4xl font-bold text-cream tracking-widest uppercase">
            Live Control
          </h1>
          <div className="w-3 h-3 rounded-full bg-tally animate-pulse" />
        </div>
        <p className="font-mono text-muted text-xs tracking-widest uppercase">
          Control de realización para directos
        </p>
      </div>

      <div className="w-full max-w-md flex flex-col gap-4">
        {/* Create new show */}
        <section className="bg-panel border border-border rounded-xl p-5 flex flex-col gap-3">
          <h2 className="font-display text-lg uppercase tracking-widest text-cream">Nuevo show</h2>
          <input
            className="bg-bg border border-border rounded px-3 py-2 font-mono text-cream text-sm outline-none focus:border-muted placeholder:text-muted"
            placeholder="Nombre del show"
            value={showName}
            onChange={(e) => setShowName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createShow()}
          />
          {error && <p className="font-mono text-tally text-xs">{error}</p>}
          <button
            className="bg-tally hover:bg-red-700 text-cream font-display uppercase tracking-widest py-2 rounded transition-colors disabled:opacity-50"
            onClick={createShow}
            disabled={creating}
          >
            {creating ? 'Creando...' : 'Crear + Abrir Editor'}
          </button>
        </section>

        {/* Director view */}
        <section className="bg-panel border border-border rounded-xl p-5 flex flex-col gap-3">
          <h2 className="font-display text-lg uppercase tracking-widest text-cream">Vista Realizador</h2>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-bg border border-border rounded px-3 py-2 font-mono text-cream text-sm uppercase outline-none focus:border-muted placeholder:text-muted"
              placeholder="Código del show"
              maxLength={6}
              value={dirCode}
              onChange={(e) => setDirCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && dirCode && navigate(`/director/${dirCode}`)}
            />
            <button
              className="bg-standby hover:opacity-90 text-bg font-display uppercase tracking-wider px-4 rounded transition-opacity disabled:opacity-50"
              onClick={() => dirCode && navigate(`/director/${dirCode}`)}
              disabled={!dirCode}
            >
              Ir
            </button>
          </div>
        </section>

        {/* Camera view */}
        <section className="bg-panel border border-border rounded-xl p-5 flex flex-col gap-3">
          <h2 className="font-display text-lg uppercase tracking-widest text-cream">Vista Cámara</h2>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-bg border border-border rounded px-3 py-2 font-mono text-cream text-sm uppercase outline-none focus:border-muted placeholder:text-muted"
              placeholder="Código del show"
              maxLength={6}
              value={camCode}
              onChange={(e) => setCamCode(e.target.value.toUpperCase())}
            />
            <select
              className="bg-bg border border-border rounded px-2 py-2 font-mono text-cream text-sm outline-none"
              value={camNum}
              onChange={(e) => setCamNum(e.target.value)}
            >
              {[1,2,3,4,5,6].map((n) => (
                <option key={n} value={n}>CAM {n}</option>
              ))}
            </select>
            <button
              className="bg-tally hover:opacity-90 text-cream font-display uppercase tracking-wider px-4 rounded transition-opacity disabled:opacity-50"
              onClick={() => camCode && navigate(`/camera/${camCode}/${camNum}`)}
              disabled={!camCode}
            >
              Ir
            </button>
          </div>
        </section>
      </div>

      <p className="font-mono text-muted text-center" style={{ fontSize: 10 }}>
        Centro Vida Nueva · Live Production Control
      </p>
    </div>
  )
}
