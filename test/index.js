
const test = require('tape')
const memdb = require('memdb')
const mock = require('superagent-mocker')(require('superagent'))
const { Promise, co, omit, pick, shallowClone } = require('../utils')
const { applicantIdProp, externalApplicantIdProp, checkIdProp } = require('../constants')
const stores = require('../store')
const apis= require('../api')
const fixtures = require('./fixtures')
sortById(fixtures.applicants)
sortById(fixtures.checks)
fixtures.checks.forEach(check => sortById(check.reports))
sortById(fixtures.reports)

test('report store', co(function* (t) {
  const db = memdb()
  const store = stores.reports({ db })

  yield Promise.all(fixtures.reports.map(store.create))
  const [report] = fixtures.reports
  const saved = yield store.get(report.id)
  t.same(saved, report)

  // TODO: improve fixtures to have different reports from different checks from different applicants
  let all = yield store.list({ checkId: report[checkIdProp] })
  t.same(all, fixtures.reports)

  all = yield store.list({ applicantId: report[applicantIdProp] })
  t.same(all, fixtures.reports)

  all = yield store.list({ externalApplicantId: report[externalApplicantIdProp] })
  t.same(all, fixtures.reports)

  const updates = fixtures.reports.map(r => {
    return shallowClone(r, { status: 'completed' })
  })

  yield store.update(updates)
  all = yield store.list({ externalApplicantId: report[externalApplicantIdProp] })
  t.ok(all.every(r => r.status === 'completed'))

  t.end()
}))

test('check store', co(function* (t) {
  const db = memdb()
  const reports = stores.reports({ db })
  const checks = stores.checks({ db, reports })

  const [check] = fixtures.checks
  const applicantId = check[applicantIdProp]

  yield checks.create(fixtures.checks)
  const saved = yield checks.get(check.id)
  sortById(saved.reports)
  t.same(saved, check)

  let all = yield checks.list(applicantId)
  t.same(all, fixtures.checks.filter(c => c[applicantIdProp] === applicantId))

  const updates = fixtures.checks.map(c => {
    return shallowClone(c, {
      reports: c.reports.map(r => {
        return shallowClone(r, { status: 'completed' })
      })
    })
  })

  yield checks.update(updates)
  all = yield checks.list(applicantId)
  t.ok(all.every(c => c.reports.every(r => r.status === 'completed')))

  t.end()
}))

test('applicant store', co(function* (t) {
  const db = memdb()
  const store = stores.applicants({ db })

  yield Promise.all(fixtures.applicants.map(store.create))

  const [first] = fixtures.applicants
  const saved = yield store.get(first[externalApplicantIdProp])
  t.same(saved, first)

  let all = yield store.list()
  sortById(all)

  t.same(all, fixtures.applicants)

  const updates = fixtures.applicants.map(a => {
    return shallowClone(a, { first_name: 'doofus' })
  })

  yield store.update(updates)
  all = yield store.list()
  t.ok(all.every(a => a.first_name === 'doofus'))

  t.end()
}))

test.skip('webhook store', co(function* (t) {
  const db = memdb()
  const webhooks = stores.webhooks({ db })

  yield Promise.all(fixtures.webhooks.map(webhooks.create))

  const [first] = fixtures.webhooks
  const saved = yield webhooks.get(first.id)
  t.same(saved, first)

  const all = yield webhooks.list()
  sortById(all)

  t.same(all, fixtures.webhooks)
  t.end()
}))

test('report api', co(function* (t) {
  const token = 'something'
  const [report] = fixtures.reports
  const api = apis.reports({ token })
  let params = { reportId: report.id, checkId: report[checkIdProp] }
  mock.get('https://api.onfido.com/v2/checks/:checkId/reports/:reportId', req => {
    t.same(req.params, params)
    t.same(req.headers, {
      accept: 'application/json',
      authorization: `Token token=${token}`
    })

    t.same(req.body, {})
    t.same(req.query, {})
    return {
      ok: true,
      body: report
    }
  })

  let result = yield api.get(params)
  t.same(result, report)

  params = { checkId: report[checkIdProp] }
  mock.get('https://api.onfido.com/v2/checks/:checkId/reports', req => {
    t.same(req.params, params)
    t.same(req.headers, {
      accept: 'application/json',
      authorization: `Token token=${token}`
    })

    t.same(req.body, {})
    t.same(req.query, {})
    return {
      ok: true,
      body: {
        reports: fixtures.reports
      }
    }
  })

  result = yield api.list(params)
  t.same(result.reports, fixtures.reports)
  t.end()
}))

