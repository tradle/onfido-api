
exports.side = typeforce.compile(typeforce.oneOf('front', 'back'))

exports.docType = typeforce.compile(typeforce.oneOf('jpg', 'png', 'pdf'))
