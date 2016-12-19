const typeforce = require('typeforce')
const deepExtend = require('deep-extend')
const collect = Promise.promisify(require('stream-collector'))
const secondary = require('level-secondary')
const { Promise, co, sub, omit, baseRequest } = require('./utils')
const types = require('./types')

module.exports = function createReportsAPI ({ db, token }) {
  const request = baseRequest(token)
  const get = co(function* get ({ checkId, reportId }) {
    return yield request
      .get(`https://api.onfido.com/v2/checks/${checkId}/reports/${reportId}`)
  })

  const list = co(function* list ({ checkId ) {
    return yield request
      .get(`https://api.onfido.com/v2/checks/${checkId}/reports`)
  })

  const resume = co(function* resume ({ checkId, reportId ) {
    return yield request
      .get(`https://api.onfido.com/v2/checks/${checkId}/reports/${reportId}/resume`)
  })

  const cancel = co(function* cancel ({ checkId, reportId ) {
    return yield request
      .get(`https://api.onfido.com/v2/checks/${checkId}/reports/${reportId}/cancel`)
  })

  return {
    list,
    get,
    resume,
    cancel
  }
}
