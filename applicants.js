
const deepExtend = require('deep-extend')
const { Promise, co, sub, omit, setPromiseInterface } = require('./utils')
const {
  applicantIdProp,
  externalApplicantIdProp,
  externalDocIdProp
} = require('./constants')

module.exports = function ({ db, api, store }) {

  const create = co(function* create (externalApplicantId, opts) {
    const applicant = yield api.create(opts)
    applicant[externalApplicantIdProp] = externalApplicantId
    return yield store.create(applicant)
  })

  const list = co(function* list (opts={}) {
    if (!opts.fetch) {
      return yield store.list()
    }

    const fetched = yield api.list()
    return yield store.update(fetched)
  })

  const get = co(function* get (externalApplicantId, opts={}) {
    const stored = yield store.get(externalApplicantId)
    if (!opts.fetch) return stored

    const applicant = yield api.get(applicant.id)
    deepExtend(stored, applicant)
    return yield store.put(applicant)
  })

  const update = co(function* update (externalApplicantId, data) {
    const saved = yield store.get(externalApplicantId)
    const applicant = yield api.update(applicant.id, data)
    deepExtend(saved, applicant)
    return yield store.put(applicant)
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

  const uploadLivePhoto = co(function* uploadLivePhoto (externalApplicantId, photo) {
    const applicant = yield store.get(externalApplicantId)
    const result = yield api.uploadLivePhoto(applicant.id, photo)
    return result
    // return yield store.saveDocument(externalApplicantId, result)
  })

  return {
    api,
    store,
    create,
    list,
    get,
    update,
    uploadDocument,
    uploadLivePhoto
  }
}
