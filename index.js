/**
Copyright (C) 2015 SII

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/
var os = require('os');
var path = require('path');
var fs = require('fs');
var builder = require('xmlbuilder');

var jsFileSuffix = ".js";
var specNaming = "The spec name should map to the file structure: describe(\"test.com.company.BarTest\") → test/com/company/BarTest.js";

var JUnitReporter = function (baseReporterDecorator, config, logger, helper) {
  var log = logger.create('reporter.junit');
  var reporterConfig = config.junitReporter || {};
  var pkgName = reporterConfig.suite || '';
  var outputFile = helper.normalizeWinPath(path.resolve(config.basePath, reporterConfig.outputFile
      || 'test-results.xml'));

  var xml;
  var suites;
  var pendingFileWritings = 0;
  var fileWritingFinished = function () {};
  var allMessages = [];
  var specNamingWrong = false;
  var testSuites = {};

  baseReporterDecorator(this);

  this.adapters = [function (msg) {
    allMessages.push(msg);
  }];

  var initializeXmlForBrowser = function (browser) {
    var timestamp = (new Date()).toISOString().substr(0, 19);
    var suite = suites[browser.id] = xml.ele('testsuite', {
      name: browser.name,
      'package': pkgName,
      timestamp: timestamp,
      id: 0,
      hostname: os.hostname()
    });

    suite.ele('properties').ele('property', {
      name: 'browser.fullName',
      value: browser.fullName
    });
  };

  this.onRunStart = function (browsers) {
    suites = Object.create(null);
    xml = builder.create('testsuites');

    // TODO(vojta): remove once we don't care about Karma 0.10
    browsers.forEach(initializeXmlForBrowser);
  };

  this.onBrowserStart = function (browser) {
    initializeXmlForBrowser(browser);
  };

  this.onBrowserComplete = function (browser) {
    var suite = suites[browser.id];

    if (!suite) {
      // This browser did not signal `onBrowserStart`. That happens
      // if the browser timed out during the start phase.
      return;
    }

    var result = browser.lastResult;

    suite.att('tests', result.total);
    suite.att('errors', result.disconnected || result.error ? 1 : 0);
    suite.att('failures', result.failed);
    suite.att('time', (result.netTime || 0) / 1000);

    suite.ele('system-out').dat(allMessages.join() + '\n');
    suite.ele('system-err');

    if (specNamingWrong) {
      log.warn(specNaming);
    }
  };

  this.onRunComplete = function () {
    var xmlToOutput = xml;

    pendingFileWritings++;
    helper.mkdirIfNotExists(path.dirname(outputFile), function () {
      fs.writeFile(outputFile, xmlToOutput.end({pretty: true}), function (err) {
        if (err) {
          log.warn('Cannot write JUnit xml\n\t' + err.message);
        } else {
          log.debug('JUnit results written to "%s".', outputFile);
        }

        if (!--pendingFileWritings) {
          fileWritingFinished();
        }
      });
    });

    suites = xml = null;
    allMessages.length = 0;
  };

  function checkSuiteName(suite) {
    var suiteFilename = suite.replace(/\./g, '/');
    suiteFilename += jsFileSuffix;
    var normalizedFilename = helper.normalizeWinPath(path.resolve(suiteFilename));
    var result = fs.exists(normalizedFilename, function (exists) {
      if (!exists) {
        var message = "Sonarqube may fail to parse this report since the test file was not found at " + normalizedFilename;
        allMessages.push(message);
        log.warn(message);
        specNamingWrong = true;
      }
      return exists;
    });
    return result;
  }

  function incrementStr(str, value) {
    return (parseInt(str, 10) + (value || 1));
  }
  // classname format: <browser>.<package>.<suite>
  // ex.: Firefox_210_Mac_OS.com.company.BarTest
  // the classname should map to the file structure: com.company.BarTest → com/company/BarTest.js
  this.specSuccess = this.specSkipped = this.specFailure = function (browser, result) {
    var classname = result.suite[0] + '.js';
    if (!testSuites[classname]) {
      testSuites[classname] = suites[browser.id].ele('testsuite', {
        name: result.suite[0],
        time: 0,
        tests: 0,
        errors: 0,
        failures: 0,
        skipped: 0,
        file: classname
      });
    }
    checkSuiteName(result.suite[0]);
    var attrs = testSuites[classname].attributes;
    var spec = testSuites[classname].ele('testcase', {
      name: result.description,
      time: ((result.time || 0) / 1000)
    });
    attrs.tests = incrementStr(attrs.tests);
    attrs.time = parseFloat(attrs.time) + ((result.time || 0) / 1000);
    if (result.skipped) {
      spec.ele('skipped');
      attrs.skipped = incrementStr(attrs.skipped);
    }

    if (!result.success) {
      result.log.forEach(function (err) {
        var logErr = err.split('\n    at ');
        if (logErr[0].startsWith('Expected')) {
          attrs.failures = incrementStr(attrs.failures);
          spec.ele('failure', {msg: logErr[0]});
        } else {
          attrs.errors = incrementStr(attrs.errors);
          spec.ele('error', {msg: 'Error while executing test'});
        }
      });

      spec.ele('system-err').dat(result.log);
    }
  };

  // wait for writing all the xml files, before exiting
  this.onExit = function (done) {
    if (pendingFileWritings) {
      fileWritingFinished = done;
    } else {
      done();
    }
  };
};

JUnitReporter.$inject = ['baseReporterDecorator', 'config', 'logger', 'helper'];

// PUBLISH DI MODULE
module.exports = {
  'reporter:junit': ['type', JUnitReporter]
};
