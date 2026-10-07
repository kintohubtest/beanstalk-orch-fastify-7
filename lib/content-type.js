'use strict'

const tokenRE = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/
const mediaTypeRE = /^([!#$%&'*+\-.^_`|~0-9A-Za-z]+)\/([!#$%&'*+\-.^_`|~0-9A-Za-z]+)$/
const invalidQuotedString = 'invalid quoted string'

function isOWS (code) {
  return code === 32 || code === 9
}

/**
 * Parses a `content-type` header value into its media type and parameters.
 *
 * An instance is "empty" when the value is missing or is not a valid media
 * type (`type/subtype`). `isValid` is `false` only when a non-empty value was
 * provided that could not be parsed.
 */
class ContentType {
  #mediaType = ''
  #type = ''
  #subtype = ''
  #parameters = new Map()
  #isValid = true

  constructor (header) {
    if (header === undefined || header === null || header === '' || header === 'undefined') {
      return
    }
    if (typeof header !== 'string') header = String(header)

    const semi = header.indexOf(';')
    const mediaPart = (semi === -1 ? header : header.slice(0, semi)).replace(/^[ \t]+|[ \t]+$/g, '')
    const match = mediaTypeRE.exec(mediaPart)
    if (match === null) {
      this.#isValid = false
      return
    }

    this.#type = match[1].toLowerCase()
    this.#subtype = match[2].toLowerCase()
    this.#mediaType = `${this.#type}/${this.#subtype}`

    if (semi !== -1) this.#parseParameters(header, semi + 1)
  }

  #parseParameters (header, pos) {
    const len = header.length
    while (pos < len) {
      while (pos < len && isOWS(header.charCodeAt(pos))) pos++
      if (pos >= len) return
      if (header[pos] === ';') {
        pos++
        continue
      }

      let end = pos
      while (end < len && header[end] !== '=' && header[end] !== ';') end++
      const name = header.slice(pos, end).replace(/[ \t]+$/, '').toLowerCase()
      if (end >= len || header[end] === ';') {
        // parameter without a value, ignore it
        pos = end + 1
        continue
      }

      pos = end + 1 // skip `=`
      let value
      if (header[pos] === '"') {
        pos++
        value = ''
        let closed = false
        while (pos < len) {
          const ch = header[pos]
          if (ch === '\\' && pos + 1 < len) {
            value += header[pos + 1]
            pos += 2
          } else if (ch === '"') {
            closed = true
            pos++
            break
          } else {
            value += ch
            pos++
          }
        }
        if (closed === false) {
          value = invalidQuotedString
        }
        while (pos < len && header[pos] !== ';') pos++
        pos++
      } else {
        end = pos
        while (end < len && header[end] !== ';') end++
        value = header.slice(pos, end).replace(/[ \t]+$/, '')
        pos = end + 1
      }

      if (tokenRE.test(name) && !this.#parameters.has(name)) {
        this.#parameters.set(name, value)
      }
    }
  }

  get isEmpty () {
    return this.#mediaType === ''
  }

  get isValid () {
    return this.#isValid
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
