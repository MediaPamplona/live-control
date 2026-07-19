const DICTIONARY: [RegExp, string][] = [
  // Secciones con varios instrumentos combinados (no hay un único emoji Unicode)
  [/vientos?\b/, '🎷🎺'],
  [/cuerdas?\b/, '🎻🎸'],
  [/metales/, '🎺🎷'],

  // Instrumentos individuales
  [/bater[ií]a|tambor|percusi[oó]n|caj[oó]n/, '🥁'],
  [/guitarra|bajo/, '🎸'],
  [/sintetizador|synth/, '🎹'],
  [/piano|teclado|[oó]rgano/, '🎹'],
  [/viol[ií]n|viola|cello|violonchelo/, '🎻'],
  [/saxo(f[oó]n)?/, '🎷'],
  [/trompeta/, '🎺'],
  [/trombón/, '🎺'],
  [/flauta/, '🪈'],
  [/voz|voces|cantante|solista|coro/, '🎤'],
]

export function suggestEmoji(name: string): string | null {
  const lower = name.toLowerCase()
  for (const [pattern, emoji] of DICTIONARY) {
    if (pattern.test(lower)) return emoji
  }
  return null
}
