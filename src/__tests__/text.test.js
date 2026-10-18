import { describe, expect, it } from 'vitest'
import { stripEmoji, toSpeechText, truncate } from '../utils/text'

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

describe('truncate', () => {
  it('leaves short text alone', () => {
    expect(truncate('Hi 🐾', 10)).toBe('Hi 🐾')
  })

  it('never cuts an emoji in half', () => {
    // "🐾" is 2 characters long in JavaScript; a plain slice(0, 4) would leave half of it.
    const result = truncate('Hi 🐾 there', 4)
    expect(result).toBe('Hi ')
    expect(JSON.stringify(result)).not.toMatch(/\\ud[89a-f]/i)
  })
})

describe('stripEmoji on server starters', () => {
  it('removes emoji the old regex used to break in half', () => {
    const cleaned = stripEmoji("What's your favorite animal and why? 🐾")
    expect(cleaned).toBe("What's your favorite animal and why?")
    expect(stripEmoji('If you could have any superpower, what would it be? 🦸‍♂️')).toBe(
      'If you could have any superpower, what would it be?'
    )
  })
})
