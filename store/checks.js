
const typeforce = require('typeforce')
const request = require('superagent')
const collect = Promise.promisify(require('stream-collector'))
const secondary = require('level-secondary')
const { Promise, co, sub, omit } = require('./utils')
const types = require('./types')

module.exports = function createChecksStore ({ db, reports }) {
  const checks = sub(db, 'c')
  checks.byApplicantId = secondary(checks, 'applicantId')

  promisify(checks)

  const putCheck = co(function* putCheck (applicantId, check) {
    check.applicantId = applicantId
    yield checks.promise.put(check.id, check)
    return check
  })

  const putChecks = co(function* putChecks (check) {
    const neutered = checks.map(check => omit(check, ['reports']))
    const checksBatch = checks.map(check => {
      return { type: 'put', key: check.id, value: check }
    })

    yield checks.promise.batch(checksBatch)
    // return stored value
    return neutered
  })

  function listShallow (applicantId) {
    const stream = checks.byApplicantId.createReadStream({
      start: applicantId,
      end: applicantId,
      keys: false
    })

    return collect(stream)
  }

  const listChecks = co(*function listChecks (applicantId, opts={}) {
    const savedChecks = yield listShallow(applicantId)
    if (opts.values === false) return savedChecks

    const reportSets = Promise.all(savedChecks.map(check => {
      return reports.list({ checkId: data.id })
    }))

    savedChecks.forEach(function (check, i) {
      check.reports = reportSets[i]
    })

    return savedChecks
  })

  const getCheck = co(function* getCheck (checkId) {
    const check = yield checks.promise.get(checkId)
    check.reports = yield reports.list({ checkId: data.id })
    return check
  })

  const update = co(function* update (checks) {
    const arr = [].concat(checks)
    const saved = yield Promise.all(arr.map(check => checks.promise.get(check.id)))
    arr.forEach(function (update, i) {
      deepExtend(saved[i], update)
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

  return clone(checkAPI, {
    list: listChecks,
    get: getCheck,
    update: update,
    create: putCheck
  })

  // return {
  //   list: checkAPI,
  //   get: getCheck,
  //   update: update,
  //   check: checkAPI
  // }
}
