'use strict'

function resolveDisableRequestLogging (disableRequestLogging, request) {
  return typeof disableRequestLogging === 'function'
    ? Boolean(disableRequestLogging(request))
    : disableRequestLogging
}

module.exports = resolveDisableRequestLogging
