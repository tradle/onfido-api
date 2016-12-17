
module.exports = function checksWithStore ({ db, applicants, checks, reports }) {

  const create = co(function* create (externalApplicantId, opts) {
    const applicant = yield applicants.store.byExternalId(externalApplicantId)
    const check = yield checks.api.create(applicant.id, opts)
    return yield checks.store.create(applicant.id, check)
  })

  const list = co(function* list (externalApplicantId, opts) {
    const applicant = yield applicants.store.byExternalId(externalApplicantId)
    if (!opts.fetch) {
      return yield checks.store.list(applicant.id)
    }

    const fetched = yield checks.api.list(applicant.id, opts)
    yield checks.store.update(fetched)
  })

  return {
    create,
    list,
    get
  }
}
