'use strict'

// RFC 9110 `token` characters
const tokenChars = "!#$%&'*+.^_`|~0-9A-Za-z-"
const mediaTypeReg = new RegExp(`^[ \\t]*([${tokenChars}]+)/([${tokenChars}]+)[ \\t]*(?:;(.*))?$`, 's')
const tokenReg = new RegExp(`^[${tokenChars}]+$`)

const invalidQuotedString = 'invalid quoted string'

/**
 * Parses the parameters section of a `Content-Type` header value, i.e. the
 * part that follows the first `;`.
 *
 * @param {string} input
 * @returns {Map<string, string>}
 */
function parseParameters (input) {
  const parameters = new Map()
  let i = 0
  const length = input.length

  while (i < length) {
    // skip separators and whitespace
    while (i < length && (input[i] === ';' || input[i] === ' ' || input[i] === '\t')) i++
    if (i >= length) break

    const eq = input.indexOf('=', i)
    const semi = input.indexOf(';', i)
    if (eq === -1 || (semi !== -1 && semi < eq)) {
      // parameter without a value, skip it
      if (semi === -1) break
      i = semi + 1
      continue
    }

    const name = input.slice(i, eq).trim().toLowerCase()
    i = eq + 1

    let value
    if (input[i] === '"') {
      i++
      value = ''
      let closed = false
      while (i < length) {
        const char = input[i]
        if (char === '\\' && i + 1 < length) {
          value += input[i + 1]
          i += 2
          continue
        }
        if (char === '"') {
          closed = true
          i++
          break
        }
        value += char
        i++
      }
      if (closed === false) {
        value = invalidQuotedString
        i = length
      } else {
        // discard anything between the closing quote and the next separator
        const next = input.indexOf(';', i)
        i = next === -1 ? length : next
      }
    } else {
      const next = input.indexOf(';', i)
      const end = next === -1 ? length : next
      value = input.slice(i, end).trim()
      i = end
    }

    if (tokenReg.test(name) && !parameters.has(name)) {
      parameters.set(name, value)
    }
  }

  return parameters
}

/**
 * Parsed representation of a `Content-Type` header value.
 */
class ContentType {
  #valid = false
  #empty = true
  #type = ''
  #subtype = ''
  #parameters = new Map()

  constructor (headerValue) {
    if (headerValue == null || headerValue === '' || headerValue === 'undefined') {
      return
    }
    if (typeof headerValue !== 'string') return

    const match = mediaTypeReg.exec(headerValue)
    if (match === null) return

    this.#type = match[1].toLowerCase()
    this.#subtype = match[2].toLowerCase()
    this.#valid = true
    this.#empty = false
    if (match[3] !== undefined) {
      this.#parameters = parseParameters(match[3])
    }
  }

  get isEmpty () {
    return this.#empty
  }

  get isValid () {
    return this.#valid
  }

  get mediaType () {
    return this.#valid ? `${this.#type}/${this.#subtype}` : ''
  }

  get type () {
    return this.#type
  }

  get subtype () {
    return this.#subtype
  }

  get parameters () {
    return this.#parameters
  }

  toString () {
    if (this.#valid === false) return ''
    const parts = [this.mediaType]
    for (const [name, value] of this.#parameters) {
      parts.push(`${name}="${value.replace(/(["\\])/g, '\\$1')}"`)
    }
    return parts.join('; ')
  }
}

module.exports = ContentType
