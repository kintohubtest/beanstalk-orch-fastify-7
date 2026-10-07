'use strict'

const TOKEN = "[!#$%&'*+\\-.^_`|~0-9A-Za-z]"
const mediaTypeRegExp = new RegExp(`^[ \\t]*(${TOKEN}+)/(${TOKEN}+)[ \\t]*(?:;|$)`)
const tokenRegExp = new RegExp(`^${TOKEN}+$`)

/**
 * Parses a `content-type` header value (RFC 9110 section 8.3.1).
 * A value is only usable when it has both a type and a subtype.
 */
class ContentType {
  #parameters = new Map()
  #mediaType = ''
  #type = ''
  #subtype = ''
  #isEmpty = true
  #isValid = true

  constructor (headerValue) {
    if (typeof headerValue !== 'string') return
    const trimmed = headerValue.trim()
    if (trimmed === '' || trimmed === 'undefined') return

    const match = mediaTypeRegExp.exec(headerValue)
    if (match === null) {
      this.#isValid = false
      return
    }

    this.#isEmpty = false
    this.#type = match[1].toLowerCase()
    this.#subtype = match[2].toLowerCase()
    this.#mediaType = `${this.#type}/${this.#subtype}`
    this.#parseParameters(headerValue.slice(match[0].length))
  }

  #parseParameters (s) {
    const len = s.length
    let i = 0
    while (i < len) {
      const ch = s[i]
      if (ch === ';' || ch === ' ' || ch === '\t') {
        i++
        continue
      }

      let end = i
      while (end < len && s[end] !== '=' && s[end] !== ';') end++
      if (end >= len || s[end] === ';') {
        // parameter without a value
        i = end
        continue
      }
      const name = s.slice(i, end).trim().toLowerCase()
      i = end + 1

      let value
      if (s[i] === '"') {
        let j = i + 1
        let closed = false
        value = ''
        while (j < len) {
          const c = s[j]
          if (c === '\\' && j + 1 < len) {
            value += s[j + 1]
            j += 2
          } else if (c === '"') {
            closed = true
            j++
            break
          } else {
            value += c
            j++
          }
        }
        if (!closed) {
          value = 'invalid quoted string'
          j = len
        }
        i = j
        while (i < len && s[i] !== ';') i++
      } else {
        end = i
        while (end < len && s[end] !== ';') end++
        value = s.slice(i, end).trim()
        i = end
        if (value === '') continue
      }

      if (tokenRegExp.test(name) && !this.#parameters.has(name)) {
        this.#parameters.set(name, value)
      }
    }
  }

  get isEmpty () { return this.#isEmpty }
  get isValid () { return this.#isValid }
  get mediaType () { return this.#mediaType }
  get type () { return this.#type }
  get subtype () { return this.#subtype }
  get parameters () { return this.#parameters }

  toString () {
    let result = this.#mediaType
    for (const [name, value] of this.#parameters) {
      result += `; ${name}="${value.replace(/(["\\])/g, '\\$1')}"`
    }
    return result
  }
}

module.exports = ContentType
