
const { Promise, co, sub, omit, setPromiseInterface } = require('./utils')
const {
  applicantIdProp,
  externalApplicantIdProp,
  externalDocIdProp
} = require('./constants')

module.exports = function ({ db, api, store }) {

  const create = co(function* create (externalApplicantId, opts) {
    const applicant = yield api.create(opts)
    return yield store.create(externalApplicantId, applicant)
  })

  const list = co(function* list (externalApplicantId, opts={}) {
    if (!opts.fetch) {
      return yield store.list()
    }

    const fetched = yield checks.api.list({ applicantId: applicant.id, expandReports: true })
    fetched.forEach(check => {
      check._applicantId = applicant.id
      check._externalApplicantId = externalApplicantId
    })

    return yield checks.store.update(fetched)
  })

  const get = co(function* get (externalApplicantId, opts={}) {
    const applicant = yield store.get(externalApplicantId)
    if (!opts.fetch) return applicant

    const applicant = yield api.get(applicant.id)
    return yield store.update(externalApplicantId, applicant)
  })

  const update = co(function* update (externalApplicantId, data) {
    const saved = yield store.get(externalApplicantId)
    const applicant = yield api.get(applicant.id)
    return yield store.update(externalApplicantId, applicant)
  })

  const uploadDocument = co(function* uploadDocument (externalApplicantId, doc) {
    const applicant = yield store.get(externalApplicantId)
    const result = yield api.uploadDocument(applicant.id, doc)
    return yield store.saveDocument(externalApplicantId, result)
  })

  const listDocuments = co(function* listDocuments (externalApplicantId, opts={}) {
    if (!opts.fetch) {
      return store.listDocuments(externalApplicantId)
    }

    const applicant = yield store.get(externalApplicantId)
    const docs = yield api.listDocuments(applicant.id)
    docs.forEach(doc => {
      doc[externalApplicantIdProp] = externalApplicantId
      doc[applicantIdProp] = applicant.id
    })

    yield store.updateDocuments(externalApplicantId, docs)
    return docs
  })

  return {
    create,
    list,
    get,
    update,
    uploadDocument,
    uploadLivePhoto
  }
}
