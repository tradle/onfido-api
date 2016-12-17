
const typeforce = require('typeforce')
const request = require('superagent')
const collect = Promise.promisify(require('stream-collector'))
const secondary = require('level-secondary')
const { Promise, co, sub, omit } = require('./utils')
const types = require('./types')

module.exports = function createApplicantsAPI ({ db, onfido, token }) {
  const applicants = sub(db, 'm')
  const externalIdProp = 'externalId'
  applicants.byExternalId = secondary(applicants, externalIdProp)

  const docExternalIdProp = 'externalDocId'
  const docs = sub(db, 'd')
  docs.byId = secondary(docs, 'id')
  docs.byApplicantId = secondary(docs, 'applicantId')
  docs.byApplicantExternalId = secondary(docs, externalIdProp)
  docs.byExternalId = secondary(docs, docExternalIdProp)

  promisify(applicants)
  promisify(applicants.byExternalId)
  promisify(docs)

  const create = co(function* create (externalId, applicant) {
    applicant[externalIdProp] = externalId
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

  function putDoc (doc) {
    return docs.promise.put(doc.id, doc)
  }

  return Object.freeze({
    externalIdProp,
    list,
    byId: getApplicantById,
    byExternalId: getApplicantByExternalId,
    create: create,
    update: update
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
