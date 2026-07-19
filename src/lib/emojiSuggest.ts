const DICTIONARY: [RegExp, string][] = [
  [/bater[ií]a|tambor|percusi[oó]n|caj[oó]n/, '🥁'],
  [/guitarra|bajo/, '🎸'],
  [/piano|teclado|[oó]rgano/, '🎹'],
  [/viol[ií]n|viola|cello|violonchelo/, '🎻'],
  [/saxo/, '🎷'],
  [/trompeta|trombón|metales/, '🎺'],
  [/flauta/, '🪈'],
  [/voz|voces|cantante|solista|coro/, '🎤'],
  [/violín|cuerdas/, '🎻'],
]

export function suggestEmoji(name: string): string | null {
  const lower = name.toLowerCase()
  for (const [pattern, emoji] of DICTIONARY) {
    if (pattern.test(lower)) return emoji
  }
  return null
}
