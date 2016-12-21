
const crypto = require('crypto')
const typeforce = require('typeforce')
const request = require('superagent')
const extend = require('xtend/mutable')
const secondary = require('level-secondary')
const { Promise, co, sub, omit, collect } = require('./utils')
const types = require('./types')
const BASE_URL = 'https://api.onfido.com/v2/webhooks'

module.exports = function createHooksAPI ({ api, store }) {

  const get = co(function* (hookId, opts={}) {
    if (!opts.fetch) return store.get(hookId)

    const hook = yield api.get(hookId)
    return yield store.update(hook)
  })

  const list = co(function* (opts={}) {
    if (!opts.fetch) return store.list()

    const hooks = yield api.list()
    return yield store.update(hooks)
  })

  const register = co(function* (opts) {
    const hook = yield api.register(opts)
    yield store.create(hook)
    return hook
  })

  const unregister = co(function* (opts) {
    const hook = yield api.unregister(opts)
    yield store.update(hook)
    return hook
  })

  // const handleEvent = co(function* handleEvent (req) {
  //   // report  report.completed
  //   // report  report.withdrawn
  //   // check check.started
  //   // check check.completed
  //   // check check.form_opened
  //   // check check.form_completed
  //   const event = yield new Promise(function (resolve, reject) {
  //     let body = ''
  //     const hash = req.headers['X-Signature']
  //     const hmac = crypto.createHmac('sha1', token)
  //     req.on('data', function (data) {
  //       body += data
  //       hmac.update(data)
  //     })

  //     req.on('end', function () {
  //       if (hmac.digest('hex') !== hash) {
  //         return reject(new Error('received invalid HMAC digest'))
  //       }
  //     })

  //     try {
  //       body = JSON.parse(body)
  //     } catch (err) {
  //       return reject(err)
  //     }

  //     resolve(body)
  //   })

  //   const { resource_type, action, object } = event
  //   let fullObject
  //   switch (resource_type) {
  //   case 'report':
  //     fullObject = yield reports.update(object)
  //     break
  //   case 'check':
  //     fullObject = yield checks.update(object)
  //     break
  //   }

  //   return {
  //     resource_type,
  //     action: action.split('.').pop(),
  //     object: fullObject
  //   }
  // })

  return {
    get,
    list,
    register,
    unregister,
    handleEvent
  }
}
