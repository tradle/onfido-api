
const stores = require('./store')
const apis = require('./api')
const createApplicantsAPI = require('./applicants')
const createChecksAPI = require('./checks')
const createWebhooksAPI = require('./webhooks')
const createReportTypeGroupsAPI = require('./reportTypeGroups')
const { sub, Promise } = require('./utils')

module.exports = function ({ db, idProp }) {
  const applicantsDB = sub(db, 'a')
  const checksDB = sub(db, 'c')
  const reportsDB = sub(db, 'r')
  const webhooksDB = sub(db, 'w')

  const applicantParts = {
    api: apis.applicants({ token }),
    store: stores.applicants({ db: applicantsDB })
  }

  const applicants = createApplicantsAPI(applicantParts)

  const checks = createChecksAPI({
    api: apis.checks({ token }),
    store: stores.checks({ db: checksDB }),
    applicants: applicantParts
  })

  const reports = {
    api: apis.reports({ token }),
    store: stores.reports({ db: reportsDB }),
    applicants: applicantParts
  }

  const webhooks = {
    api: apis.webhooks({ token }),
    store: stores.webhooks({ db: webhooksDB })
  }

  return {
    applicants,
    checks,
    reports,
    webhooks,
    // reportTypeGroups: createReportTypeGroupsAPI({ onfido })
  }
}
