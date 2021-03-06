'use strict'

var crypto = require('crypto')
var path = require('path')
var defaultOptions = require('../static/babelrc.json')

var babel = null
var babelVersionDirectory = null
var options = null

var PREFIXES = [
  '/** @babel */',
  '"use babel"',
  '\'use babel\'',
  '/* @flow */'
]

var PREFIX_LENGTH = Math.max.apply(Math, PREFIXES.map(function (prefix) {
  return prefix.length
}))

exports.shouldCompile = function (sourceCode) {
  var start = sourceCode.substr(0, PREFIX_LENGTH)
  return PREFIXES.some(function (prefix) {
    return start.indexOf(prefix) === 0
  })
}

exports.getCachePath = function (sourceCode) {
  if (babelVersionDirectory == null) {
    var babelVersion = require('babel-core/package.json').version
    babelVersionDirectory = path.join('js', 'babel', createVersionAndOptionsDigest(babelVersion, defaultOptions))
  }

  return path.join(
    babelVersionDirectory,
    crypto
      .createHash('sha1')
      .update(sourceCode, 'utf8')
      .digest('hex') + '.js'
  )
}

exports.compile = function (sourceCode, filePath) {
  if (!babel) {
    babel = require('babel-core')
    var Logger = require('babel-core/lib/transformation/file/logger')
    var noop = function () {}
    Logger.prototype.debug = noop
    Logger.prototype.verbose = noop

    options = {ast: false, babelrc: false}
    for (var key in defaultOptions) {
      if (key === 'plugins') {
        const plugins = []
        for (const [pluginName, pluginOptions] of defaultOptions[key]) {
          plugins.push([require.resolve(`babel-plugin-${pluginName}`), pluginOptions])
        }
        options[key] = plugins
      } else {
        options[key] = defaultOptions[key]
      }
    }
  }

  if (process.platform === 'win32') {
    filePath = 'file:///' + path.resolve(filePath).replace(/\\/g, '/')
  }

  options.filename = filePath

  return babel.transform(sourceCode, options).code
}

function createVersionAndOptionsDigest (version, options) {
  return crypto
    .createHash('sha1')
    .update('babel-core', 'utf8')
    .update('\0', 'utf8')
    .update(version, 'utf8')
    .update('\0', 'utf8')
    .update(JSON.stringify(options), 'utf8')
    .digest('hex')
}
