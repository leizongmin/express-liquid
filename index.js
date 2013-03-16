'use strict';

/*!
 * Express-Liquid
 *
 * @param Lei Zongmin<leizongmin@gmail.com>
 */


var tinyliquid = require('tinyliquid');
var fs = require('fs');
var path = require('path');

/**
 * TinyLiquid engine for the Express 3.x
 * 
 * options
 *   includeFile: read file handler, format: function (filename, callback)
 *                          callback format: callback(err, content)
 *   context:     base context object
 *   customTags:  custom tags parser
 *
 * Notes:
 *    {% include "filename" %} the "filename" default to under the "views" path
 *
 * Layout:
 *    Not support layout, please use the "include" tag. Example:
 *    {% include "header" %}
 *    This is the body.
 *    {% include "footer" %}
 *
 * @param {Object} options
 * @return {Function}
 * @api public
 */
module.exports = exports = function (options) {
  options = options || {};
  var baseContext = options.context || new tinyliquid.Context();
  var includeFile = options.includeFile;
  var customTags = options.customTags || {};
  var cache = {};

  /**
   * Get cache
   *
   * @param {String} filename
   * @return {Function}
   * @api public
   */
  var getCache = function (filename) {
    filename = path.resolve(filename);
    var ast = cache[filename];
    if (typeof(ast) !== 'undefined') {
      return ast;
    } else {
      return null;
    }
  };

  /**
   * Set cache
   *
   * @param {String} filename
   * @param {Array} ast
   * @param {Buffer} lines
   * @return {Object}
   * @api public
   */
  var setCache = function (filename, ast, lines) {
    return cache[filename] = {ast: ast, lines: lines};
  };

  /**
   * Clear cache
   *
   * @param {String} filename
   * @return {Function}
   * @api public
   */
  var clearCache = function (filename) {
    filename = path.resolve(filename);
    var fn = cache[filename];
    delete cache[filename];
    return fn;
  };

  /**
   * Compile template file
   *
   * @param {String} filename
   * @param {Object} settings
   * @param {Function} callback format: function (err, ast, filename, lines)
   * @api private
   */
  var compileFile = function (filename, settings, callback) {
    var extname = settings['view engine'] || 'liquid';
    if (typeof(includeFile) !== 'function') {
      var readFile = function (filename, callback) {
        filename = path.resolve(settings.views, filename);
        if (!path.extname(filename)) filename += '.' + extname;
        fs.readFile(filename, callback);
      };
    } else {
      var readFile = includeFile;
    }
    readFile(filename, function (err, text) {
      if (err) return callback(err);
      text = text.toString();
      var ast = tinyliquid.parse(text, {customTags: customTags});
      callback(null, ast, filename, text.split(/\n/));
    });
  };

  baseContext.onInclude(function (name, callback) {
    compileFile(name, this._express_settings, callback);
  });

  /**
   * Render template
   *
   * @param {Object} tpl
   * @param {Object} context
   * @param {Function} callback
   */
  var render = function (tpl, context, callback) {
    tinyliquid.run(tpl.ast, context, function (err) {
      if (err) {
        var pos = context.getCurrentPosition();
        var line1 = tpl.lines[pos.line - 1] || '';
        var line2 = '';
        var lineNum = pos.line + '|    ';
        for (var i = 0, e = lineNum.length + pos.column - 1; i < e; i++) line2 += ' ';
        line2 += '^';
        var errors = '<pre>\n' + lineNum + line1 + '\n' + line2 + '\n' + err.stack + '\n</pre>';
        callback(null, errors);
      } else {
        callback(null, context.clearBuffer());
      }
    });
  };

  /**
   * Return the engine
   *
   * @param {String} filename
   * @param {Object} opts
   *   - {Object} settings
   *   - {Boolean} cache
   *   - {Object} context  the tinyliquid.Context instance
   * @param {Function} callback
   * @api public
   */
  var ret = function (filename, opts, callback) {
    if (opts.layout === true) opts.layout = 'layout';

    var context = opts.context || new tinyliquid.Context();
    context.from(baseContext);
    context._express_settings = opts.settings;

    var tpl = getCache(filename);
    if (opts.cache && tpl !== null) {
      render(tpl, context, callback);
    } else {
      compileFile(filename, opts.settings, function (err, ast, filename, lines) {
        if (err) return callback(err);
        if (opts.cache) setCache(filename, ast, lines);
        render({ast: ast, lines: lines}, context, callback);
      });
    }
  };


  // Cache operation
  ret.cache = cache;
  ret.getCache = getCache;
  ret.clearCache = clearCache;

  return ret;
};

// The tinyliquid
exports.tinyliquid = tinyliquid;

// Create a new context
exports.newContext = tinyliquid.newContext;