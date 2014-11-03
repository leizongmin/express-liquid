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
 *   includeFile: read file handler, format: function (filename, callback, enableCache)
 *                          callback format: callback(err, content)
 *   resolveFilename:  resolve the absolute file name, format: function (name, settings),
                                                       return: absolute file name
 *   context:     base context object
 *   customTags:  custom tags parser
 *   traceError:  Show the detailed error message or not, default to false
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
  var customTags = options.customTags || {};
  var cache = {};
  var isTraceError = !!options.traceError;

  /**
   * Get cache
   *
   * @param {String} filename
   * @return {Function}
   * @api public
   */
  var getCache = function (filename) {
    filename = resolveFilename(filename);
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
    var ret = cache[filename] = {ast: ast, lines: lines};
    return ret;
  };

  /**
   * Clear cache
   *
   * @param {String} filename
   * @return {Function}
   * @api public
   */
  var clearCache = function (filename) {
    filename = resolveFilename(filename);
    var fn = cache[filename];
    delete cache[filename];
    return fn;
  };

  /**
   * Resolve filename
   *
   * @param {String} name
   * @param {Object} settings
   * @return {String}
   */
  var resolveFilename = function (name, settings) {
    if (settings) {
      var extname = settings['view engine'] || 'liquid';
      var filename = path.resolve(settings.views, name);
      if (!path.extname(filename)) filename += '.' + extname;
      return filename;
    } else {
      return name;
    }
  };
  if (typeof(options.resolveFilename) === 'function') resolveFilename = options.resolveFilename;

  /**
   * Read file
   *
   * @param {String} filename
   * @param {Function} callback
   * @param {Boolean} enableCache
   */
  var readFile = function (filename, callback, enableCache) {
    fs.readFile(filename, {encoding: 'utf8'}, function (err, data) {
      // watch file, if the file has changed, clear the cache
      if (enableCache && !err) {
        var w = fs.watch(filename, function (event) {
          clearCache(filename);
          w.close();
        });
      }
      callback(err, data);
    });
  };
  if (typeof(options.includeFile) === 'function') readFile = options.includeFile;


  /**
   * Compile template file
   *
   * @param {String} filename
   * @param {Object} settings
   * @param {Function} callback format: function (err, ast, filename, lines)
   * @api private
   */
  var compileFile = function (filename, settings, callback) {
    var enableCache = !!settings.__express_liquid_cache;

    // check cache
    var tpl = getCache(filename);
    if (enableCache && tpl !== null) return callback(null, tpl.ast, filename, tpl.lines);

    // read file and parse
    readFile(filename, function (err, text) {
      if (err) return callback(err);

      text = text.toString();
      var ast = tinyliquid.parse(text, {customTags: customTags});
      var lines = text.split(/\n/);

      // save cache
      if (enableCache) setCache(filename, ast, lines);

      // current filename
      ast = tinyliquid.insertFilename(ast, filename);

      callback(null, ast, filename, lines);
    }, enableCache);
  };

  // onclude handler
  baseContext.onInclude(function (filename, callback) {
    var parentFilename = this.getFilename();

    // if the filename is start with "./" or "../", it means this is a relative file path
    if (parentFilename && (filename.substr(0, 2) === './' || filename.substr(0, 3) === '../')) {
      filename = resolveFilename(path.join(parentFilename, '../' + filename), this._express_settings);
    } else {
      filename = resolveFilename(filename, this._express_settings);
    }

    compileFile(filename, this._express_settings, callback);
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
        renderErrorPage(err, tpl, context, callback);
      } else {
        callback(null, context.clearBuffer());
      }
    });
  };

  // Friendly error page render
  var errorPageRender = tinyliquid.compile(
    fs.readFileSync(
      path.resolve(__dirname, 'error_page.liquid'),
      {encoding: 'utf8'}));

  /**
   * Render friendly error page
   *
   * @param {Object} err
   * @param {Object} tpl
   * @param {Object} context
   * @param {Function} callback
   */
  var renderErrorPage = function (err, tpl, context, callback) {
    var c = tinyliquid.newContext();
    if (isTraceError) {
      var pos = context.getCurrentPosition();
      var lines = [];
      var length = tpl.lines.length;
      var showCodeLine = function (line, highlight) {
        var index = line - 1;
        if (index >= 0 && index < length) {
          var lineNum = line + '|    ';
          var text = lineNum + tpl.lines[index].trimRight();
          lines.push({text: text, highlight: highlight});
          return lineNum.length;
        } else {
          return 0;
        }
      };
      showCodeLine(pos.line - 3);
      showCodeLine(pos.line - 2);
      showCodeLine(pos.line - 1);
      var prefixLength = showCodeLine(pos.line, true);
      var marks = '';
      for (var i = 0, e = prefixLength + pos.column - 1; i < e; i++) marks += ' ';
      marks += '^';
      lines.push({text: marks, highlight: true});
      showCodeLine(pos.line + 1);
      showCodeLine(pos.line + 2);
      showCodeLine(pos.line + 3);
      c.setLocals('lines', lines);
    }
    var stack = err instanceof Error ? err.stack.split(/\n/) : [err];
    c.setLocals('error', stack[0]);
    if (isTraceError) {
      c.setLocals('stack', stack.slice(1).join('\n'));
    }
    errorPageRender(c, callback);
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
    // init context
    var context = opts.context || new tinyliquid.Context();
    context.from(baseContext);
    context._express_settings = opts.settings;
    if (opts.cache) opts.settings.__express_liquid_cache = true;

    // compile file and render
    filename = resolveFilename(filename, opts.settings);
    compileFile(filename, opts.settings, function (err, ast, filename, lines) {
      if (err) return callback(err);
      render({ast: ast, lines: lines}, context, callback);
    });
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

// render function middleware
exports.middleware = function (req, res, next) {
  var tempRenderName = '_tinyliquid_original_render_' + Math.random();
  res[tempRenderName] = res.render;
  res.context = tinyliquid.newContext();
  res.render = function (view, data, callback) {
    data = data || {};
    Object.keys(res.locals).forEach(function (k) {
      res.context.setLocals(k, res.locals[k]);
    });
    Object.keys(data).forEach(function (k) {
      res.context.setLocals(k, data[k]);
    });
    res[tempRenderName](view, {context: res.context}, callback);
  };
  next();
};
