'use strict';

/*!
 * Express-Liquid
 *
 * @param 老雷<leizongmin@gmail.com>
 */


var tinyliquid = require('tinyliquid');
var fs = require('fs');
var path = require('path');
var utils = require('./utils');

/**
 * 返回用于express 3.x的渲染函数
 * 
 * options
 *   编译相关：
 *     tags        自定义标记解析  {tagname: [Function]}
 *     includeFile 解析include标记时，读取文件的函数  function (filename, callback) 默认为读取当前文件所在目录
 *   渲染相关：
 *     parallel    异步获取数据时，是否采用并行方式，默认为false
 *     filters     模板内可用的函数
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
module.exports = function (options) {
  options = options || {};
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
    return cache[filename];
  };

  /**
   * 设置缓存
   *
   * @param {String} filename
   * @param {Function} fn
   * @return {Function}
   * @api public
   */
  var setCache = function (filename, fn) {
    filename = path.resolve(filename);
    return cache[filename] = fn;
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
   * 解算文件名
   *
   * @param {String} filename
   * @param {Object} settings
   * @return {Array}
   * @api private
   */
  var resolveFilename = function (filename, settings) {
    if (settings.views) filename = path.resolve(settings.views, filename);
    var ret = [filename];
    var extname = path.extname(filename);
    if (!extname) {
      extname = settings['view engine'] || 'liquid';
      ret.push(filename + '.' + extname);
    }
    return ret;
  };

  /**
   * 编译模板
   *
   * @param {String} filename
   * @param {Object} settings
   * @param {Function} callback
   * @api private
   */
  var compileFile = function (filename, settings, callback) {
    var extname = settings['view engine'] || 'liquid';
    var readFile = function (filename, callback) {
      fs.readFile(path.resolve(settings.views, filename), 'utf8', callback);
    };
    var _includeFile = options.includeFile || readFile;
    var includeFile = function (filename, callback) {
      _includeFile(filename, function (err, data) {
        if (err) {
          // 对于没有扩展名的文件名，自动为其加上扩展名，并尝试读取该文件
          var filenames = resolveFilename(filename, settings);
          if (filenames[1]) {
            return includeFile(filenames[1], callback);
          } else {
            return callback(err);
          }
        } else {
          return callback(null, data, filename);
        }
      });
    };

    includeFile(filename, function (err, data, realFilename) {
      if (err) return callback(err);
      var files = {};
      var templateFilename = filename.substr(settings.views.length + 1);
      files[templateFilename] = data;

      var filenames = Object.keys(tinyliquid.parse(data, options).includes);
      var allFilenames = filenames.slice();
      
      var readFileDone = function () {
        try {
          var fn = tinyliquid.compileAll(files, options)[templateFilename];
        } catch (err) {
          return callback(err);
        }
        return callback(null, fn, realFilename);
      };
      var readNextFile = function () {
        var filename = filenames.shift();
        if (!filename) return readFileDone();
        // 读取模板内容，并读取该模板include的子模版内容
        includeFile(filename, function (err, data) {
          if (err) return callback(err);
          files[filename] = data;
          var includes = Object.keys(tinyliquid.parse(data, options).includes);
          includes.forEach(function (f) {
            if (allFilenames.indexOf(f) === -1) {
              allFilenames.push(f);
              filenames.push(f);
            }
          });
          readNextFile();
        });
      };
      readNextFile();
    });
  };

  /**
   * 渲染模板
   *
   * @param {Function} fn
   * @param {Object} locals
   * @param {Function} callback
   * @api private
   */
  var render = function (fn, locals, callback) {
    var opts = utils.merge(options, {env: locals});
    tinyliquid.advRender(fn, locals, opts, callback);
  };

  /**
   * 在指定布局中渲染模板
   *
   * @param {Function} fn
   * @param {Object} options
   * @param {Function} callback
   * @api private
   */
  var renderInLayout = function (fn, options, callback) {
    var layout = getCache(options.layout);
    var renderBody = function () {
      render(fn, options, function (err, body) {
        if (err) return callback(err);
        options.body = options.content_for_layout = body;
        render(layout, options, callback);
      });
    };
    if (options.cache && typeof(layout) === 'function') {
      renderBody();
    } else {
      compileFile(options.layout, options.settings, function (err, fn, filename) {
        if (err) return callback(err);
        layout = fn;
        setCache(filename, fn);
        renderBody();
      });
    }
  };

  /**
   * 用于express的接口
   *
   * @param {String} filename
   * @param {Object} 选项，其中settings为express配置
   * @param {Function} callback
   * @api public
   */
  var ret = function (filename, options, callback) {
    if (options.layout === true) options.layout = 'layout';
    // console.log(options);
    // console.log(cache);
    var fn = getCache(filename);
    if (options.cache && typeof(fn) === 'function') {
      (typeof options.layout === 'string' ? renderInLayout : render)(fn, options, callback);
    } else {
      compileFile(filename, options.settings, function (err, fn, filename) {
        if (err) return callback(err);
        if (options.cache) setCache(filename, fn);
        (typeof options.layout === 'string' ? renderInLayout : render)(fn, options, callback);
      });
    }
  };

  // 缓存操作
  ret.cache = cache;
  ret.getCache = getCache;
  ret.clearCache = clearCache;

  ret.tinyliquid = ret.tinyliquid;

  return ret;
};

