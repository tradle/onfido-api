
const typeforce = require('typeforce')

exports.side = oneOf('front', 'back')

exports.docType = oneOf(
  'passport',
  'driving_licence',
  'national_identity_card',
  'work_permit',
  'national_insurance',
  'birth_certificate',
  'bank_statement',
  'unknown'
  // 'tax_id',
  // 'voter_id',
  // 'residence_permit',
)

exports.reportType = oneOf(
  'identity',
  'document',
  'employment',
  'education',
  'negative_media',
  'directorship',
  'criminal_history',
  'watchlist',
  'anti_money_laundering',
  'street_level',
  'sex_offender',
  'watchlist',
  'national_criminal',
  'eviction',
  'county_criminal',
  'driving_record'
)

exports.webhookEvent = oneOf(
  'report.completed',
  'report.withdrawn',
  'check.completed',
  'check.started',
  'check.form_opened',
  'check.form_completed'
)

exports.docFileType = oneOf('png', 'jpg', 'jpeg', 'pdf')

function oneOf (/* values */) {
  const values = Array.isArray(arguments[0])
    ? arguments[0]
    : Array.prototype.slice.call(arguments)

  return function (val) {
    return values.includes(val)
  }
}
