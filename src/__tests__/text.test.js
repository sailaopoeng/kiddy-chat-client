import { describe, expect, it } from 'vitest'
import { stripEmoji, toSpeechText } from '../utils/text'

describe('stripEmoji', () => {
  it('removes emoji and tidies spaces', () => {
    expect(stripEmoji('Tell me a fun fact! 🌟')).toBe('Tell me a fun fact!')
    expect(stripEmoji("Let's play 🎮 a game")).toBe("Let's play a game")
  })

  it('removes combined emoji such as families and skin tones', () => {
    expect(stripEmoji('Hi 👋🏽 family 👨‍👩‍👧 time')).toBe('Hi family time')
  })

  it('leaves normal text alone', () => {
    expect(stripEmoji('Pi is about 3.14')).toBe('Pi is about 3.14')
  })
})

describe('toSpeechText', () => {
  it('drops markdown symbols and emoji', () => {
    const markdown = '## Fun facts 🌟\n\n- **Octopuses** have *three* hearts\n- Use `code`'
    expect(toSpeechText(markdown)).toBe('Fun facts Octopuses have three hearts Use code')
  })

  it('keeps link text but not the address', () => {
    expect(toSpeechText('See [this page](https://example.com) now')).toBe('See this page now')
  })
})
