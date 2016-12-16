
const crypto = require('crypto')
const typeforce = require('typeforce')
const request = require('superagent')
const extend = require('xtend/mutable')
const collect = Promise.promisify(require('stream-collector'))
const secondary = require('level-secondary')
const { Promise, co, sub, omit } = require('./utils')
const types = require('./types')
const BASE_URL = 'https://api.onfido.com/v2/webhooks'

module.exports = function createHooksAPI ({ db, token, applicants, checks, reports }) {
  db.promise = Promise.promisifyAll(db)

  // const ee = new EventEmitter()
  // return extend(ee, {
  return {
    get,
    list,
    register,
    unregister,
    handleEvent
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

  const handleEvent = co(function* handleEvent (req) {
    // report  report.completed
    // report  report.withdrawn
    // check check.started
    // check check.completed
    // check check.form_opened
    // check check.form_completed
    const event = yield new Promise(function (resolve, reject) {
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

    const { resource_type, action, object } = event
    let fullObject
    switch (resource_type) {
    case 'report':
      fullObject = yield reports.update(object)
      break
    case 'check'
      fullObject = yield checks.update(object)
      break
    }

    return {
      resource_type,
      action: action.split('.').pop(),
      object: fullObject
    }
  })
}
