
const querystring = require('querystring')
const typeforce = require('typeforce')
const collect = Promise.promisify(require('stream-collector'))
const secondary = require('level-secondary')
const { Promise, co, sub, omit, baseRequest } = require('./utils')
const types = require('./types')

module.exports = function createChecksAPI ({ onfido, token }) {
  const request = baseRequest(token)

  const createDocumentCheck = function createDocumentCheck (applicantId) {
    return createCheck(applicantId, { reports: ['document'] })
  }

  const createFaceCheck = function createFaceCheck (applicantId) {
    return createCheck(applicantId, { reports: ['facial_similarity'] })
  }

  const createCheck = co(function* createCheck (applicantId, opts) {
    if (opts.type && opts.type !== 'express') {
      throw new Error('only "express" checks supported at this time')
    }

    // const { reports, report_type_groups } = opts
    // if (!reports && !report_type_groups) {
    //   throw new Error('either "reports" or "report_type_groups" must be specified when creating a check')
    // }

    // typeforce(typeforce.arrayOf(typeforce.oneOf(['document', 'face_comparison'])), reports)

    opts.type = 'express'
    return request
      .post(`https://api.onfido.com/v2/applicants/${applicantId}/checks`)
      .send(opts)
  })

  const fetchCheck = co(function* fetchCheck ({ applicantId, checkId, expandReports }) {
    const query = {}
    if (expandReports) query.expand = 'reports'
    return request
      .post(`https://api.onfido.com/v2/applicants/${applicantId}/checks/${checkId}?${querystring.stringify(query)}`)
      .send()
  })

  const fetchChecks = co(function* fetchChecks ({ applicantId, expandReports ) {
    const query = {}
    if (expandReports) query.expand = 'reports'
    return request
      .post(`https://api.onfido.com/v2/applicants/${applicantId}/checks??${querystring.stringify(query)}`)
      .send()
  })

  // function checkAPI (checkId) {
  //   return {
  //     get: getCheck.bind(null, checkId),
  //     createDocumentCheck,
  //     createFaceCheck,
  //     report: function (opts) {
  //       opts.checkId = checkId
  //       return reports.get(opts)
  //     },
  //     reports: function (opts) {
  //       opts.checkId = checkId
  //       return reports.list(opts)
  //     },
  //     uploadDocument: uploadDocument.bind(null, checkId),
  //     uploadLivePhoto: uploadLivePhoto.bind(null, checkId),
  //     get: getOrCreateApplicant.bind(null, checkId),
  //     update: updateApplicant.bind(null, checkId)
  //   }
  // }

  return {
    createDocumentCheck: createDocumentCheck,
    createFaceCheck: createFaceCheck,
    list: fetchChecks,
    get: fetchCheck,
    // check: checkAPI
  }

  // return {
  //   list: checkAPI,
  //   get: getCheck,
  //   update: update,
  //   check: checkAPI
  // }
}
