
const querystring = require('querystring')
const typeforce = require('typeforce')
const utils = require('./utils')
const { Promise, co, sub, omit, authRequest, collect, getter } = utils
const types = require('./types')

module.exports = function createChecksAPI ({ token }) {
  typeforce(typeforce.String, token)

  const getUrl = getter(token)
  const createDocumentCheck = function createDocumentCheck (applicantId) {
    return createCheck(applicantId, { reports: [{ name: 'document' }] })
  }

  const createFaceCheck = function createFaceCheck (applicantId) {
    return createCheck(applicantId, { reports: [{ name: 'facial_similarity' }] })
  }

  const createCheck = co(function* createCheck (applicantId, opts={}) {
    typeforce(typeforce.String, applicantId)
    typeforce({
      reports: typeforce.arrayOf(typeforce.Object)
    }, opts)

    if (opts.type && opts.type !== 'express') {
      throw new Error('only "express" checks supported at this time')
    }

    // const { reports, report_type_groups } = opts
    // if (!reports && !report_type_groups) {
    //   throw new Error('either "reports" or "report_type_groups" must be specified when creating a check')
    // }

    // typeforce(typeforce.arrayOf(typeforce.oneOf(['document', 'face_comparison'])), reports)

    opts.type = 'express'
    return utils.post({
      token,
      url: `https://api.onfido.com/v2/applicants/${applicantId}/checks`,
      data: opts
    })
  })

  const fetchCheck = co(function* fetchCheck (opts) {
    typeforce({
      applicantId: typeforce.String,
      checkId: typeforce.String,
      expandReports: typeforce.maybe(typeforce.Boolean)
    }, opts)

    const { applicantId, checkId, expandReports } = opts
    const qs = expandReports ? '?expand=reports' : ''
    return getUrl(`https://api.onfido.com/v2/applicants/${applicantId}/checks/${checkId}${qs}`)
  })

  const fetchChecks = co(function* fetchChecks (opts) {
    typeforce({
      applicantId: typeforce.String,
      expandReports: typeforce.maybe(typeforce.Boolean)
    }, opts)

    const { applicantId, expandReports } = opts
    const qs = expandReports ? '?expand=reports' : ''
    return getUrl(`https://api.onfido.com/v2/applicants/${applicantId}/checks${qs}`)
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
    create: createCheck,
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
