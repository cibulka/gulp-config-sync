// through2 is a thin wrapper around node transform streams
var _ = require('lodash');
var through = require('through2');
var fs = require('fs');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var Q = require('kew');

// consts
const PLUGIN_NAME = 'gulp-config-sync';

/**
 * Default options
 */
var defaultOptions = {
  src: 'package.json',
  fields: [
    'name',
    'version',
    'description',
    'keywords',
    'license',
    'repository'
  ],
  space: '  ',
  callbacks: {}
};

/**
 * Plugin function
 */
function plugin(options) {
  var opts = _.assign({}, defaultOptions, options);

  console.log(opts);

  // creating a stream through which each file will pass
  var stream = through.obj(function(file, enc, cb) {

    if (file.isNull()) {
      return cb();
    }

    if (file.isStream()) {
      return cb(new PluginError(PLUGIN_NAME, 'Streaming not supported'));
    }

    if (file.isBuffer()) {
      syncConfig(file, opts, cb);
    }
  });

  // returning the file stream
  return stream;
};

function syncConfig(file, opts, cb) {

  Q.resolve()

  // get the source.json
  .then(function() {
    var src = fs.readFileSync(opts.src);
    return JSON.parse(src);
  })

  // replace fields in bower.json
  .then(function(srcObj) {

    var configObj = {};

    try {
      configObj = JSON.parse(String(file.contents));
    }
    catch (err) {
      throw 'Invalid config file: Not a valid JSON';
    }

    _.forEach(opts.fields, function(field) {
      if (_.isObject(field)) {
	    if (opts.callbacks[field] !== undefined) {
	      console.error("gulp-config-sync: Callbacks not done for object.");
	    }
        configObj[field.to] = srcObj[field.from];
      } else {
	    // Get val from source object
	    var val = srcObj[field];
	    // Filter val via callback, if available
	    if (opts.callbacks[field] !== undefined) {
		  val = opts.callbacks[field](field, val, file);
		}
		// Assign new val, if it's not "__false"
		if (val !== '__false') {
	      configObj[field] = val;
		}
      }
    });

    return JSON.stringify(configObj, null, opts.space);
  })

  // return the new buffer
  .then(function(result) {
    file.contents = new Buffer(result);
    return cb(null, file);
  })
  .fail(function(err) {
    return cb(new PluginError(PLUGIN_NAME, err));
  })
  .end();
}

// exporting the plugin main function
module.exports = plugin;
