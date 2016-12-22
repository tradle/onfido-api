
const typeforce = require('typeforce')

exports.side = oneOf('front', 'back')

exports.docType = oneOf('passport', 'driving_licence', 'national_identity_card', 'tax_id', 'voter_id', 'residence_permit')

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
