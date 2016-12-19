
const { Promise, co, sub, omit, setPromiseInterface } = require('./utils')

module.exports = function ({ db, api, store, applicants }) {

  const create = co(function* create (externalApplicantId, opts) {
    const applicant = yield applicants.store.byExternalId(externalApplicantId)
    const check = yield api.create(applicant.id, opts)
    check._applicantId = applicant.id
    check._externalApplicantId = externalApplicantId
    return yield store.create(check)
  })

  const list = co(function* list (externalApplicantId, opts={}) {
    if (!opts.fetch) {
      return yield store.list(externalApplicantId)
    }

    const applicant = yield applicants.store.byExternalId(externalApplicantId)
    const fetched = yield api.list({ applicantId: applicant.id, expandReports: true })
    fetched.forEach(check => {
      check._applicantId = applicant.id
      check._externalApplicantId = externalApplicantId
    })

    return yield store.update(fetched)
  })

  const get = co(function* get (checkId, opts={}) {
    if (!opts.fetch) {
      return yield store.get(checkId)
    }

    const check = yield api.get(checkId)
    return yield store.update(check)
  })

  return {
    create,
    list,
    get
  }
}
