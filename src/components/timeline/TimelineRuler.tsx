interface Props {
  durationSecs: number
  pxPerSec: number
}

export default function TimelineRuler({ durationSecs, pxPerSec }: Props) {
  const width = durationSecs * pxPerSec
  const step = pxPerSec >= 30 ? 5 : pxPerSec >= 10 ? 10 : 30
  const marks: number[] = []
  for (let s = 0; s <= durationSecs; s += step) marks.push(s)

  return (
    <div
      className="relative flex-shrink-0 border-b border-border select-none"
      style={{ width, height: 28, background: '#0F1114' }}
    >
      {marks.map((s) => {
        const left = s * pxPerSec
        const isMinute = s % 60 === 0
        return (
          <div
            key={s}
            className="absolute top-0 flex flex-col items-center"
            style={{ left, transform: 'translateX(-50%)' }}
          >
            <div
              className="bg-muted"
              style={{ width: 1, height: isMinute ? 12 : 6, marginTop: 4 }}
            />
            {(isMinute || pxPerSec >= 15) && (
              <span
                className="font-mono text-muted"
                style={{ fontSize: 9, marginTop: 1, whiteSpace: 'nowrap' }}
              >
                {isMinute
                  ? `${Math.floor(s / 60)}:00`
                  : `${s}s`}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
