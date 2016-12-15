
const typeforce = require('typeforce')
const request = require('superagent')
const collect = Promise.promisify(require('stream-collector'))
const secondary = require('level-secondary')
const { Promise, co, sub, omit } = require('./utils')
const types = require('./types')

module.exports = createApplicantsAPI

function createApplicantsAPI ({ db, onfido, token }) {
  const applicants = sub(db, 'm')
  applicants.byPermalink = secondary(applicants, 'permalink')

  const docs = sub(db, 'd')
  docs.byId = secondary(docs, 'id')
  docs.byApplicantId = secondary(docs, 'applicantId')
  docs.byApplicantPermalink = secondary(docs, 'applicantPermalink')

  promisify(applicants)
  promisify(applicants.byPermalink)
  promisify(docs)

  return {
    list: list,
    byId: getApplicantById,
    byPermalink: getApplicantByPermalink,
    create: getOrCreateApplicant,
    update: createOrUpdateApplicant,
    'delete': deleteApplicant,
    uploadDocument: uploadDocument,
    uploadLivePhoto: uploadLivePhoto,
    applicant: applicantAPI,
  }

  function create (permalink, applicantData) {
    return createApplicant(permalink, applicantData)
  }

  const createOrUpdateApplicant = co(function* createOrUpdateApplicant (permalink, applicantData) {
    try {
      yield byPermalink(permalink)
      return updateApplicant(permalink, applicantData)
    } catch (err) {
      return createApplicant(permalink, applicantData)
    }
  })

  const createApplicant = co(function* createApplicant (permalink, applicantData) {
    typeforce({
      first_name: typeforce.String,
      last_name: typeforce.String,
      email: typeforce.String
      // TODO: optional props
    }, applicantData)

    return updateApplicant(permalink, applicantData, true)
  })

  const updateApplicant = co(function* updateApplicant (applicantPermalink, applicantData, create) {
    const method = create ? 'createApplicant' : 'updateApplicant'
    const applicant = yield api[method]({ data: applicantData })
    applicant.permalink = applicantPermalink
    yield putApplicant(applicant)
    return applicant
  })

  /**
   * Does not currently support pagination
   */
  function list (fetch) {
    return fetch !== false
      ? onfido.listApplicants()
      : collect(applicants.createReadStream({ keys: false }))
  }

  const uploadDocument = co(function* uploadDocument (applicantPermalink, doc) {
    const { file, type, side } = opts
    typeforce({
      file: typeforce.String,
      type: types.docType,
      side: typeforce.maybe(types.side)
    }, opts)

    const applicant = yield get(applicantPermalink)
    if (!applicant) throw new Error('applicant not found')

    const result = yield onfido.uploadDocument(applicant.id, doc)
    result.applicantId = applicant.id
    result.applicantPermalink = applicantPermalink
    yield putDoc(result)
    return result
  })

  const uploadLivePhoto = co(function* uploadLivePhoto (applicantPermalink, photo) {
    typeforce({
      file: typeforce.String,
    }, photo)

    const applicant = yield getApplicantByPermalink(applicantPermalink)
    return request
      .post('https://api.onfido.com/v2/live_photos')
      .set('Authorization', 'Token token=' + token)
      .send({
        applicant_id: applicant.id,
        file: photo.file,
      })
  })

  function getApplicantByPermalink (permalink) {
    return applicants.byPermalink.promise.get(permalink)
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

  function applicantAPI (applicantPermalink) {
    return {
      createDocumentCheck: createDocumentCheck.bind(null, applicantPermalink),
      createFaceCheck: createFaceCheck.bind(null, applicantPermalink),
      uploadDocument: uploadDocument.bind(null, applicantPermalink),
      uploadLivePhoto: uploadLivePhoto.bind(null, applicantPermalink),
      get: getOrCreateApplicant.bind(null, applicantPermalink),
      update: updateApplicant.bind(null, applicantPermalink)
    }
  }
}

function promisify (obj) {
  obj.promise = Promise.promisifyAll(obj)
}
