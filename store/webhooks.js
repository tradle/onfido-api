
const crypto = require('crypto')
const typeforce = require('typeforce')
const request = require('superagent')
const extend = require('xtend/mutable')
const { Promise, co, sub, omit, setPromiseInterface, allSettledResults, collect } = require('../utils')
const promisify = Promise.promisifyAll
const secondary = require('level-secondary')
const types = require('../types')

module.exports = function createHooksStore ({ db }) {
  promisify(db)

  const putHooks = co(function* putHooks (hooks) {
    const batch = [].concat(hooks).map(hook => {
      return { type: 'put', key: hook.id, value: hook }
    })

    yield db.batchAsync(batch)
    return hooks
  })

  const create = hook => db.putAsync(hook.id, hook)
  const get = hookId => db.getAsync(hookId)

  const list = co(function* list () {
    return collect(db.createReadStream({ keys: false }))
  })

  const update = co(function* update (hooks) {
    const updates = [].concat(hooks)
    const saved = allSettledResults(updates.map(get))
    const updated = saved.map(hook => {
      if (hook) {
        return deepExtend(hook, updates[i])
      } else {
        return updates[i]
      }
    })

    return yield putHooks(update)
  })

  return {
    get,
    create,
    list,
    update
  }
}
