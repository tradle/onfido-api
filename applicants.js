
const typeforce = require('typeforce')
const collect = Promise.promisify(require('stream-collector'))
const secondary = require('level-secondary')
const { Promise, co, sub, omit } = require('./utils')
const types = require('./types')

module.exports = createApplicantsAPI

function createApplicantsAPI ({ db, token }) {
  const applicants = sub(db, 'm')
  applicants.byPermalink = secondary(applicants, 'permalink')

  const docs = sub(db, 'd')
  docs.byId = secondary(docs, 'id')
  docs.byApplicantId = secondary(docs, 'applicantId')
  docs.byApplicantPermalink = secondary(docs, 'applicantPermalink')

  const checks = sub(db, 'c')
  checks.byApplicantId = secondary(checks, 'applicantId')
  checks.byApplicantPermalink = secondary(checks, 'applicantPermalink')

  const reports = sub(db, 'r')
  reports.byApplicantId = secondary(reports, 'applicantId')
  reports.byApplicantPermalink = secondary(reports, 'applicantPermalink')
  reports.byCheckId = secondary(reports, 'checkId')

  promisify(applicants)
  promisify(applicants.byPermalink)
  promisify(docs)
  promisify(checks)
  promisify(reports)

  return {
    list: list,
    get: getOrCreateApplicant,
    update: createOrUpdateApplicant,
    'delete': deleteApplicant,
    uploadDocument: uploadDocument,
    uploadLivePhoto: uploadLivePhoto,
    applicant: applicantAPI,
    check: checkAPI,
    reports: listReports
  }

  const getOrCreateApplicant = co(function* getOrCreateApplicant (permalink, applicantData) {
    try {
      return yield byPermalink(permalink)
    } catch (err) {
      return createApplicant(permalink, applicantData)
    }
  })

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
    return fetch
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

  function putCheck (check) {
    return checks.promise.put(check.id, check)
  }

  function putChecks (applicant, check) {
    const checksBatch = checks.map(check => {
      check = omit(check, ['reports'])
      check.applicantId = applicant.id
      check.applicantPermalink = applicant.permalink
      return { type: 'put', key: check.id, value: check }
    })

    return checks.promise.batch(checksBatch)
  }

  function putReport (report) {
    return reports.promise.put(report.id, report)
  }

  function createDocumentCheck (applicantPermalink, opts) {
    return createCheck(applicantPermalink, { reports: ['document'] })
  }

  function createFaceCheck (applicantPermalink, opts) {
    return createCheck(applicantPermalink, { reports: ['face_comparison'] })
  }

  const createCheck = co(function* createCheck (applicantPermalink, opts) {
    if (opts.type && opts.type !== 'express') {
      throw new Error('only "express" checks supported at this time')
    }

    // const { reports, report_type_groups } = opts
    // if (!reports && !report_type_groups) {
    //   throw new Error('either "reports" or "report_type_groups" must be specified when creating a check')
    // }

    // typeforce(typeforce.arrayOf(typeforce.oneOf(['document', 'face_comparison'])), reports)

    opts.type = 'express'
    const applicant = yield getApplicantByPermalink(applicantPermalink)
    const result = onfido.createCheck(applicant.id, opts)
    return Promise.all([
      putChecks(applicant, [result]),
      updateReportsForChecks(applicant, [result])
    ])
  })

  const updateReportsForChecks = co(function* updateReportsForChecks (applicant, checkObjs) {
    if (typeof applicant === 'string') {
      applicant = yield getApplicantByPermalink(applicant)
    }

    const reportsBatch = checkObjs.map(check => {
      return check.reports.map(report => {
        report.applicantId = applicant.id
        report.applicantPermalink = applicant.permalink
        report.checkId = check.id
        return { type: 'put', key: report.id, value: report }
      })
    })
    .reduce(function (all, next) {
      return all.concat(next)
    }, [])

    return reports.promise.batch(reportsBatch)
  })

  const listChecks = co(function listChecks (opts) {
    const applicantPermalink = opts.applicant
    if (opts.fetch !== false) return fetchChecks(opts)

    return getSavedChecksForApplicant(applicantPermalink)
  })

  const fetchChecks = co(function* fetchChecks (opts) {
    const applicant = yield getApplicantByPermalink(opts.applicant)
    const result = yield request
      .post(`https://api.onfido.com/v2/applicants/${applicant.id}/checks?expand=reports`)
      .set('Authorization', 'Token token=' + token)
      .send()

    // onfido js client doesn't support `expand` query param
    // const result = yield onfido.listChecks(opts.applicant)
    yield Promise.all([
      putChecks(applicant, result),
      updateReportsForChecks(applicant, result)
    ])
  })

  const listReports = co(function listReports (opts) {
    if (opts.fetch !== false) {
      return fetchReports(opts)
    }

    if (opts.checkId) {
      return collect(reports.byCheckId.createReadStream({
        start: opts.checkId,
        end: opts.checkId,
        keys: false
      }))
    }

    const applicantPermalink = opts.applicant
    return getSavedReportsForApplicant(applicantPermalink)
  })

  const getReport = co(function getReport (opts) {
    if (opts.fetch !== false) {
      return fetchReport(opts)
    }

    return reports.promise.get(opts.reportId)
  })

  function fetchReport (opts) {
    let { checkId, reportId } = opts
    if (!checkId) {
      const report = yield getReport({ opts.reportId })
      checkId = report.checkId
    }

    const report = yield onfido.findReport(checkId, opts.reportId)
    yield updateReportsForChecks([{ id: checkId, reports: [report] }])
    return report
  }

  function getSavedReportsForApplicant (applicantPermalink, opts={}) {
    return collect(reports.byApplicantPermalink.createReadStream({
      start: applicantPermalink,
      end: applicantPermalink,
      keys: opts.keys || false
    }))
  }

  const getSavedChecksForApplicant = co(*function getSavedChecksForApplicant (applicantPermalink, opts={}) {
    const stream = checks.byApplicantPermalink.createReadStream({
      start: applicantPermalink,
      end: applicantPermalink,
      keys: false
    })

    const savedChecks = yield collect(stream)
    if (opts.values === false) return savedChecks

    const reportSets = Promise.all(savedChecks.map(check => {
      return listReports({ checkId: data.id, fetch: false })
    }))

    savedChecks.forEach(function (check, i) {
      check.reports  =reportSets[i]
    })

    return savedChecks
  })

  const fetchReports = co(function* fetchReports (opts) {
    const checkId = opts
    const applicantPermalink = opts.applicant
    if (!checkId) {
      // fetch all reports for all checks for this applicant
      const checkIds = yield getSavedChecksForApplicant(applicantPermalink, { values: false })
      return Promise.all(checkIds.map(checkId => fetchReports({ checkId })))
    }

    const reports = yield onfido.listReports(checkId)
    yield updateReportsForChecks(applicantPermalink, [{ id: checkId, reports: reports }])
    return reports
  })

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

  function checkAPI (checkId) {
    return {
      get: getCheck.bind(null, checkId),
      report: function (opts) {
        opts.checkId = checkId
        return getReport(opts)
      },
      reports: function (opts) {
        opts.checkId = checkId
        return listReports(opts)
      },
      uploadDocument: uploadDocument.bind(null, checkId),
      uploadLivePhoto: uploadLivePhoto.bind(null, checkId),
      get: getOrCreateApplicant.bind(null, checkId),
      update: updateApplicant.bind(null, checkId)
    }
  }
}

function promisify (obj) {
  obj.promise = Promise.promisifyAll(obj)
}
