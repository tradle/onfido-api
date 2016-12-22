const typeforce = require('typeforce')
const types = require('./types')
const {
  Promise,
  co,
  getter
} = require('./utils')

module.exports = function createReportsAPI ({ token }) {
  typeforce(typeforce.String, token)

  const getUrl = getter(token)
  const get = co(function* get (opts) {
    typeforce({
      checkId: typeforce.String,
      reportId: typeforce.String
    }, opts)

    const { checkId, reportId } = opts
    return yield getUrl(`https://api.onfido.com/v2/checks/${checkId}/reports/${reportId}`)
  })

  const list = co(function* list (opts) {
    typeforce({
      checkId: typeforce.String
    }, opts)

    const { checkId } = opts
    return yield getUrl(`https://api.onfido.com/v2/checks/${checkId}/reports`)
  })

  const resume = co(function* resume (opts) {
    typeforce({
      checkId: typeforce.String,
      reportId: typeforce.String
    }, opts)

    const { checkId, reportId } = opts
    return yield getUrl(`https://api.onfido.com/v2/checks/${checkId}/reports/${reportId}/resume`)
  })

  const cancel = co(function* cancel (opts) {
    typeforce({
      checkId: typeforce.String,
      reportId: typeforce.String
    }, opts)

    const { checkId, reportId } = opts
    return yield getUrl(`https://api.onfido.com/v2/checks/${checkId}/reports/${reportId}/cancel`)
  })

  return {
    list,
    get,
    resume,
    cancel
  }
}
