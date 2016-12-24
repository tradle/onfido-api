#!/usr/bin/env node

const token = process.env.ONFIDO_API_KEY
if (!token) throw new Error('no token!')

const path = require('path')
const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'))
const repl = require('repl')
const userHome = require('user-home')
const co = Promise.coroutine
const Onfido = require('./')
const onfido = new Onfido({ token })
const replServer = repl.start({
  prompt: '> ',
  ignoreUndefined: true
})

require('./history')(replServer, path.join(userHome, '.onfido_history'))

Object.keys(onfido).forEach(name => {
  const api = replServer.context[name] = {}
  const component = onfido[name]
  Object.keys(component).forEach(method => {
    api[method] = function () {
      const val = component[method].apply(component, arguments)
      if (!Promise.is(val)) return console.log(val)

      val.then(result => {
        if (result) console.log(JSON.stringify(result, null, 2))
      }, console.error)
    }
  })
})

replServer.displayPrompt()