test('check api', co(function* (t) {
  const token = 'something'
  const [check] = fixtures.checks
  const api = apis.checks({ token })
  const applicantId = check[applicantIdProp]
  const checkId = check.id

  // get
  mock.get('https://api.onfido.com/v2/applicants/:applicantId/checks/:checkId', req => {
    t.same(req.params, { applicantId, checkId })
    t.same(req.headers, {
      accept: 'application/json',
      authorization: `Token token=${token}`
    })

    t.same(req.body, {})
    t.same(req.query, {})
    return {
      ok: true,
      body: check
    }
  })

  let result = yield api.get({ applicantId, checkId })
  t.same(result, check)

  // list
  mock.get('https://api.onfido.com/v2/applicants/:applicantId/checks?expand=reports', req => {
    t.same(req.params, { applicantId })
    t.same(req.headers, {
      accept: 'application/json',
      authorization: `Token token=${token}`
    })

    t.same(req.body, {})
    t.equal(req.url, `https://api.onfido.com/v2/applicants/${applicantId}/checks?expand=reports`)
    return {
      ok: true,
      body: {
        checks: fixtures.checks
      }
    }
  })

  result = yield api.list({ applicantId, expandReports: true })
  t.same(result.checks, fixtures.checks)

  // create document check
  mock.post('https://api.onfido.com/v2/applicants/:applicantId/checks', req => {
    t.same(req.params, { applicantId })
    t.same(req.headers, {
      accept: 'application/json',
      authorization: `Token token=${token}`,
      'content-type': 'application/x-www-form-urlencoded'
    })

    t.same(req.body, { reports: [ 'document' ], type: 'express' })
    return {
      ok: true,
      body: check
    }
  })

  result = yield api.createDocumentCheck(applicantId)
  t.same(result, check)

  // create face check
  mock.post('https://api.onfido.com/v2/applicants/:applicantId/checks', req => {
    t.same(req.params, { applicantId })
    t.same(req.headers, {
      accept: 'application/json',
      authorization: `Token token=${token}`,
      'content-type': 'application/x-www-form-urlencoded'
    })

    t.same(req.body, { reports: [ 'facial_similarity' ], type: 'express' })
    return {
      ok: true,
      body: check
    }
  })

  // yes, we're returning the same check over and over
  // this is just to test whether the api returns it correctly

  result = yield api.createFaceCheck(applicantId)
  t.same(result, check)

  t.end()
}))

test('applicant api', co(function* (t) {
  const token = 'something'
  const neutered = fixtures.applicants.map(applicant => omit(applicant, [externalApplicantIdProp]))
  const applicant = neutered.find(applicant => applicant.email != null)
  const api = apis.applicants({ token })
  const applicantId = applicant.id

  // get
  mock.get('https://api.onfido.com/v2/applicants/:applicantId', req => {
    t.same(req.params, { applicantId })
    t.same(req.headers, {
      accept: 'application/json',
      authorization: `Token token=${token}`
    })

    t.same(req.body, {})
    t.same(req.query, {})
    return {
      ok: true,
      body: applicant
    }
  })

  let result = yield api.get(applicantId)
  t.same(result, applicant)

  // list
  mock.get('https://api.onfido.com/v2/applicants', req => {
    t.same(req.params, {})
    t.same(req.headers, {
      accept: 'application/json',
      authorization: `Token token=${token}`
    })

    t.same(req.body, {})
    t.same(req.query, {})
    return {
      ok: true,
      body: {
        applicants: neutered
      }
    }
  })

  result = yield api.list()
  t.same(result, neutered)

  // create
  let reqBody = pick(applicant, ['first_name', 'last_name', 'email'])
  mock.post('https://api.onfido.com/v2/applicants', req => {
    t.same(req.params, {})
    t.same(req.headers, {
      accept: 'application/json',
      authorization: `Token token=${token}`,
      'content-type': 'application/x-www-form-urlencoded'
    })

    t.same(req.body, reqBody)
    t.same(req.query, {})
    return {
      ok: true,
      body: applicant
    }
  })

  result = yield api.create(reqBody)
  t.same(result, applicant)

  // update
  reqBody = { email: 'blah@blah.com' }
  let updated = shallowClone(applicant, reqBody)
  mock.post('https://api.onfido.com/v2/applicants/:applicantId', req => {
    t.same(req.params, { applicantId: applicant.id })
    t.same(req.headers, {
      accept: 'application/json',
      authorization: `Token token=${token}`,
      'content-type': 'application/x-www-form-urlencoded'
    })

    t.same(req.body, reqBody)
    t.same(req.query, {})
    return {
      ok: true,
      body: updated
    }
  })

  result = yield api.update(applicant.id, reqBody)
  t.same(result, updated)

  // upload document
  const [doc] = fixtures.documents
  mock.post('https://api.onfido.com/v2/applicants/:applicantId/documents', req => {
    t.same(req.params, { applicantId: applicant.id })
    t.same(req.headers, {
      accept: 'application/json',
      authorization: `Token token=${token}`,
      'content-type': 'application/x-www-form-urlencoded'
    })

    t.same(req.body, { type: 'passport' })
    t.same(req.query, {})
    return {
      ok: true,
      body: doc
    }
  })

  result = yield api.uploadDocument(applicant.id, {
    file: new Buffer('some image'),
    type: 'passport'
  })

  t.same(result, doc)

  // upload live photo
  const [photo] = fixtures.documents
  mock.post('https://api.onfido.com/v2/live_photos', req => {
    t.same(req.params, {})
    t.same(req.headers, {
      accept: 'application/json',
      authorization: `Token token=${token}`,
      'content-type': 'application/x-www-form-urlencoded'
    })

    t.same(req.body, { applicant_id: applicantId })
    t.same(req.query, {})
    return {
      ok: true,
      body: doc
    }
  })

  result = yield api.uploadLivePhoto(applicant.id, {
    file: new Buffer('some image')
  })

  t.same(result, doc)
  t.end()
}))

function sortById (itemsWithIds) {
  return itemsWithIds.sort(function (a, b) {
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })
}
