
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
