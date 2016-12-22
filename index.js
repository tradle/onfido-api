
const apis = require('./lib')

module.exports = function ({ token }) {
  const authenticated = {}
  Object.keys(apis).forEach(name => {
    authenticated[name] = apis[name]({ token })
  })

  return authenticated
}
