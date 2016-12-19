
const request = require('superagent')
const Sublevel = require('level-sublevel')
const secondary = require('level-secondary')
// const subdown = require('subleveldown')
const Promise = require('bluebird')
const omit = require('object.omit')
const co = Promise.coroutine

exports.Promise = Promise
exports.co = co

exports.promisesub = function promisesub (db, prefix) {
  return Promise.promisifyAll(exports.sub(db, prefix))
}

exports.sub = function sub (db, prefix) {
  return Sublevel(db).sublevel(prefix, { valueEncoding: 'json' })
}

exports.omit = omit

exports.promisify = function promisify (obj) {
  obj.promise = Promise.promisifyAll(obj, {})
}

exports.baseRequest = function baseRequest (token) {
  const authenticatedRequest = {}
  ;['get', 'post'].forEach(method => {
    authenticatedRequest[method] = function (url) {
      const req = request[method](url)
        .set('Authorization', 'Token token=' + token)

      if (method === 'post') req.type('form')

      return req
    }
  })

  return authenticatedRequest
}

function allSettled (promises) {
  return Promise.all(promises.map(promise => promise.reflect()))
}

exports.allSettled = allSettled

exports.allSettledResults = co(function* allSettledResults (promises) {
  const results = yield allSettled(promises)
  return results.map(r => r.isFulfilled() ? r.value() : undefined)
})

exports.collect = Promise.promisify(require('stream-collector'))

function errorFromResponse (res) {
  const { text, status } = res
  const err = new Error(text)
  err.status = status
  return err
}

exports.errorFromResponse = errorFromResponse

// exports.getter = function (opts) {
//   return () => exports.get(opts)
// }

exports.get = function ({ url, token }) {
  const req = request
    .get(url)
    .set('Accept', 'application/json')
    .set('Authorization', 'Token token=' + token)

  return sendRequest(req)
}

exports.post = function ({ url, token, data }) {
  const req = request
    .post(url)
    .set('Authorization', 'Token token=' + token)
    .set('Accept', 'application/json')
    .type('form')
    .send(data)

  return sendRequest(req)
}

exports.secondary = function (db, prop) {
  return secondary(db, prop, function (obj) {
    return obj[prop] + '!' + obj.id
  })
}

const sendRequest = co(function* sendRequest (req) {
  let res
  try {
    res = yield req
  } catch (err) {
    throw errorFromResponse(err.response)
  }

  const { ok, body } = res
  if (!ok) {
    throw errorFromResponse(res)
  }

  return body
})
