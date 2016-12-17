
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

  return Object.freeze({
    externalIdProp,
    list,
    byId: getApplicantById,
    byExternalId: getApplicantByExternalId,
    create: createApplicant,
    update: updateApplicant,
    'delete': deleteApplicant,
    uploadDocument: uploadDocument,
    uploadLivePhoto: uploadLivePhoto,
    applicant: applicantAPI
  })

  const createApplicant = co(function* createApplicant (applicantData) {
    typeforce({
      first_name: typeforce.String,
      last_name: typeforce.String,
      email: typeforce.String
      // TODO: optional props
    }, applicantData)

    return onfido.createApplicant({ data: applicantData })
  })

  const updateApplicant = co(function* updateApplicant (applicantData) {
    return onfido.updateApplicant({ data: applicantData })
  })

  /**
   * Does not currently support pagination
   */
  function list () {
    return onfido.listApplicants()
  }

  const uploadDocument = co(function* uploadDocument (externalId, doc) {
    let { file, type, side } = doc
    typeforce({
      // external id
      id: typeforce.String,
      file: typeforce.String,
      type: types.docType,
      side: typeforce.maybe(types.side)
    }, doc)

    if (file.indexOf('data:') !== -1) {
      let fileInfo = parseBase64File(file)
      typeforce(types.docFileType, fileInfo.ext)
      file = new Buffer(fileInfo.data, 'base64')
    }

    // const result = yield onfido.uploadDocument(applicant.id, doc)
    return yield request
      .post(`'https://api.onfido.com/v2/applicants/${applicant.id}/documents`)
      .type('form')
      .field({ file, type, side })
      .send()
  })

  const uploadLivePhoto = co(function* uploadLivePhoto (externalId, photo) {
    typeforce({
      file: typeforce.String,
    }, photo)

    const applicant = yield getApplicantByExternalId(externalId)
    return request
      .post('https://api.onfido.com/v2/live_photos')
      .set('Authorization', 'Token token=' + token)
      .send({
        applicant_id: applicant.id,
        file: photo.file,
      })
  })

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

  function applicantAPI (externalId) {
    return {
      createDocumentCheck: createDocumentCheck.bind(null, externalId),
      createFaceCheck: createFaceCheck.bind(null, externalId),
      uploadDocument: uploadDocument.bind(null, externalId),
      uploadLivePhoto: uploadLivePhoto.bind(null, externalId),
      get: getOrCreateApplicant.bind(null, externalId),
      update: updateApplicant.bind(null, externalId)
    }
  }
}

function promisify (obj) {
  obj.promise = Promise.promisifyAll(obj)
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
