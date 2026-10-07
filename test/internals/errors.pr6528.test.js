'use strict'

const { test } = require('node:test')
const errors = require('../../lib/errors')

test('FST_ERR_CTP_INVALID_MEDIA_TYPE', t => {
  t.plan(5)
  const error = new errors.FST_ERR_CTP_INVALID_MEDIA_TYPE()
  t.assert.strictEqual(error.name, 'FastifyError')
  t.assert.strictEqual(error.code, 'FST_ERR_CTP_INVALID_MEDIA_TYPE')
  t.assert.strictEqual(error.message, 'Unsupported Media Type')
  t.assert.strictEqual(error.statusCode, 415)
  t.assert.ok(error instanceof Error)
})
