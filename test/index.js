
const test = require('tape')
const memdb = require('memdb')
const mock = require('superagent-mocker')(require('superagent'))
const { Promise, co, omit, pick, shallowClone } = require('../lib/utils')
const apis = require('../')
const fixtures = require('./fixtures')
sortById(fixtures.applicants)
sortById(fixtures.checks)
fixtures.checks.forEach(check => sortById(check.reports))
sortById(fixtures.reports)

test('report api', co(function* (t) {
  const token = 'something'
  const [check] = fixtures.checks
  const [report] = check.reports
  // const reports = check.reports
  const api = apis.reports({ token })
  let params = { reportId: report.id, checkId: check.id }
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

  params = { checkId: check.id }
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
        reports: check.reports
      }
    }
  })

  result = yield api.list(params)
  t.same(result.reports, check.reports)
  t.end()
}))

test('check api', co(function* (t) {
  const token = 'something'
  const [check] = fixtures.checks
  const api = apis.checks({ token })
  const applicantId = check.href.match(/applicants\/(.*?)\/checks/)[1]
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
  const applicant = fixtures.applicants.find(applicant => applicant.email != null)
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
        applicants: fixtures.applicants
      }
    }
  })

  result = yield api.list()
  t.same(result, fixtures.applicants)

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

// test.only('end to end', co(function* (t) {
//   const { applicants, checks, reports } = createClient({
//     db: memdb(),
//     token: 'something'
//   })

//   const [applicant] = fixtures.applicants
//   mock.post('https://api.onfido.com/v2/applicants', req => {
//     return {
//       ok: true,
//       body: neuter(applicant)
//     }
//   })

//   const applicant = yield applicants.create('billy', {
//     first_name: 'billy',
//     last_name: 'flynn',
//     email: 'billyflynn@flynns.farm'
//   })

//   const stored = yield applicants.get('billy')
//   t.same(stored, applicant)
// }))

function sortById (itemsWithIds) {
  return itemsWithIds.sort(function (a, b) {
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })
}

function neuter (obj) {
  const copy = shallowClone(obj)
  // delete copy[externalApplicantIdProp]
  // delete copy[applicantIdProp]
  // delete copy[externalDocIdProp]
  // delete copy[checkIdProp]
  return copy
}
