
const Onfido = require('onfido')
const Applicants = require('./applicants')
const Checks = require('./checks')
const Reports = require('./reports')
const { sub, Promise } = require('./utils')
const defaultClient = Onfido.ApiClient.instance

// Configure API key authorization: Token
const Token = defaultClient.authentications['Token']
Token.apiKey = "YOUR API KEY"
// Uncomment the following line to set a prefix for the API key, e.g. "Token" (defaults to null)
//Token.apiKeyPrefix['Authorization'] = "Token"

const rawApi = new Onfido.DefaultApi()
const onfido = Promise.promisifyAll(rawApi)

module.exports = function ({ db }) {
  const applicants = sub(db, 'a')
  const checks = sub(db, 'c')
  const reports = sub(db, 'r')

  const client = {
    applicants: Applicants({ db: applicants, onfido }),
    checks: Checks({ db: checks, onfido }),
    reports: Reports({ db: reports, onfido })
  }

  return client
}
