
const crypto = require('crypto')
const typeforce = require('typeforce')
const request = require('superagent')
const { Promise, co, sub, omit, getter, authRequest, collect } = require('./utils')
const types = require('./types')
const BASE_URL = 'https://api.onfido.com/v2/webhooks'

module.exports = function createHooksAPI ({ token }) {
  typeforce(typeforce.String, token)

  const getUrl = getter(token)
  const auth = authRequest(token)
  const get = co(function* get (hookId, fetch=false) {
    return getUrl(`${BASE_URL}/${hookId}`)
  })

  const list = co(function* list (fetch=false) {
    return getUrl(BASE_URL)
  })

  const register = co(function* register ({ url, events=[] }) {
    typeforce(typeforce.arrayOf(types.webhookEvent), events)

    const opts = { url }
    if (events.length) opts.events = events

    return yield auth
      .post(BASE_URL)
      .send()
  })

  const unregister = co(function* unregister (url) {
    return yield auth
      .post(BASE_URL)
      .send({ url, enabled: false })
  })

  const handleEvent = co(function* handleEvent (req, res) {
    // report  report.completed
    // report  report.withdrawn
    // check check.started
    // check check.completed
    // check check.form_opened
    // check check.form_completed
    return yield new Promise(function (resolve, reject) {
      let body = ''
      const hash = req.headers['X-Signature']
      const hmac = crypto.createHmac('sha1', token)
      req.on('data', function (data) {
        body += data
        hmac.update(data)
      })

      req.on('end', function () {
        if (hmac.digest('hex') !== hash) {
          return reject(new Error('received invalid HMAC digest'))
        }
      })

      try {
        body = JSON.parse(body)
      } catch (err) {
        return reject(err)
      }

      resolve(body)
    })
  })

  return {
    get,
    list,
    register,
    unregister,
    handleEvent
  }
}
