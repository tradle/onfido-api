
const typeforce = require('typeforce')
const { Promise, co } = require('./utils')

module.exports = function ({ db, api, store, applicants }) {

  const list = co(function* list (opts) {
    if (!opts.fetch) {
      return yield store.list(opts)
    }

    typeforce({
      checkId: typeforce.String,
      applicant: typeforce.String
    }, opts)

    const applicant = yield applicants.store.byExternalId(externalApplicantId)
    const fetched = yield api.list({ checkId: opts.checkId, applicantId: applicant.id })
    fetched.forEach(report => {
      report[applicantIdProp] = applicant.id
      report[externalApplicantIdProp] = externalApplicantId
    })

    return yield store.update(fetched)
  })

  const get = co(function* get (opts) {
    let { checkId, reportId } = opts
    if (!opts.fetch) {
      return yield store.get(reportId)
    }

    if (!checkId) {
      const saved = yield store.get(reportId)
      reportId = saved.id
    }

    const report = yield api.get({ checkId, reportId })
    return yield store.update(report)
  })

  return {
    list,
    get
  }
}
