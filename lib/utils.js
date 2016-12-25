
const typeforce = require('typeforce')
const request = require('superagent')
const Promise = require('bluebird')
const omit = require('object.omit')
const pick = require('object.pick')
const co = Promise.coroutine

exports.Promise = Promise
exports.co = co

exports.extend = require('xtend/mutable')
exports.shallowClone = require('xtend')
exports.deepExtend = require('deep-extend')

exports.omit = omit
exports.pick = pick

exports.promisify = function promisify (obj) {
  obj.promise = Promise.promisifyAll(obj, {})
}

exports.authRequest = function authRequest (token) {
  const authenticatedRequest = {}
  ;['get', 'post', 'del', 'delete', 'head', 'options'].forEach(method => {
    authenticatedRequest[method] = function (url) {
      const req = request[method](url)
        .set('Accept', 'application/json')
        .set('Authorization', 'Token token=' + token)

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

function errorFromResponse (res) {
  const { text, status } = res
  const err = new Error(text)
  err.status = status
  return err
}

exports.errorFromResponse = errorFromResponse

exports.getter = function (token) {
  typeforce(typeforce.String, token)
  return function (url) {
    return exports.get({ url, token })
  }
}

exports.poster = function (token) {
  typeforce(typeforce.String, token)
  return function ({ url, data }) {
    return exports.post({ url, data, token })
  }
}

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
    // .type('form')
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
