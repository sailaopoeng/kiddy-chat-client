const EMOJI =
  /\p{Extended_Pictographic}[\p{Emoji_Modifier}\u{FE0F}\u{20E3}]*(?:\u{200D}\p{Extended_Pictographic}[\p{Emoji_Modifier}\u{FE0F}]*)*/gu

// Leftover variation selectors and keycap marks (from emoji such as the keycap digits).
const EMOJI_LEFTOVERS = /[\u{FE0F}\u{20E3}]/gu

/** Removes emoji (including combined ones) and tidies up the spaces left behind. */
export function stripEmoji(text) {
  return text
    .replace(EMOJI, '')
    .replace(EMOJI_LEFTOVERS, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+$/gm, '')
    .trim()
}

/** Turns a markdown reply into plain text that sounds right when read aloud. */
export function toSpeechText(markdown) {
  const plain = markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`+/g, '')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/(\*\*|__|~~|\*|_)/g, '')
  return stripEmoji(plain).replace(/\s+/g, ' ')
}

/** Shortens text to at most max characters (as the input's maxLength counts them) without cutting an emoji in half. */
export function truncate(text, max) {
  if (text.length <= max) return text
  let result = ''
  for (const char of text) {
    if (result.length + char.length > max) break
    result += char
  }
  return result
}
