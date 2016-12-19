
const typeforce = require('typeforce')
const collect = Promise.promisify(require('stream-collector'))
const secondary = require('level-secondary')
const debug = require('debug')('onfido:api:applicants')
const { Promise, co, sub, omit, baseRequest } = require('./utils')
const types = require('./types')
const BASE_URL = 'https://api.onfido.com/v2/applicants'

module.exports = function createApplicantsAPI ({ db, token }) {
  return Object.freeze({
    get,
    list,
    create,
    update,
    // 'delete': deleteApplicant,
    uploadDocument,
    uploadLivePhoto,
    applicant: applicantAPI
  })

  const request = baseRequest(token)
  const create = co(function* create (applicantData) {
    typeforce({
      first_name: typeforce.String,
      last_name: typeforce.String,
      email: typeforce.String
      // TODO: optional props
    }, applicantData)

    const result = yield request
      .post(BASE_URL)
      .send(applicantData)

    debug('created applicant', result)
    return result
  })

  const update = co(function* update (applicantId, applicantData) {
    const result = yield request
      .post(`${BASE_URL}/${applicantId}`)
      .send(applicantData)

    debug('updated applicant', result)
    return result
  })

  function get (applicantId) {
    return request.get(`${BASE_URL}/${applicantId}`)
  }

  /**
   * Does not currently support pagination
   */
  function list () {
    return request.get(BASE_URL)
  }

  const uploadDocument = co(function* uploadDocument (applicantId, doc) {
    let { file, type, side } = doc
    typeforce({
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
      .post(`'https://api.onfido.com/v2/applicants/${applicantId}/documents`)
      .type('form')
      .field({ file, type, side })
      .send()
  })

  const uploadLivePhoto = co(function* uploadLivePhoto (applicantId, photo) {
    typeforce({
      file: typeforce.String,
    }, photo)

    return request
      .post('https://api.onfido.com/v2/live_photos')
      .send({
        applicant_id: applicantId,
        file: photo.file,
      })
  })

  function applicantAPI (applicantId) {
    return {
      createDocumentCheck: createDocumentCheck.bind(null, applicantId),
      createFaceCheck: createFaceCheck.bind(null, applicantId),
      uploadDocument: uploadDocument.bind(null, applicantId),
      uploadLivePhoto: uploadLivePhoto.bind(null, applicantId),
      get: getOrCreate.bind(null, applicantId),
      update: update.bind(null, applicantId)
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
