
const crypto = require('crypto')
const typeforce = require('typeforce')
const request = require('superagent')
const extend = require('xtend/mutable')
const collect = Promise.promisify(require('stream-collector'))
const secondary = require('level-secondary')
const { Promise, co, sub, omit, baseRequest } = require('./utils')
const types = require('./types')
const BASE_URL = 'https://api.onfido.com/v2/webhooks'

module.exports = function createHooksAPI ({ token }) {
  const request = baseRequest(token)
  const get = co(function* get (hookId, fetch=false) {
    return yield request
      .get(`${BASE_URL}/${hookId}`)
      .send()
  })

  const list = co(function* list (fetch=false) {
    return yield request
      .get(BASE_URL)
      .send()
  })

  const register = co(function* register ({ url, events=[] }) {
    typeforce(typeforce.arrayOf(types.webhookEvent), events)

    const opts = { url }
    if (events.length) opts.events = events

    return yield request
      .post(BASE_URL)
      .send()
  })

  const unregister = co(function* unregister (url) {
    return yield request
      .post(BASE_URL)
      .send({ url, enabled: false })
  })

  return {
    get,
    list,
    register,
    unregister
  }
}
