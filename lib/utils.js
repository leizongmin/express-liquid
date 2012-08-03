'use strict';

/**
 * Express-Liquid utils
 *
 * @param 老雷<leizongmin@gmail.com>
 */



/**
 * 合并对象
 */
exports.merge = function () {
  var ret = {};
  for (var i in arguments) {
    var obj = arguments[i];
    for (var j in obj) ret[j] = obj[j];
  }
  return ret;
};

/**
 * 取文件名称（去掉后缀）
 *
 * @param {string} name
 * @return {string}
 */
exports.basename = function (name) {
  var i = name.lastIndexOf('.');
  var j = name.lastIndexOf('/');
  return (i !== -1 && i > j) ? name.substr(0, i) : name;
};