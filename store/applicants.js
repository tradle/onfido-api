
const typeforce = require('typeforce')
const request = require('superagent')
const collect = Promise.promisify(require('stream-collector'))
const secondary = require('level-secondary')
const deepExtend = require('deep-extend')
const { Promise, co, sub, omit, setPromiseInterface, allSettled } = require('./utils')
const types = require('./types')
const {
  applicantIdProp,
  externalApplicantIdProp,
  externalDocIdProp
} = require('./constants')

const docWithLinks = typeforce.compile({
  [applicantIdProp]: typeforce.String,
  [externalApplicantIdProp]: typeforce.String,
  [externalDocIdProp]: typeforce.String
})

module.exports = function createApplicantsAPI ({ db, token }) {
  const applicants = sub(db, 'm')
  applicants.byExternalId = secondary(applicants, externalApplicantIdProp)

  const docs = sub(db, 'd')
  docs.byApplicantId = secondary(docs, applicantIdProp)
  docs.byExternalApplicantId = secondary(docs, externalApplicantIdProp)
  docs.byExternalId = secondary(docs, externalDocIdProp)

  setPromiseInterface(applicants)
  setPromiseInterface(applicants.byExternalId)
  setPromiseInterface(docs)

  const create = co(function* create (externalId, applicant) {
    applicant[externalApplicantIdProp] = externalId
    return yield putApplicant(applicant)
  })

  const update = co(function* update (externalId, applicant) {
    const saved = yield getApplicantByExternalId(externalId)
    deepExtend(saved, applicant)
    return yield putApplicant(saved)
  })

  /**
   * Does not currently support pagination
   */
  function list () {
    return collect(applicants.createReadStream({ keys: false }))
  }

  function getApplicantByExternalId (externalId) {
    return applicants.byExternalId.promise.get(externalId)
  }

  function getApplicantById (id) {
    return applicants.promise.get(id)
  }

  function putApplicant (applicant) {
    return applicants.promise.put(applicant.id, applicant)
  }

  function putDocs (documents) {
    const arr = [].concat(documents)
    typeforce(typeforce.arrayOf(docWithLinks), arr)

    return docs.promise.batch(arr.map(doc => {
      return { type: 'put', key: doc.id, value: doc }
    }))
  }

  const listDocuments = co(function* listDocuments (externalId) {
    // const applicant = yield getApplicantById(externalId)
    collect(docs.byExternalApplicantId.createReadStream({
      keys: false,
      start: externalId,
      end: externalId
    }))
  })

  const updateDocuments = co(function* updateDocuments (docs) {
    const results = yield allSettled(docs.map(doc => docs.promise.get(doc.id)))
    const updated = results.map((r, i) => {
      if (r.value) {
        return deepExtend(r.value, docs[i])
      } else {
        return docs[i]
      }
    })

    return putDocs(updated)
  })

  return Object.freeze({
    externalApplicantIdProp,
    list,
    get: getApplicantByExternalId,
    byExternalId: getApplicantByExternalId,
    byId: getApplicantById,
    create,
    update,
    listDocuments: listDocuments,
    saveDocument: putDocs,
    saveDocuments: putDocs,
    updateDocuments: updateDocuments
  })
}

function parseBase64File (image) {
  const bIdx = file.indexOf('base64,')
  const mime = image.slice(5, bIdx)
  const ext = mime.split('/').pop()
  return {
    mime: mime,
    ext: ext,
    data: image.slice(bIdx + 7)
  }
}
