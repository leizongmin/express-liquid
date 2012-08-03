/**
 * Express-Liquid Test
 */

var should = require('should');
var utils = require('../lib/utils');


describe('utils', function () {

  it('#merge', function () {
    utils.merge({a:1, b:2, c:3}).should.eql({a:1, b:2, c:3});
    utils.merge({a:1, b:2, c:3}, {b:3, c:4, d:5}).should.eql({a:1, b:3, c:4, d:5});
    utils.merge({a:1}, {b:2}, {c:3}).should.eql({a:1, b:2, c:3});
  });

  it('#basename', function () {
    utils.basename('abc').should.equal('abc');
    utils.basename('abc.ooxx').should.equal('abc');
    utils.basename('abc/efg').should.equal('abc/efg');
    utils.basename('abc/efg.xx').should.equal('abc/efg');
    utils.basename('abc.ooxx/a').should.equal('abc.ooxx/a');
  });

});

