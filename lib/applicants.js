
const fs = require('fs')
const path = require('path')
const typeforce = require('typeforce')
const debug = require('debug')('onfido:api:applicants')
const utils = require('./utils')
const types = require('./types')
const {
  Promise,
  co,
  omit,
  poster,
  getter,
  authRequest,
  errorFromResponse
} = utils
const BASE_URL = 'https://api.onfido.com/v2/applicants'

module.exports = function createApplicantsAPI ({ token }) {
  typeforce(typeforce.String, token)

  const getUrl = getter(token)
  const post = poster(token)
  const auth = authRequest(token)
  const create = co(function* create (applicantData) {
    typeforce({
      first_name: typeforce.String,
      last_name: typeforce.String,
      email: typeforce.String
      // TODO: optional props
    }, applicantData)

    return post({ url: BASE_URL, data: applicantData })
  })

  const update = co(function* update (applicantId, applicantData) {
    return post({
      url: `${BASE_URL}/${applicantId}`,
      data: applicantData
    })
  })

  const get = co(function* get (applicantId) {
    return getUrl(`${BASE_URL}/${applicantId}`)
  })

  /**
   * Does not currently support pagination
   */
  const list = co(function* () {
    const { applicants } = yield getUrl(BASE_URL)
    return applicants
  })

  const uploadDocument = co(function* uploadDocument (applicantId, doc) {
    let { type, side } = doc
    typeforce({
      type: types.docType,
      side: typeforce.maybe(types.side)
    }, doc)

    const { file, filename } = yield getFile(doc)
    const data = { type }
    const req = auth
      .post(`https://api.onfido.com/v2/applicants/${applicantId}/documents`)
      .field('type', type)
      .attach('file', file, filename)

    if (side) req.field('side', side)

    try {
      const { ok, body } = yield req
      return body
    } catch (err) {
      throw errorFromResponse(err.response)
    }
  })

  const getFile = co(function* (doc) {
    const { filename, filepath, file } = doc
    if (filepath) {
      return {
        filename: filename || path.basename(filepath),
        file: fs.createReadStream(filepath)
      }
    }

    typeforce({
      file: typeforce.Buffer,
      filename: typeforce.String
    }, doc)

    return { file, filename }
  })

  const uploadLivePhoto = co(function* uploadLivePhoto (applicantId, photo) {
    const { file, filename } = yield getFile(photo)
    const req = auth
      .post('https://api.onfido.com/v2/live_photos')
      .field('applicant_id', applicantId)
      .attach('file', file, filename)

    try {
      const { ok, body } = yield req
      return body
    } catch (err) {
      throw errorFromResponse(err.response)
    }
  })

  const deleteApplicant = co(function* deleteApplicant (applicantId) {
    try {
      const { ok, body } = yield auth.delete(`https://api.onfido.com/v2/applicants/${applicantId}`)
      return body
    } catch (err) {
      throw errorFromResponse(err.response)
    }
  })

  function listDocuments (applicantId) {
    return getUrl(`https://api.onfido.com/v2/applicants/${applicantId}/documents`)
  }

  // function applicantAPI (applicantId) {
  //   return {
  //     createDocumentCheck: createDocumentCheck.bind(null, applicantId),
  //     createFaceCheck: createFaceCheck.bind(null, applicantId),
  //     uploadDocument: uploadDocument.bind(null, applicantId),
  //     uploadLivePhoto: uploadLivePhoto.bind(null, applicantId),
  //     get: getOrCreate.bind(null, applicantId),
  //     update: update.bind(null, applicantId)
  //   }
  // }

  return Object.freeze({
    get,
    list,
    create,
    update,
    'delete': deleteApplicant,
    uploadDocument,
    uploadLivePhoto,
    listDocuments
    // applicant: applicantAPI
  })
}

function promisify (obj) {
  obj.promise = Promise.promisifyAll(obj)
}
