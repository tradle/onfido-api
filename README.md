
# onfido API

Promise-based Onfido API + cli/repl

### init

```js
const onfido = new Onfido({ token })
```

### applicants

- list()
- get(applicantId)
- create(applicantData)
- update(applicantId, applicantData)
- uploadDocument(applicantId, { type, ?side, ?file, ?filename, ?filepath })
- uploadLivePhoto(applicantId, { type, ...fileOpts })
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

## cli / REPL

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
