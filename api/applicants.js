
const typeforce = require('typeforce')
const secondary = require('level-secondary')
const debug = require('debug')('onfido:api:applicants')
const utils = require('../utils')
const { Promise, co, sub, omit, baseRequest, collect, getter, errorFromResponse } = utils
const types = require('../types')
const BASE_URL = 'https://api.onfido.com/v2/applicants'

module.exports = function createApplicantsAPI ({ db, token }) {
  const request = baseRequest(token)
  const create = co(function* create (applicantData) {
    typeforce({
      first_name: typeforce.String,
      last_name: typeforce.String,
      email: typeforce.String
      // TODO: optional props
    }, applicantData)

    return utils.post({ token, url: BASE_URL, data: applicantData })
  })

  const update = co(function* update (applicantId, applicantData) {
    return utils.post({
      token,
      url: `${BASE_URL}/${applicantId}`,
      data: applicantData
    })
  })

  const get = co(function* get (applicantId) {
    return utils.get({
      token,
      url: `${BASE_URL}/${applicantId}`
    })
  })

  /**
   * Does not currently support pagination
   */
  const list = co(function* () {
    const { applicants } = yield utils.get({
      token,
      url: BASE_URL
    })

    return applicants
  })

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
    const res = yield request
      .post(`'https://api.onfido.com/v2/applicants/${applicantId}/documents`)
      .type('form')
      .field({ file, type, side })

    const { ok, body } = res
    if (!ok) {
      throw errorFromResponse(res)
    }

    return body
  })

  const uploadLivePhoto = co(function* uploadLivePhoto (applicantId, photo) {
    typeforce({
      file: typeforce.String,
    }, photo)

    const res = yield request
      .post('https://api.onfido.com/v2/live_photos')
      .type('form')
      .field({
        applicant_id: applicantId,
        file: photo.file,
      })

    const { ok, body } = res
    if (!ok) {
      throw errorFromResponse(res)
    }

    return body
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
    // 'delete': deleteApplicant,
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
