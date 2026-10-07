'use strict'

const mediaTypeReg = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+\/[!#$%&'*+.^_`|~0-9A-Za-z-]+$/
const INVALID_QUOTED = 'invalid quoted string'

/**
 * Parses a `Content-Type` header value into its media type and parameters.
 * An empty or invalid value results in an instance where `isEmpty` is `true`.
 */
class ContentType {
  #type = ''
  #subtype = ''
  #parameters = new Map()
  #isEmpty = true
  #isValid = true

  constructor (headerValue) {
    if (typeof headerValue !== 'string' || headerValue.trim().length === 0) return

    const semicolon = headerValue.indexOf(';')
    const mediaType = (semicolon === -1 ? headerValue : headerValue.slice(0, semicolon)).trim().toLowerCase()

    if (mediaTypeReg.test(mediaType) === false) {
      this.#isValid = false
      return
    }

    const slash = mediaType.indexOf('/')
    this.#type = mediaType.slice(0, slash)
    this.#subtype = mediaType.slice(slash + 1)
    this.#isEmpty = false

    if (semicolon !== -1) this.#parseParameters(headerValue, semicolon + 1)
  }

  #parseParameters (str, pos) {
    const length = str.length
    while (pos < length) {
      // skip whitespace and empty parameters
      while (pos < length && (str[pos] === ' ' || str[pos] === '\t' || str[pos] === ';')) pos++
      if (pos >= length) return

      let end = pos
      while (end < length && str[end] !== '=' && str[end] !== ';') end++
      const name = str.slice(pos, end).trim().toLowerCase()
      if (end >= length || str[end] === ';') {
        // parameter without a value
        pos = end
        continue
      }

      pos = end + 1
      while (pos < length && (str[pos] === ' ' || str[pos] === '\t')) pos++

      let value
      if (str[pos] === '"') {
        pos++
        let result = ''
        let closed = false
        while (pos < length) {
          const ch = str[pos]
          if (ch === '\\' && pos + 1 < length) {
            result += str[pos + 1]
            pos += 2
            continue
          }
          if (ch === '"') {
            closed = true
            pos++
            break
          }
          result += ch
          pos++
        }
        if (closed) {
          value = result
          while (pos < length && str[pos] !== ';') pos++
        } else {
          value = INVALID_QUOTED
        }
      } else {
        end = pos
        while (end < length && str[end] !== ';') end++
        value = str.slice(pos, end).trim()
        pos = end
      }

      if (name.length > 0 && this.#parameters.has(name) === false) {
        this.#parameters.set(name, value)
      }
    }
  }

  get isEmpty () { return this.#isEmpty }
  get isValid () { return this.#isValid }
  get mediaType () { return this.#isEmpty ? '' : `${this.#type}/${this.#subtype}` }
  get type () { return this.#type }
  get subtype () { return this.#subtype }
  get parameters () { return this.#parameters }

  toString () {
    if (this.#isEmpty) return ''
    let result = this.mediaType
    for (const [name, value] of this.#parameters) {
      result += `; ${name}="${value.replace(/["\\]/g, '\\$&')}"`
    }
    return result
  }
}

module.exports = ContentType
