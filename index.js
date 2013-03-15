'use strict';

/*!
 * Express-Liquid
 *
 * @param 老雷<leizongmin@gmail.com>
 */


var tinyliquid = require('tinyliquid');
var fs = require('fs');
var path = require('path');

/**
 * 返回用于express 3.x的渲染函数
 * 
 * options
 *   includeFile: 读取文件的函数，格式 function (filename, callback)
 *                                callback格式： callback(err, content)
 *   context: 基本的Context对象
 *
 * 模板：
 *    {% include "filename" %} 其中的filename默认为views目录下绝对路径，与当前模板文件所在路径无关 
 *                             filename若省略扩展名，则默认加上 'view engine' 作为扩展名，或者为 .liquid
 *
 * 布局layout：
 *    指定locals变量layout为布局模板，如：  res.locals.layout = 'layout.liquid';
 *    在布局模板中通过 {{body}} 或 {{content_for_layout}} 来获取当前模板的内容
 *
 * @param {Object} options
 * @return {Function}
 * @api public
 */
module.exports = exports = function (options) {
  options = options || {};
  var baseContext = options.context || new tinyliquid.Context();
  var includeFile = options.includeFile;
  var cache = {};

  /**
   * 取缓存
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
   * 设置缓存
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
   * 删除缓存
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
   * 编译模板
   *
   * @param {String} filename
   * @param {Object} settings
   * @param {Function} callback 格式：function (err, ast, filename, lines)
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
      var ast = tinyliquid.parse(text);
      callback(null, ast, filename, text.split(/\n/));
    });
  };

  baseContext.onInclude(function (name, callback) {
    compileFile(name, this._express_settings, callback);
  });

  /**
   * 渲染模板
   *
   * @param {Object} tpl
   * @param {Object} context
   * @param {Function} callback
   */
  var render = function (tpl, context, callback) {
    console.log()
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
   * 用于express的接口
   *
   * @param {String} filename
   * @param {Object} opts
   *   - {Object} settings  express配置
   *   - {Boolean} cache    是否缓存
   *   - {Object} context   tinyliquid用的Context对象 
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


  // 缓存操作
  ret.cache = cache;
  ret.getCache = getCache;
  ret.clearCache = clearCache;
  // tinyliquid对象
  ret.tinyliquid = ret.tinyliquid;

  return ret;
};

exports.tinyliquid = tinyliquid;
