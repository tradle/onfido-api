
const crypto = require('crypto')
const typeforce = require('typeforce')
const request = require('superagent')
const extend = require('xtend/mutable')
const collect = Promise.promisify(require('stream-collector'))
const secondary = require('level-secondary')
const { Promise, co, sub, omit, setPromiseInterface, allSettled } = require('./utils')
const types = require('./types')

module.exports = function createHooksAPI ({ db, token, applicants, checks, reports }) {
  setPromiseInterface(db)

  function putHooks (hooks) {
    const batch = [].concat(hooks).map(hook => {
      return { type: 'put', key: hook.id, value: hook }
    })

    yield db.promise.batch(batch)
    return hooks
  }

  const create = hook => db.promise.put(hook.id, hook)
  const get = hookId => db.promise.get(hookId)

  const list = co(function* list () {
    return collect(db.promise.createReadStream({ keys: false }))
  })

  const update = co(function* update (hooks) {
    const arr = [].concat(hooks)
    const saved = allSettled(arr.map(get))
    const updated = saved.map((r, i) => {
      if (r.value) {
        return deepExtend(r.value, arr[i])
      } else {
        return arr[i]
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
