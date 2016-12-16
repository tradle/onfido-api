
const typeforce = require('typeforce')
const request = require('superagent')
const collect = Promise.promisify(require('stream-collector'))
const secondary = require('level-secondary')
const { Promise, co, sub, omit } = require('./utils')
const types = require('./types')

module.exports = function createReportTypeGroupsAPI ({ onfido }) {
  return {
    get: id => onfido.findReportTypeGroup(id),
    list: () => onfido.listReportTypeGroups()
  }
}
