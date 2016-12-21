
const stores = require('./store')
const apis = require('./api')
const createApplicantsAPI = require('./applicants')
const createChecksAPI = require('./checks')
const createWebhooksAPI = require('./webhooks')
const createReportsAPI = require('./reports')
const createReportTypeGroupsAPI = require('./reportTypeGroups')
const { sub, Promise } = require('./utils')

module.exports = function ({ db, token }) {
  if (!token) throw new Error('expected "token"')

  const applicantsDB = sub(db, 'a')
  const checksDB = sub(db, 'c')
  const reportsDB = sub(db, 'r')
  const webhooksDB = sub(db, 'w')

  const applicantComponents = {
    api: apis.applicants({ token }),
    store: stores.applicants({ db: applicantsDB })
  }

  const applicants = createApplicantsAPI(applicantComponents)

  const reportComponents = {
    api: apis.reports({ token }),
    store: stores.reports({ db: reportsDB }),
    applicants: applicantComponents
  }

  const reports = createReportsAPI(reportComponents)

  const checks = createChecksAPI({
    api: apis.checks({ token }),
    store: stores.checks({ db: checksDB, reports: reportComponents.store }),
    applicants: applicantComponents
  })

  const webhooks = createWebhooksAPI({
    api: apis.webhooks({ token }),
    store: stores.webhooks({ db: webhooksDB })
  })

  const reportTypeGroups = createReportTypeGroupsAPI({ token })
  return {
    applicants,
    checks,
    reports,
    webhooks,
    reportTypeGroups
  }
}
