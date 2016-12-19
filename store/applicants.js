
const typeforce = require('typeforce')
const request = require('superagent')
const deepExtend = require('deep-extend')
const debug = require('debug')('onfido:store:applicants')
const { Promise, co, sub, omit, allSettledResults, collect, secondary } = require('../utils')
const promisify = Promise.promisifyAll
const types = require('../types')
const {
  applicantIdProp,
  externalApplicantIdProp,
  externalDocIdProp
} = require('../constants')

const hasExternalLinks = typeforce.compile({
  [externalApplicantIdProp]: typeforce.String
})

const docWithLinks = typeforce.compile({
  [applicantIdProp]: typeforce.String,
  [externalApplicantIdProp]: typeforce.String,
  [externalDocIdProp]: typeforce.String
})

module.exports = function createApplicantsAPI ({ db }) {
  const applicantsDB = sub(db, 'm')
  applicantsDB.byExternalId = secondary(applicantsDB, externalApplicantIdProp)

  const docsDB = sub(db, 'd')
  docsDB.byApplicantId = secondary(docsDB, applicantIdProp)
  docsDB.byExternalApplicantId = secondary(docsDB, externalApplicantIdProp)
  docsDB.byExternalId = secondary(docsDB, externalDocIdProp)

  promisify(applicantsDB)
  promisify(docsDB)

  const create = co(function* create (applicant) {
    typeforce(hasExternalLinks, applicant)
    return putApplicant(applicant)
  })

  const putApplicants = co(function* putApplicants (applicants) {
    typeforce(typeforce.arrayOf(hasExternalLinks), applicants)

    const batch = applicants.map(applicant => {
      return { type: 'put', key: applicant.id, value: applicant }
    })

    yield applicantsDB.batchAsync(batch)
    // return stored value
    return applicants
  })

  const update = co(function* update (applicants) {
    const updates = [].concat(applicants)
    const gets = updates.map(applicant => applicantsDB.getAsync(applicant.id))
    const saved = yield allSettledResults(gets)
    const updated = updates.map(function (update, i) {
      if (saved[i]) {
        return deepExtend(saved[i], update)
      }

      try {
        typeforce(hasExternalLinks, update)
      } catch (err) {
        debug(`skipping, don't know ${externalApplicantIdProp} for applicant ${update.id}`)
        return
      }

      return update
    })
    .filter(r => r)

    return yield putApplicants(updated)
  })

  /**
   * Does not currently support pagination
   */
  function list () {
    return collect(applicantsDB.createReadStream({ keys: false }))
  }

  const getApplicantByExternalId = co(function* getApplicantByExternalId (externalId) {
    const [applicant] = yield collect(applicantsDB.byExternalId.createReadStream({
      keys: false,
      start: externalId,
      end: externalId + '\xff'
    }))

    return applicant
  })

  function getApplicantById (id) {
    return applicantsDB.getAsync(id)
  }

  function putApplicant (applicant) {
    return applicantsDB.putAsync(applicant.id, applicant)
  }

  function putDocs (documents) {
    const arr = [].concat(documents)
    typeforce(typeforce.arrayOf(docWithLinks), arr)

    return docsDB.batchAsync(arr.map(doc => {
      return { type: 'put', key: doc.id, value: doc }
    }))
  }

  const listDocuments = co(function* listDocuments (externalId) {
    // const applicant = yield getApplicantById(externalId)
    collect(docsDB.byExternalApplicantId.createReadStream({
      keys: false,
      start: externalId,
      end: externalId + '\xff'
    }))
  })

  const updateDocuments = co(function* updateDocuments (docs) {
    const results = yield allSettled(docs.map(doc => docsDB.getAsync(doc.id)))
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
    put: putApplicant,
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
