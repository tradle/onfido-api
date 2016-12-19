const typeforce = require('typeforce')
const request = require('superagent')
const deepExtend = require('deep-extend')
const collect = Promise.promisify(require('stream-collector'))
const secondary = require('level-secondary')
const { Promise, co, sub, omit } = require('./utils')
const {
  externalApplicantIdProp,
  applicantIdProp,
  checkIdProp
} = require('./constants')
const types = require('./types')
const hasRequiredLinks = typeforce.compile({
  [applicantIdProp]: typeforce.String,
  [externalApplicantIdProp]: typeforce.String,
  [checkIdProp]: typeforce.String
})

module.exports = function createReportsAPI ({ db, onfido, applicants, token }) {
  db = sub(db, 'r')
  db.byApplicantId = secondary(db, applicantIdProp)
  db.byExternalApplicantId = secondary(db, externalApplicantIdProp)
  db.byCheckId = secondary(db, checkIdProp)
  promisify(db)

  const update = co(function* update (reports) {
    const arr = [].concat(reports)
    const saved = yield Promise.all(arr.map(r => db.promise.get(r.id)))
    yield save(arr.map(report => {
      return deepExtend(saved, report)
    }))

    return reports
  })

  function get (reportId) {
    typeforce(typeforce.arrayOf(hasRequiredLinks), reports)
    return db.promise.get(reportId)
  }

  function create (reports) {
    typeforce(typeforce.arrayOf(hasRequiredLinks), reports)
    return save({ reports })
  }

  function save (reports) {
    return db.promise.batch(reports.map(report => {
      return { type: 'put', key: report.id, value: report }
    }))
  }

  function listReports ({ checkId, applicantId, externalApplicantId }, opts={}) {
    let prop, index
    if (checkId) {
      prop = checkId
      index = db.byCheckId
    } else if (externalApplicantId) {
      prop = externalApplicantId,
      index = byExternalApplicantId
    } else {
      prop = applicantId,
      index = byApplicantId
    }

    return collect(index.createReadStream({
      start: prop,
      end: prop,
      keys: opts.keys || false
    }))
  }

  return {
    get: get,
    create: create,
    update: update,
    list: listReports
  }
