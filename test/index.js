
const test = require('tape')
const memdb = require('memdb')
const { Promise, co, omit } = require('../utils')
const { applicantIdProp, externalApplicantIdProp, checkIdProp } = require('../constants')
const store = require('../store')
const fixtures = require('./fixtures')

test('report store', co(function* (t) {
  const db = memdb()
  const reports = store.reports({ db })

  sort(fixtures.reports)
  yield Promise.all(fixtures.reports.map(reports.create))
  const [report] = fixtures.reports
  const saved = yield reports.get(report.id)
  t.same(saved, report)

  // TODO: improve fixtures to have different reports from different checks from different applicants
  let all = yield reports.list({ checkId: report[checkIdProp] })
  t.same(all, fixtures.reports)

  all = yield reports.list({ applicantId: report[applicantIdProp] })
  t.same(all, fixtures.reports)

  all = yield reports.list({ externalApplicantId: report[externalApplicantIdProp] })
  t.same(all, fixtures.reports)

  t.end()
}))

test('check store', co(function* (t) {
  const db = memdb()
  const reports = store.reports({ db })
  const checks = store.checks({ db, reports })

  const [check] = fixtures.checks
  sort(check.reports)

  yield checks.create(check)
  const saved = yield checks.get(check.id)
  sort(saved.reports)
  t.same(saved, check)

  const all = yield checks.list(check[applicantIdProp])
  t.same(all, [check])
  t.end()
}))

test('applicant store', co(function* (t) {
  const db = memdb()
  const applicants = store.applicants({ db })

  sort(fixtures.applicants)
  yield Promise.all(fixtures.applicants.map(applicants.create))

  const [first] = fixtures.applicants
  const saved = yield applicants.get(first[externalApplicantIdProp])
  t.same(saved, first)

  const all = yield applicants.list()
  sort(all)

  t.same(all, fixtures.applicants)
  t.end()
}))

test.skip('webhooks store', co(function* (t) {
  const db = memdb()
  const webhooks = store.webhooks({ db })

  sort(fixtures.webhooks)
  yield Promise.all(fixtures.webhooks.map(webhooks.create))

  const [first] = fixtures.webhooks
  const saved = yield webhooks.get(first.id)
  t.same(saved, first)

  const all = yield webhooks.list()
  sort(all)

  t.same(all, fixtures.webhooks)
  t.end()
}))

function sort (reports) {
  return reports.sort(function (a, b) {
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })
}
