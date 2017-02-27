
const crypto = require('crypto')
const typeforce = require('typeforce')
const request = require('superagent')
const { Promise, co, omit, getter, poster, collect } = require('./utils')
const types = require('./types')
const BASE_URL = 'https://api.onfido.com/v2/webhooks'
const ALL_EVENTS = [
  'report.completed',
  'report.withdrawn',
  'check.completed',
  'check.started',
  'check.form_opened',
  'check.form_completed'
]

module.exports = function createHooksAPI ({ token }) {
  typeforce(typeforce.String, token)

  const getUrl = getter(token)
  const post = poster(token)
  const get = co(function* get (hookId, fetch=false) {
    typeforce(typeforce.String, hookId)
    return getUrl(`${BASE_URL}/${hookId}`)
  })

  const list = co(function* list (fetch=false) {
    typeforce(typeforce.maybe(typeforce.Boolean, fetch))
    return getUrl(BASE_URL)
  })

  const register = co(function* register ({ url, events=ALL_EVENTS }) {
    typeforce(typeforce.String, url)
    typeforce(typeforce.arrayOf(types.webhookEvent), events)

    return yield post({
      url: BASE_URL,
      data: { url, events, enabled: true }
    })
  })

  const unregister = co(function* unregister (url) {
    typeforce(typeforce.String, url)
    return yield post({
      url: BASE_URL,
      data: { url, enabled: false }
    })
  })

  const handleEvent = co(function* handleEvent (req, webhookToken) {
    typeforce(typeforce.Object, req)
    typeforce(typeforce.String, webhookToken)

    // report  report.completed
    // report  report.withdrawn
    // check check.started
    // check check.completed
    // check check.form_opened
    // check check.form_completed
    return new Promise((resolve, reject) => {
      const chunks = []
      const hash = req.headers['x-signature']
      const hmac = crypto.createHmac('sha1', webhookToken)
      req.on('data', function (data) {
        chunks.push(data)
      })

      req.on('end', function () {
        let body = Buffer.concat(chunks)
        const expected = hmac.update(body).digest('hex')
        if (expected !== hash) {
          return reject(new Error('received invalid HMAC digest'))
        }

        try {
          body = JSON.parse(body)
        } catch (err) {
          return reject(err)
        }

        resolve(body.payload)
      })
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
