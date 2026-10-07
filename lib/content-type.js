'use strict'

// RFC 9110 "token" characters
const tokenRE = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/
const mediaTypeRE = /^([!#$%&'*+.^_`|~0-9A-Za-z-]+)\/([!#$%&'*+.^_`|~0-9A-Za-z-]+)$/

const kType = Symbol('type')
const kSubtype = Symbol('subtype')
const kParameters = Symbol('parameters')
const kValid = Symbol('valid')

const invalidQuotedString = 'invalid quoted string'

/**
 * Parses a `content-type` header value into its media type
 * and parameters.
 */
class ContentType {
  constructor (headerValue) {
    this[kType] = ''
    this[kSubtype] = ''
    this[kParameters] = new Map()
    this[kValid] = false

    if (typeof headerValue !== 'string') return
    if (headerValue === '' || headerValue === 'undefined') return

    let sepIdx = headerValue.indexOf(';')
    if (sepIdx === -1) sepIdx = headerValue.length

    // Only space and tab are valid optional whitespace.
    const mediaType = headerValue.slice(0, sepIdx).replace(/^[ \t]+|[ \t]+$/g, '')
    const match = mediaTypeRE.exec(mediaType)
    if (match === null) return

    this[kType] = match[1].toLowerCase()
    this[kSubtype] = match[2].toLowerCase()
    this[kValid] = true

    if (sepIdx < headerValue.length) {
      parseParameters(headerValue, sepIdx + 1, this[kParameters])
    }
  }

  get isEmpty () {
    return this[kType] === ''
  }

  get isValid () {
    return this[kValid]
  }

  get mediaType () {
    return this.isEmpty ? '' : `${this[kType]}/${this[kSubtype]}`
  }

  get type () {
    return this[kType]
  }

  get subtype () {
    return this[kSubtype]
  }

  get parameters () {
    return this[kParameters]
  }

  toString () {
    if (this.isEmpty) return ''
    let result = this.mediaType
    for (const [name, value] of this[kParameters]) {
      result += `; ${name}="${value.replace(/["\\]/g, '\\$&')}"`
    }
    return result
  }
}

function parseParameters (input, start, parameters) {
  const length = input.length
  let i = start

  while (i < length) {
    // skip whitespace and empty parameters
    while (i < length && (input[i] === ' ' || input[i] === '\t' || input[i] === ';')) i++
    if (i >= length) return

    const nameStart = i
    while (i < length && input[i] !== '=' && input[i] !== ';') i++
    const name = input.slice(nameStart, i).replace(/[ \t]+$/, '').toLowerCase()

    if (i >= length || input[i] === ';') {
      // parameter without a value, ignore it
      continue
    }

    i++ // skip '='
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
      if (!closed) {
        if (tokenRE.test(name)) parameters.set(name, invalidQuotedString)
        return
      }
      // ignore anything up to the next separator
      while (i < length && input[i] !== ';') i++
    } else {
      const valueStart = i
      while (i < length && input[i] !== ';') i++
      value = input.slice(valueStart, i).replace(/[ \t]+$/, '')
    }

    if (tokenRE.test(name) && !parameters.has(name)) {
      parameters.set(name, value)
    }
  }
}

module.exports = ContentType
