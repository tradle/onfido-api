
const debug = require('debug')('onfido:api:misc')
const { Promise, co, allSettledResults } = require('./utils')

module.exports = function ({ token, applicants, checks, reports }) {
  const deleteDeletableApplicants = co(function* deleteDeletableApplicants () {
    const applicantsList = yield applicants.list()
    const checkSets = allSettledResults(applicantsList.map(applicant => {
      return checks.list({ applicantId: applicant.id })
    }))

    yield Promise.map(checkSets, function (checkSet, i) {
      const { id } = applicantsList[i]
      if (checkSet) {
        debug(`not deleting applicant ${id} due to initiated checks`)
        return Promise.resolve()
      }

      debug(`deleting applicant ${id}`)
      return applicants.delete(id)
    })
  })

  return { deleteDeletableApplicants }
}
