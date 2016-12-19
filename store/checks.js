
const typeforce = require('typeforce')
const request = require('superagent')
const {
  Promise,
  co,
  sub,
  omit,
  collect,
  allSettledResults,
  secondary,
  deepExtend
} = require('../utils')
const promisify = Promise.promisifyAll
const types = require('../types')
const {
  applicantIdProp,
  externalApplicantIdProp,
  externalDocIdProp,
  checkIdProp
} = require('../constants')

const hasApplicantLinks = typeforce.compile({
  [applicantIdProp]: typeforce.String,
  [externalApplicantIdProp]: typeforce.String
})

module.exports = function createChecksStore (opts) {
  typeforce({
    db: typeforce.Object,
    reports: typeforce.Object
  }, opts)

  const { db, reports } = opts
  const checksDB = sub(db, 'c')
  checksDB.byApplicantId = secondary(checksDB, applicantIdProp)
  checksDB.byExternalApplicantId = secondary(checksDB, externalApplicantIdProp)

  promisify(checksDB)

  const create = co(function* create (checks) {
    const result = yield putChecks([].concat(checks))
    return Array.isArray(checks) ? result : result[0]
  })

  const putChecks = co(function* putChecks (checks) {
    typeforce(typeforce.arrayOf(hasApplicantLinks), checks)

    const checksBatch = checks
      .map(check => omit(check, ['reports']))
      .map(check => {
        return { type: 'put', key: check.id, value: check }
      })

    const reportObjs = checks.reduce(function (reports, check) {
      if (!check.reports) return reports

      check.reports.forEach(r => {
        r[externalApplicantIdProp] = check[externalApplicantIdProp]
        r[applicantIdProp] = check[applicantIdProp]
        r[checkIdProp] = check.id
      })

      return reports.concat(check.reports)
    }, [])

    yield Promise.all([
      checksDB.batchAsync(checksBatch),
      reports.update(reportObjs)
    ])

    return checks
  })

  function listShallow (applicantId) {
    const stream = checksDB.byApplicantId.createReadStream({
      start: applicantId,
      end: applicantId + '\xff',
      keys: false
    })

    return collect(stream)
  }

  const listChecks = co(function* listChecks (applicantId, opts={}) {
    const savedChecks = yield listShallow(applicantId)
    if (opts.values === false) return savedChecks

    const reportSets = yield Promise.all(savedChecks.map(check => {
      return reports.list({ checkId: check.id })
    }))

    savedChecks.forEach(function (check, i) {
      check.reports = reportSets[i]
    })

    return savedChecks
  })

  const getCheck = co(function* getCheck (checkId) {
    const check = yield checksDB.getAsync(checkId)
    check.reports = yield reports.list({ checkId: check.id })
    return check
  })

  const update = co(function* update (checks) {
    const arr = [].concat(checks)
    const saved = yield allSettledResults(arr.map(check => checksDB.getAsync(check.id)))
    arr.forEach(function (update, i) {
      if (saved[i]) {
        deepExtend(saved[i], update)
      } else {
        typeforce(hasApplicantLinks, update)
        saved[i] = update
      }
    })

    const result = yield putChecks(saved)
    return Array.isArray(checks) ? result : result[0]
  })

  // function checkAPI (checkId) {
  //   return {
  //     get: getCheck.bind(null, checkId),
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
    list: listChecks,
    get: getCheck,
    update: update,
    create: create
  }
}
