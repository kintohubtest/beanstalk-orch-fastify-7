'use strict'

const TOKEN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/
const MEDIA_TYPE = /^([!#$%&'*+.^_`|~0-9A-Za-z-]+)\/([!#$%&'*+.^_`|~0-9A-Za-z-]+)$/
const QUOTED_STRING_CHARS = /^[\t\u0020-\u007e\u0080-\u00ff]*$/

/**
 * Parses a content-type header value into its media type and parameters.
 * An instance is "empty" when the header is missing or is not a valid
 * `type/subtype` media type (in the latter case `isValid` is `false`).
 */
class ContentType {
  #mediaType = ''
  #type = ''
  #subtype = ''
  #parameters = new Map()
  #valid = true

  constructor (headerValue) {
    if (headerValue == null || headerValue === '' || headerValue === 'undefined') {
      return
    }
    if (typeof headerValue !== 'string') {
      this.#valid = false
      return
    }

    const header = headerValue.trim()
    let idx = header.indexOf(';')
    if (idx === -1) idx = header.length

    const match = MEDIA_TYPE.exec(header.slice(0, idx).trim())
    if (match === null) {
      this.#valid = false
      return
    }
    this.#type = match[1].toLowerCase()
    this.#subtype = match[2].toLowerCase()
    this.#mediaType = `${this.#type}/${this.#subtype}`
    this.#parseParameters(header, idx)
  }

  #parseParameters (header, pos) {
    const length = header.length
    while (pos < length) {
      // header[pos] === ';'
      pos++
      while (pos < length && (header[pos] === ' ' || header[pos] === '\t')) pos++

      let eq = pos
      while (eq < length && header[eq] !== '=' && header[eq] !== ';') eq++
      if (eq >= length || header[eq] === ';') {
        // parameter without a value, skip it
        pos = eq
        continue
      }

      const name = header.slice(pos, eq).toLowerCase()
      pos = eq + 1
      let value
      if (header[pos] === '"') {
        pos++
        let result = ''
        let closed = false
        while (pos < length) {
          const ch = header[pos]
          if (ch === '\\' && pos + 1 < length) {
            result += header[pos + 1]
            pos += 2
          } else if (ch === '"') {
            closed = true
            pos++
            break
          } else {
            result += ch
            pos++
          }
        }
        if (closed && QUOTED_STRING_CHARS.test(result)) {
          value = result
        } else {
          value = 'invalid quoted string'
        }
        while (pos < length && header[pos] !== ';') pos++
      } else {
        let end = pos
        while (end < length && header[end] !== ';') end++
        value = header.slice(pos, end).trim()
        pos = end
      }

      if (TOKEN.test(name) && !this.#parameters.has(name)) {
        this.#parameters.set(name, value)
      }
    }
  }

  get isEmpty () {
    return this.#mediaType === ''
  }

  get isValid () {
    return this.#valid
  }

  get mediaType () {
    return this.#mediaType
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
    if (this.isEmpty) return ''
    let result = this.#mediaType
    for (const [name, value] of this.#parameters) {
      result += `; ${name}="${value.replace(/["\\]/g, '\\$&')}"`
    }
    return result
  }
}

module.exports = ContentType
