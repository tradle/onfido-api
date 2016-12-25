
# onfido api + repl

Promise-based Onfido API + cli/repl

## cli / repl

```sh
ONFIDO_API_KEY=<your_api_key> ./cli.js
```

```js
applicants.list()
//...
applicants.create()
//...
applicants.uploadDocument('c7aff007-4b37-4c8a-81a5-13e46e5252a4', { filepath: './samples/license.jpg', type:'driving_licence' })
//...
checks.createDocumentCheck('c7aff007-4b37-4c8a-81a5-13e46e5252a4')
```

### API

```js
// token is same as ONFIDO_API_KEY above
const onfido = new Onfido({ token })
```

### applicants

- list()
- get(applicantId)
- create(applicantData)
- update(applicantId, applicantData)
- uploadDocument(applicantId, { type, ...fileOpts })
- uploadLivePhoto(applicantId, { ...fileOpts })
- listDocuments()

*fileOpts:
  - file: Buffer
  - filename: String
  - filepath: String

**acceptable fileOpts: file + filename || filepath + filename || filepath*

### checks

- list({ applicantId, ?expandReports })
- get({ checkId, applicantId })
- create(applicantId, checkOpts)
- createDocumentCheck(applicantId)
- createFaceCheck(applicantId)

### reports

- list({ checkId })
- get({ checkId, reportId })
- resume({ checkId, reportId })
- cancel({ checkId, reportId })

### reportTypeGroups

- list()
- get(id)

### webhooks

- list()
- get(id)
- register({ url, events })
- unregister(url)
- handleEvent(req) - resolves with event body if HMAC is good
