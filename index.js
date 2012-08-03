'use strict';

/**
 * Express-Liquid utils
 *
 * @param 老雷<leizongmin@gmail.com>
 */


module.exports = require('./lib/index');

/**
示例：

    var options = {
      // 选项
    };
    app.set('view engine', 'liquid');
    app.engine('liquid', require('express-liquid')(options));

*/