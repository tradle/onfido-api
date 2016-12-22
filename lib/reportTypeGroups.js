
const { getter } = require('./utils')

module.exports = function createReportTypeGroupsAPI ({ token }) {
  const get = getter(token)
  return {
    get: id => get(`https://api.onfido.com/v2/report_type_groups/${id}`),
    list: () => get('https://api.onfido.com/v2/report_type_groups')
  }
}
