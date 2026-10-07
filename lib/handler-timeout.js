'use strict'

const {
  kTimeoutTimer,
  kOnAbort,
  kAbortController,
  kRequestResponse
} = require('./symbols')
const { FST_ERR_HANDLER_TIMEOUT } = require('./errors')

// Returns the AbortController of the request, creating it (and the close
// listener that aborts it on client disconnect) the first time it is needed.
function getAbortController (request) {
  let controller = request[kAbortController]
  if (controller !== null) return controller

  controller = request[kAbortController] = new AbortController()

  const res = request[kRequestResponse]
  if (res && res.writableEnded !== true && res.destroyed !== true) {
    const onAbort = () => {
      request[kOnAbort] = null
      clearHandlerTimeout(request)
      if (res.writableFinished !== true && !controller.signal.aborted) {
        controller.abort()
      }
    }
    request[kOnAbort] = onAbort
    res.once('close', onAbort)
  }

  return controller
}

function setupHandlerTimeout (request, reply, timeout) {
  const controller = getAbortController(request)
  request[kTimeoutTimer] = setTimeout(() => {
    request[kTimeoutTimer] = null
    if (reply.sent === true || controller.signal.aborted) return
    const err = new FST_ERR_HANDLER_TIMEOUT(timeout)
    controller.abort(err)
    reply.send(err)
  }, timeout)
}

// Clears the timer and the close listener, if any. Safe to call many times.
function clearHandlerTimeout (request) {
  if (request == null) return
  const timer = request[kTimeoutTimer]
  if (timer != null) {
    clearTimeout(timer)
    request[kTimeoutTimer] = null
  }
  const onAbort = request[kOnAbort]
  if (onAbort != null) {
    request[kRequestResponse]?.removeListener('close', onAbort)
    request[kOnAbort] = null
  }
}

module.exports = { getAbortController, setupHandlerTimeout, clearHandlerTimeout }
