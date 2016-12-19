
const crypto = require('crypto')
const typeforce = require('typeforce')
const request = require('superagent')
const extend = require('xtend/mutable')
const secondary = require('level-secondary')
const { Promise, co, sub, omit, getter, authRequest, collect } = require('../utils')
const types = require('../types')
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

  return {
    get,
    list,
    register,
    unregister
  }
}
