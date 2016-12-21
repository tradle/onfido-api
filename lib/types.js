
const typeforce = require('typeforce')

exports.side = oneOf('front', 'back')

exports.docType = oneOf('passport', 'driving_license', 'national_identity_card', 'tax_id', 'voter_id', 'residence_permit')

exports.webhookEvent = oneOf(
  'report.completed',
  'report.withdrawn',
  'check.completed',
  'check.started',
  'check.form_opened',
  'check.form_completed'
)

exports.docFileType = oneOf('png', 'jpg', 'jpeg', 'pdf')

function oneOf (values) {
  return function (val) {
    return values.includes(val)
  }
}
