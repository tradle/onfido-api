
const typeforce = require('typeforce')
const request = require('superagent')
const collect = Promise.promisify(require('stream-collector'))
const secondary = require('level-secondary')
const { Promise, co, sub, omit } = require('./utils')
const types = require('./types')

module.exports = function createChecksAPI ({ db, onfido, applicants, token }) {
  const externalApplicantIdProp = applicants.externalIdProp
  const localExternalApplicantIdProp = 'applicantExternalId'
  const checks = sub(db, 'c')
  checks.byApplicantId = secondary(checks, 'applicantId')
  checks.byApplicantExternalId = secondary(checks, externalApplicantIdProp)

  promisify(checks)

  const putCheck = co(function* putCheck (check) {
    yield checks.promise.put(check.id, check)
    return check
  })

  const putChecks = co(function* putChecks (applicant, check) {
    const neutered = checks.map(check => omit(check, ['reports']))
    const checksBatch = checks.map(check => {
      check.applicantId = applicant.id
      check[localExternalApplicantIdProp] = applicant[externalApplicantIdProp]
      return { type: 'put', key: check.id, value: check }
    })

    yield checks.promise.batch(checksBatch)
    // return stored value
    return neutered
  })

  function createDocumentCheck (externalApplicantId) {
    return createCheck(externalApplicantId, { reports: ['document'] })
  }

  function createFaceCheck (externalApplicantId) {
    return createCheck(externalApplicantId, { reports: ['facial_similarity'] })
  }

  const createCheck = co(function* createCheck (externalApplicantId, opts) {
    if (opts.type && opts.type !== 'express') {
      throw new Error('only "express" checks supported at this time')
    }

    // const { reports, report_type_groups } = opts
    // if (!reports && !report_type_groups) {
    //   throw new Error('either "reports" or "report_type_groups" must be specified when creating a check')
    // }

    // typeforce(typeforce.arrayOf(typeforce.oneOf(['document', 'face_comparison'])), reports)

    opts.type = 'express'
    const applicant = yield applicants.byExternalId(externalApplicantId)
    const check = onfido.createCheck(applicant.id, opts)
    check.reports.forEach(report => {
      report.checkId = check.id
      report.applicantId = applicant.id
      report[localExternalApplicantIdProp] = applicant[externalApplicantIdProp]
    })

    yield Promise.all([
      putChecks(applicant, [check]),
      reports.create(reports)
    ])

    return check
  })


  const listChecks = co(function listChecks (opts) {
    const externalApplicantId = opts.applicant
    if (opts.fetch) return fetchChecks(opts)

    return getSavedChecksForApplicant(externalApplicantId)
  })

  const fetchChecks = co(function* fetchChecks (opts) {
    const applicant = yield applicants.byExternalId(opts.applicant)
    const result = yield request
      .post(`https://api.onfido.com/v2/applicants/${applicant.id}/checks?expand=reports`)
      .set('Authorization', 'Token token=' + token)
      .send()

    // onfido js client doesn't support `expand` query param
    // const result = yield onfido.listChecks(opts.applicant)
    const reports = result.reduce(function (memo, check) {
      return memo.concat(check.reports)
    }, [])

    yield Promise.all([
      putChecks(applicant, result),
      reports.update(reports)
    ])
  })

  const getSavedChecksForApplicant = co(*function getSavedChecksForApplicant (externalApplicantId, opts={}) {
    const stream = checks.byApplicantExternalId.createReadStream({
      start: externalApplicantId,
      end: externalApplicantId,
      keys: false
    })

    const savedChecks = yield collect(stream)
    if (opts.values === false) return savedChecks

    const reportSets = Promise.all(savedChecks.map(check => {
      return listReports({ checkId: data.id, fetch: false })
    }))

    savedChecks.forEach(function (check, i) {
      check.reports = reportSets[i]
    })

    return savedChecks
  })

  const getCheck = co(function* getCheck (checkId) {
    const check = yield checks.promise.get(checkId)
    check.reports = yield reports.list({ checkId: data.id, fetch: false })
    return check
  })

  const update = co(function* update (check) {
    const saved = yield getCheck(check.id)
    deepExtend(saved, check)
    return putCheck(saved)
  })

  function checkAPI (checkId) {
    return {
      get: getCheck.bind(null, checkId),
      createDocumentCheck,
      createFaceCheck,
      report: function (opts) {
        opts.checkId = checkId
        return reports.get(opts)
      },
      reports: function (opts) {
        opts.checkId = checkId
        return reports.list(opts)
      },
      uploadDocument: uploadDocument.bind(null, checkId),
      uploadLivePhoto: uploadLivePhoto.bind(null, checkId),
      get: getOrCreateApplicant.bind(null, checkId),
      update: updateApplicant.bind(null, checkId)
    }
  }

  return {
    list: checkAPI,
    get: getCheck,
    update: update,
    check: checkAPI
  }
}
