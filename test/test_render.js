/**
 * Express-Liquid Test
 */

var should = require('should');
var liquid = require('../');
var utils = require('../lib/utils');
var fs = require('fs');


describe('render', function () {

  var options = {
    settings: {
      'view engine':    'liquid',
      'views':          __dirname + '/views'
    }
  };

  it('#options includeFile', function (done) {
    var render = liquid({
      includeFile: function (filename, callback) {
        return callback(null, '<File:' + filename + '>');
      }
    });
    render('ooxx.liquid', utils.merge(options), function (err, text) {
      should.equal(err, null);
      text.should.equal('<File:ooxx.liquid>');
      done();
    });
  });

  it('#render file without extension name', function (done) {
    var render = liquid();
    render(__dirname + '/views/hello', utils.merge(options, {name: 'Lei'}), function (err, text) {
      should.equal(err, null);
      text.should.equal('Hello, Lei!');
      done();
    });
  });

  it('#include tag', function (done) {
    var render = liquid();
    render(__dirname + '/views/main.liquid', utils.merge(options), function (err, text) {
      should.equal(err, null);
      text.indexOf('This is main.').should.not.equal(-1);
      text.indexOf('This is file1.').should.not.equal(-1);
      text.indexOf('This is file11.').should.not.equal(-1);
      text.indexOf('This is file common.').should.not.equal(-1);
      text.indexOf('This is file12.').should.not.equal(-1);
      text.indexOf('This is file2.').should.not.equal(-1);
      text.indexOf('This is file21.').should.not.equal(-1);
      done();
    });
  });

  it('#layout', function (done) {
    var render = liquid();
    render(__dirname + '/views/template.liquid', utils.merge(options, {layout: 'layout'}), function (err, text) {
      should.equal(err, null);
      text.should.equal('I am layout. I am template. I am template. The end.');
      done();
    });
  });

  it('#disable cache', function (done) {
    var render = liquid();
    var filename = __dirname + '/views/cache.liquid';
    fs.writeFileSync(filename, 'ABC');
    render(filename, utils.merge(options, {cache: false}), function (err, text) {
      should.equal(err, null);
      text.should.equal('ABC');
      fs.writeFileSync(filename, 'OOXX');
      render(filename, utils.merge(options, {cache: false}), function (err, text) {
        should.equal(err, null);
        text.should.equal('OOXX');
        fs.unlinkSync(filename);
        done();
      });
    });
  });

  it('#enable cache', function (done) {
    var render = liquid();
    var filename = __dirname + '/views/cache.liquid';
    fs.writeFileSync(filename, 'ABC');
    render(filename, utils.merge(options, {cache: true}), function (err, text) {
      should.equal(err, null);
      text.should.equal('ABC');
      fs.writeFileSync(filename, 'OOXX');
      render(filename, utils.merge(options, {cache: true}), function (err, text) {
        should.equal(err, null);
        text.should.equal('ABC');
        fs.unlinkSync(filename);
        done();
      });
    });
  });

  it('#get cache & clear cache', function (done) {
    var render = liquid();
    var filename = __dirname + '/views/cache.liquid';
    fs.writeFileSync(filename, 'ABC');
    render(filename, utils.merge(options, {cache: true}), function (err, text) {
      if (err) console.log(err.toString());
      should.equal(err, null);
      text.should.equal('ABC');
      typeof(render.getCache(filename)).should.not.equal('undefined');
      render.clearCache(filename);
      fs.writeFileSync(filename, 'OOXX');
      render(filename, utils.merge(options, {cache: true}), function (err, text) {
        should.equal(err, null);
        text.should.equal('OOXX');
        fs.unlinkSync(filename);
        done();
      });
    });
  });

});

