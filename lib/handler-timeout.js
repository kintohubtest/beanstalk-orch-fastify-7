'use strict'

const { kTimeoutTimer, kOnAbort, kAbortController } = require('./symbols')
const { FST_ERR_HANDLER_TIMEOUT } = require('./errors')

function createController (request, target, isDisconnect) {
  const controller = new AbortController()
  request[kAbortController] = controller
  const onClose = () => {
    if (isDisconnect(target) && controller.signal.aborted === false) {
      controller.abort()
    }
    cleanupHandlerTimeout(request)
  }
  onClose.target = target
  request[kOnAbort] = onClose
  target.once('close', onClose)
  return controller
}

// response closed before it was completely written: the client went away
function responseNotFinished (res) {
  return res.writableFinished === false
}

// request-side check, used when no response object is at hand
function requestAborted (req) {
  return req.aborted === true || (req.socket != null && req.socket.destroyed === true)
}

// Lazily creates the AbortSignal when no handlerTimeout is configured
function getSignal (request) {
  const controller = request[kAbortController] || createController(request, request.raw, requestAborted)
  return controller.signal
}

function onTimeout (request, reply, ms) {
  request[kTimeoutTimer] = null
  if (reply.sent === true) return
  const error = new FST_ERR_HANDLER_TIMEOUT(ms)
  request[kAbortController].abort(error)
  reply.send(error)
}

function setupHandlerTimeout (request, reply, ms) {
  createController(request, reply.raw, responseNotFinished)
  request[kTimeoutTimer] = setTimeout(onTimeout, ms, request, reply, ms)
}

function cleanupHandlerTimeout (request) {
  if (request[kTimeoutTimer] != null) {
    clearTimeout(request[kTimeoutTimer])
    request[kTimeoutTimer] = null
  }
  const onAbort = request[kOnAbort]
  if (onAbort != null) {
    onAbort.target.removeListener('close', onAbort)
    request[kOnAbort] = null
  }
}

module.exports = { getSignal, setupHandlerTimeout, cleanupHandlerTimeout }
