
exports.side = typeforce.oneOf('front', 'back')

exports.docType = typeforce.oneOf('passport', '')

exports.webhookEvent = typeforce.oneOf(
  'report.completed',
  'report.withdrawn',
  'check.completed',
  'check.started',
  'check.form_opened',
  'check.form_completed'
)

exports.docFileType = typeforce.oneOf('png', 'jpg', 'jpeg', 'pdf')
