interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-panel border-[3px] border-cream rounded-2xl p-6 flex flex-col gap-4 animate-pop"
        style={{ boxShadow: '8px 8px 0 #E1262C' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-tally flex-shrink-0" />
          <h2 className="font-display text-2xl uppercase tracking-wide text-cream leading-none">
            {title}
          </h2>
        </div>

        <p className="font-mono text-sm text-muted leading-relaxed">
          {message}
        </p>

        <div className="flex gap-3 mt-2">
          <button
            className="flex-1 border-2 border-border hover:border-muted text-cream font-display uppercase tracking-widest py-2.5 rounded-xl transition-colors"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className="flex-1 bg-tally text-cream font-display uppercase tracking-widest py-2.5 rounded-xl border-2 border-cream transition-transform hover:-translate-y-0.5 active:translate-y-0"
            style={{ boxShadow: '4px 4px 0 #000' }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
