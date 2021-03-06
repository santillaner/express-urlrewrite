
/**
 * Module dependencies.
 */

 var debug = require('debug')('express-urlrewrite');
 var toRegexp = require('path-to-regexp');
 var URL = require('url');

/**
 * Expose `expose`.
 */

module.exports = rewrite;

/**
 * Rewrite `src` to `dst`.
 *
 * @param {String|RegExp} src
 * @param {String} dst
 * @return {Function}
 * @api public
 */

function rewrite(src, dst, flags) {
  var keys = [], re, map;

  if (dst) {
    re = toRegexp(src, keys);
    map = toMap(keys);
    debug('rewrite %s -> %s    %s', src, dst, re);
  } else {
    debug('rewrite current route -> %s', src);
  }
  var qsa=false;
  if(flags && Array.isArray(flags)){
    flags.forEach(function(flag){if(flag==="QSA") qsa=true})
  }
  debug('QSA flag enabled? ->', qsa)

  return function(req, res, next) {
    var orig = req.url;
    var origQuery;
    var origOrig;

    if(qsa){
      var parsed=URL.parse(orig, true)
      origQuery=parsed.query
      debug('orig query params', origQuery)
      origOrig=orig;
      orig=parsed.pathname
    }

    var m;
    if (dst) {
      m = re.exec(orig);
      if (!m) {
        return next();
      }
    }
    req.url = req.originalUrl = (dst || src).replace(/\$(\d+)|(?::(\w+))/g, function(_, n, name) {
      if (name) {
        if (m) return m[map[name].index + 1];
        else return req.params[name];
      } else if (m) {
        return m[n];
      } else {
        return req.params[n];
      }
    });
    debug('rewrite %s -> %s', orig, req.url);
    if(qsa){
      var urlObj=URL.parse(req.url, true);
      urlObj.query=Object.assign(origQuery, urlObj.query)
      delete urlObj.search;
      req.url=req.originalUrl=URL.format(urlObj)

    }
    if (req.url.indexOf('?') > 0) {
      req.query = URL.parse(req.url, true).query;
      debug('rewrite updated new query', req.query);
    }
    debug("received->", req.url)
    debug("origOrig->", origOrig)
    if (dst) next();
    else next('route');
  }
}

/**
 * Turn params array into a map for quick lookup.
 *
 * @param {Array} params
 * @return {Object}
 * @api private
 */

function toMap(params) {
  var map = {};

  params.forEach(function(param, i) {
    param.index = i;
    map[param.name] = param;
  });

  return map;
}
