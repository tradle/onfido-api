
const typeforce = require('typeforce')
const request = require('superagent')
const secondary = require('level-secondary')
const types = require('./types')

module.exports = function createReportTypeGroupsAPI ({ onfido }) {
  return {
    get: id => onfido.findReportTypeGroup(id),
    list: () => onfido.listReportTypeGroups()
  }
}
