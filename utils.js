
const request = require('superagent')
const Sublevel = require('level-sublevel')
// const subdown = require('subleveldown')
const Promise = require('bluebird')
const omit = require('object.omit')

exports.Promise = Promise
exports.co = Promise.coroutine

exports.promisesub = function promisesub (db, prefix) {
  return Promise.promisifyAll(exports.sub(db, prefix))
}

exports.sub = function sub (db, prefix) {
  return Sublevel(db).sublevel(prefix)
}

exports.omit = omit

exports.promisify = function promisify (obj) {
  obj.promise = Promise.promisifyAll(obj)
}

exports.baseRequest = function baseRequest (token) {
  const authenticatedRequest = {}
  ;['get', 'post'].forEach(method => {
    authenticatedRequest[method] = function (url) {
      const req = request[method](url)
        .set('Authorization', 'Token token=' + token)

      if (method === 'post') req.type('form')

      return req
  })

  return authenticatedRequest
}

exports.setPromiseInterface = function setPromiseInterface (obj, prop) {
  obj[prop || 'promise'] = Promise.promisifyAll(obj)
}

exports.allSettled = function allSettled (promises) {
  return Promise.all(promises.map(promise => promise.reflect()))
}
