'use strict'

const { test } = require('node:test')
const Fastify = require('..')

test('invalid route logLevel throws at registration', t => {
  const fastify = Fastify({ logger: { level: 'info' } })
  t.after(() => fastify.close())
  t.assert.throws(
    () => fastify.get('/', { logLevel: 'nope' }, () => {}),
    { code: 'FST_ERR_ROUTE_LOG_LEVEL_INVALID' }
  )
  t.assert.doesNotThrow(() => fastify.get('/ok', { logLevel: 'warn' }, () => {}))
})

test('custom route logLevel is accepted', t => {
  const fastify = Fastify({ logger: { level: 'info', customLevels: { foo: 35 } } })
  t.after(() => fastify.close())
  t.assert.doesNotThrow(() => fastify.get('/', { logLevel: 'foo' }, () => {}))
})
