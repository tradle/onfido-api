
const typeforce = require('typeforce')
const secondary = require('level-secondary')
const debug = require('debug')('onfido:api:applicants')
const utils = require('../utils')
const { Promise, co, sub, omit, collect, poster, getter, authRequest, errorFromResponse } = utils
const types = require('../types')
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
    let { file, type, side } = doc
    typeforce({
      file: typeforce.Buffer,
      type: types.docType,
      side: typeforce.maybe(types.side)
    }, doc)

    if (file.indexOf('data:') !== -1) {
      let fileInfo = parseBase64File(file)
      typeforce(types.docFileType, fileInfo.ext)
      file = new Buffer(fileInfo.data, 'base64')
    }

    // const result = yield onfido.uploadDocument(applicant.id, doc)
    const data = { type }
    if (side) data.side = side

    const req = auth
      .post(`https://api.onfido.com/v2/applicants/${applicantId}/documents`)
      .send(data)
      .attach('file', file, type)

    try {
      var { ok, body } = yield req
      return body
    } catch (err) {
      throw errorFromResponse(err.response)
    }
  })

  const uploadLivePhoto = co(function* uploadLivePhoto (applicantId, photo) {
    typeforce({
      file: typeforce.Buffer
    }, photo)

    const { file } = photo
    const req = auth
      .post('https://api.onfido.com/v2/live_photos')
      .send({
        applicant_id: applicantId
      })
      .attach('file', file, 'selfie')

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

  return Object.freeze({
    get,
    list,
    create,
    update,
    'delete': deleteApplicant,
    uploadDocument,
    uploadLivePhoto,
    applicant: applicantAPI
  })
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
