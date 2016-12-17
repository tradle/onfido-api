const typeforce = require('typeforce')
const request = require('superagent')
const deepExtend = require('deep-extend')
const collect = Promise.promisify(require('stream-collector'))
const secondary = require('level-secondary')
const { Promise, co, sub, omit } = require('./utils')
const types = require('./types')

module.exports = function createReportsAPI ({ db, onfido, applicants, token }) {
  db = sub(db, 'r')
  db.byApplicantId = secondary(db, 'applicantId')
  db.byCheckId = secondary(db, 'checkId')
  promisify(db)

  const update = co(function* update (reports) {
    const arr = [].concat(reports)
    const saved = yield Promise.all(arr.map(r => db.promise.get(r.id)))
    yield save(arr.map(report => {
      return deepExtend(saved, report)
    }))

    return reports
  })

  function create (reports) {
    [].concat(reports).forEach(r => {
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

  function listReports ({ checkId, applicantId }, opts={}) {
    const prop = checkId || applicantId
    const index = checkId ? db.byCheckId : db.applicantId
    return collect(index.createReadStream({
      start: prop,
      end: prop,
      keys: opts.keys || false
    }))
  }

  return {
    create: create,
    update: update,
    list: listReports
  }
