const typeforce = require('typeforce')
const deepExtend = require('deep-extend')
const {
  Promise,
  co,
  sub,
  omit,
  collect,
  allSettledResults,
  secondary
} = require('../utils')

const promisify = Promise.promisifyAll
const {
  externalApplicantIdProp,
  applicantIdProp,
  checkIdProp
} = require('../constants')
const types = require('../types')
const hasRequiredLinks = typeforce.compile({
  [applicantIdProp]: typeforce.String,
  [externalApplicantIdProp]: typeforce.String,
  [checkIdProp]: typeforce.String
})

module.exports = function createReportsAPI ({ db, token }) {
  db = sub(db, 'r')
  db.byApplicantId = secondary(db, applicantIdProp)
  db.byExternalApplicantId = secondary(db, externalApplicantIdProp)
  db.byCheckId = secondary(db, checkIdProp)
  promisify(db)

  const update = co(function* update (reports) {
    const updates = [].concat(reports)
    const saved = yield allSettledResults(updates.map(r => db.getAsync(r.id)))
    const updated = updates.map(report => {
      if (saved) {
        return deepExtend(saved, report)
      } else {
        typeforce(hasRequiredLinks, report)
        return report
      }
    })

    yield save(reports)
    return reports
  })

  function get (reportId) {
    return db.getAsync(reportId)
  }

  function create (reports) {
    const arr = [].concat(reports)
    typeforce(typeforce.arrayOf(hasRequiredLinks), arr)
    return save(arr)
  }

  function save (reports) {
    return db.batchAsync(reports.map(report => {
      return { type: 'put', key: report.id, value: report }
    }))
  }

  function listReports ({ checkId, applicantId, externalApplicantId }, opts={}) {
    let prop, index
    if (checkId) {
      prop = checkId
      index = db.byCheckId
    } else if (externalApplicantId) {
      prop = externalApplicantId
      index = db.byExternalApplicantId
    } else {
      prop = applicantId
      index = db.byApplicantId
    }

    if (!prop) throw new Error('expected "checkId", "applicantId" or "externalApplicantId"')

    return collect(index.createReadStream({
      start: prop,
      end: prop + '\xff',
      keys: opts.keys || false
    }))
  }

  return {
    get: get,
    create: create,
    update: update,
    list: listReports
  }
}
