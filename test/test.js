/**
 * Express-Liquid Test
 */

var assert = require('assert');
var liquid = require('../');
var fs = require('fs');

var merge = function () {
  var ret = {};
  for (var i in arguments) {
    var obj = arguments[i];
    for (var j in obj) ret[j] = obj[j];
  }
  return ret;
};

var newContext = function () {
  return new liquid.tinyliquid.Context();
};

describe('render', function () {

  var options = {
    settings: {
      'view engine':    'liquid',
      'views':          __dirname + '/views'
    }
  };

  it('normal', function (done) {
    var render = liquid();
    render('normal', merge(options), function (err, text) {
      assert.equal(err, null);
      assert.equal(text, 'I am template.');
      done();
    });
  });

  it('locals', function (done) {
    var context = newContext();
    context.setAsyncLocals('a', function (name, callback) {
      callback(null, name + '123');
    })
    context.setAsyncLocals('b', function (name, callback) {
      callback(null, name + '456');
    });
    var render = liquid({
      context: context
    });

    var c1 = newContext();
    c1.setAsyncLocals('a', function (name, callback) {
      callback(null, '789');
    })
    render('locals', merge(options, {context: c1}), function (err, text) {
      assert.equal(err, null);
      assert.equal(text, 'a=789,b=b456');
      render('locals', merge(options, {}), function (err, text) {
        assert.equal(err, null);
        assert.equal(text, 'a=a123,b=b456');
        done();
      });
    });
  });
  
  it('include', function (done) {
    var context = newContext();
    var render = liquid({
      context:  context
    });
    render('include', merge(options), function (err, text) {
      assert.equal(err, null);
      assert.equal(text, 'This is file1.\r\nThis is file2.\r\nThis is file3.\r\nThis is file4.\r\nEND.');
      done();
    });
  });

  it('catch error', function (done) {
    var c = newContext({timeout: 10});
    var render = liquid();
    c.setSyncLocals('error', function (name, callback) {
      // do nothing
    });
    render('catch_error', merge(options, {context: c}), function (err, text) {
      assert.equal(err, null);
      console.log(text);
      done();
    });
  });

});

