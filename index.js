
const Onfido = require('onfido')
const createApplicantsAPI = require('./applicants')
const createChecksAPI = require('./checks')
const createWebhooksAPI = require('./webhooks')
const createReportTypeGroupsAPI = require('./reportTypeGroups')
const { sub, Promise } = require('./utils')
const defaultClient = Onfido.ApiClient.instance

// Configure API key authorization: Token
const Token = defaultClient.authentications['Token']
Token.apiKey = "YOUR API KEY"
// Uncomment the following line to set a prefix for the API key, e.g. "Token" (defaults to null)
//Token.apiKeyPrefix['Authorization'] = "Token"

const rawApi = new Onfido.DefaultApi()
const onfido = Promise.promisifyAll(rawApi)

module.exports = function ({ db, idProp }) {
  const applicantsDB = sub(db, 'a')
  const checksDB = sub(db, 'c')
  const webhooksDB = sub(db, 'w')

  const applicantsAPI = createApplicantsAPI({
    db: applicantsDB,
    onfido,
    token,
    idProp
  })

  const checksAPI = createChecksAPI({
    db: checksDB,
    applicants: applicantsAPI,
    onfido,
    token
  })

  const webhooksAPI = createWebhooksAPI({
    db: webhooksDB,
    onfido,
    token
  })

  return {
    applicants: applicantsAPI,
    checks: checksAPI,
    webhooks: webhooksAPI,
    reportTypeGroups: createReportTypeGroupsAPI({ onfido })
  }
}
