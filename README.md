# karma-junit7-sonarqube-reporter

> Reporter for the JUnit7 XML format which is also Sonarqube (a.k.a. Sonar) friendly. This plugin is a modification of the existing `karma-junit-sonarqube-reporter` plugin.     

## Installation

The easiest way is to keep `karma-junit7-sonarqube-reporter` as a devDependency in your `package.json`.
```json
{
  "devDependencies": {
    "karma": "~0.10",
    "karma-junit7-sonarqube-reporter": "~0.0.1"
  }
}
```

You can simple do it by:
```bash
npm install karma-junit7-sonarqube-reporter --save-dev
```

## Configuration
```js
// karma.conf.js
module.exports = function(config) {
  config.set({
    preprocessors: {
      'test/**/*.spec.js': ['junit']
    },

    reporters: ['progress', 'junit'],

    // the default configuration
    junitReporter: {
      outputFile: 'test-results.xml',
      suite: ''
    }
  });
};
```

You can pass list of reporters as a CLI argument too:
```bash
karma start --reporters junit,dots
```

----

For more information on Karma see the [homepage].


[homepage]: http://karma-runner.github.com
