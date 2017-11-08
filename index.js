
const apis = require('./lib')
const misc = require('./lib/misc')
const { extend } = require('./lib/utils')

module.exports = exports = function ({ token }) {
  const authenticated = {}
  Object.keys(apis).forEach(name => {
    authenticated[name] = apis[name]({ token })
  })

  authenticated.misc = misc(extend({ token }, authenticated))
  authenticated.mode = token.split('_')[0] // test or live
  return authenticated
}

Object.keys(apis).forEach(name => exports[name] = apis[name])

