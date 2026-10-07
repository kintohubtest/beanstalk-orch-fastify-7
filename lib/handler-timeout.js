'use strict'

const { kTimeoutTimer, kOnAbort, kRequestSignal, kRequestResponse, kReplyIsError } = require('./symbols')
const { FST_ERR_HANDLER_TIMEOUT } = require('./errors')

/**
 * Makes sure the controller is aborted when the underlying connection is
 * closed before the response has been fully written.
 */
function attachCloseListener (request, controller) {
  const res = request[kRequestResponse]
  const onAbort = function () {
    clearHandlerTimeoutTimer(request)
    request[kOnAbort] = null
    if (res.writableFinished === false && controller.signal.aborted === false) {
      controller.abort()
    }
  }
  request[kOnAbort] = onAbort
  res.once('close', onAbort)
}

function getRequestSignal (request) {
  const existing = request[kRequestSignal]
  if (existing !== null) return existing.signal

  const controller = new AbortController()
  request[kRequestSignal] = controller
  if (request[kRequestResponse] !== null) attachCloseListener(request, controller)
  return controller.signal
}

function startHandlerTimeout (request, reply, ms) {
  const controller = new AbortController()
  request[kRequestSignal] = controller
  attachCloseListener(request, controller)
  request[kTimeoutTimer] = setTimeout(onHandlerTimeout, ms, request, reply, ms, controller)
}

function onHandlerTimeout (request, reply, ms, controller) {
  request[kTimeoutTimer] = null
  if (reply.sent === true) return

  const error = new FST_ERR_HANDLER_TIMEOUT(ms)
  controller.abort(error)

  // if the headers are already out there is no way to send an error response
  if (reply.raw.headersSent === true) return

  reply[kReplyIsError] = true
  reply.send(error)
}

function clearHandlerTimeoutTimer (request) {
  if (request == null) return
  const timer = request[kTimeoutTimer]
  if (timer != null) {
    clearTimeout(timer)
    request[kTimeoutTimer] = null
  }
}

function cleanupHandlerTimeout (request) {
  if (request == null || (request[kTimeoutTimer] == null && request[kOnAbort] == null)) return
  clearHandlerTimeoutTimer(request)
  const onAbort = request[kOnAbort]
  if (onAbort != null) {
    request[kRequestResponse].removeListener('close', onAbort)
    request[kOnAbort] = null
  }
}

module.exports = {
  getRequestSignal,
  startHandlerTimeout,
  clearHandlerTimeoutTimer,
  cleanupHandlerTimeout
}
