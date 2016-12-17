const typeforce = require('typeforce')
const request = require('superagent')
const deepExtend = require('deep-extend')
const collect = Promise.promisify(require('stream-collector'))
const secondary = require('level-secondary')
const { Promise, co, sub, omit } = require('./utils')
const types = require('./types')

module.exports = function createReportsAPI ({ db, onfido, token }) {
  const update = co(function* update (reports) {
    const arr = [].concat(reports)
    const saved = yield Promise.all(arr.map(r => db.promise.get(r.id)))
    yield save(arr.map(report => {
      return deepExtend(saved, report)
    }))

    return reports
  })

  function create (reports) {
    reports.forEach(r => {
      typeforce({
        applicantId: typeforce.String,
        [externalApplicantId]: typeforce.String,
        checkId: typeforce.String
      }, r)
    })

    return save({ reports })
  }

  function save (reports) {
    return db.promise.batch(reports.map(report => {
      return { type: 'put', key: report.id, value: report }
    }))
  }

  const listReports = co(function listReports (opts) {
    if (opts.fetch) {
      return fetchReports(opts)
    }

    if (opts.checkId) {
      return collect(db.byCheckId.createReadStream({
        start: opts.checkId,
        end: opts.checkId,
        keys: false
      }))
    }

    const externalApplicantId = opts.applicant
    return getSavedReportsForApplicant(externalApplicantId)
  })

  const getReport = co(function getReport (opts) {
    if (opts.fetch) {
      return fetchReport(opts)
    }

    return db.promise.get(opts.reportId)
  })

  function fetchReport (opts) {
    let { checkId, reportId } = opts
    if (!checkId) {
      const report = yield getReport({ opts.reportId })
      checkId = report.checkId
    }

    const report = yield onfido.findReport(checkId, opts.reportId)
    yield update(report, checkId)
    return report
  }

  const fetchReports = co(function* fetchReports (opts) {
    const checkId = opts
    const externalApplicantId = opts.applicant
    if (!checkId) {
      // fetch all reports for all checks for this applicant
      const checkIds = yield getSavedChecksForApplicant(externalApplicantId, { values: false })
      return Promise.all(checkIds.map(checkId => fetchReports({ checkId })))
    }

    const reports = yield onfido.listReports(checkId)
    yield update({ applicant, reports, checkId }])
    return reports
  })

  return {
    list: listReports,
    get: getReport,
    create: create,
    update: update
  }
}
