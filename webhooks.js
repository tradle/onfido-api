
const typeforce = require('typeforce')
const superagent = require('request')
const collect = Promise.promisify(require('stream-collector'))
const secondary = require('level-secondary')
const { Promise, co, sub, omit } = require('./utils')
const types = require('./types')
const BASE_URL = 'https://api.onfido.com/v2/webhooks'

module.exports = function createHooksAPI ({ db, token }) {
  db.promise = Promise.promisifyAll(db)

  return {
    get,
    list,
    register,
    unregister
  }

  function putHooks (hooks) {
    const batch = [].concat(hooks).map(hook => {
      return { type: 'put', key: hook.id, value: hook }
    })

    yield db.promise.batch(batch)
    return hooks
  }

  const get = co(function* get (hookId, fetch=false) {
    if (fetch) {
      const result = yield request
        .get(`${BASE_URL}/${hookId}`)
        .set('Authorization', 'Token token=' + token)
        .send()

      return putHooks(result)
    }

    return db.promise.get(hookId)
  })

  const list = co(function* list (fetch=false) {
    if (fetch) {
      const result = yield request
        .get(BASE_URL)
        .set('Authorization', 'Token token=' + token)
        .send()

      return yield putHooks(result)
    }

    return collect(db.promise.createReadStream({ keys: false }))
  })

  const register = co(function* register ({ url, events=[] }) {
    typeforce(typeforce.arrayOf(types.webhookEvent), events)

    const opts = { url }
    if (events.length) opts.events = events

    const result = yield request
      .post(BASE_URL)
      .set('Authorization', 'Token token=' + token)
      .send()

    return yield putHooks(result)
  })

  const unregister = co(function* unregister (url) {
    const result = yield request
      .post(BASE_URL)
      .set('Authorization', 'Token token=' + token)
      .send({ url, enabled: false })

    return yield putHooks(result)
  })
}
