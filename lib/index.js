var rootDir = __dirname + '/';

var moduleFiles = [
  'dist/core-module-setup.js',
  'dist/iui-charts.js'
];

module.exports = {
  config: function(conf) {
    'use strict';
    console.log('Using iui-charts directive');
    moduleFiles.forEach(function(moduleFile) {
      if (conf.client.head.settings &&
          conf.client.head.settings.combine &&
          conf.client.head.addlPathedScripts) {
        conf.client.head.addlPathedScripts.push(rootDir + moduleFile);
      } else {
        conf.client.head.scripts.push(conf.client.app.root + '$iui-charts/' + moduleFile);
      }
    });
  },

  app: function(app, conf) {
    'use strict';
    app.get('/\\$iui-charts/*', function(req, res) {
      res.sendfile(rootDir + req.params[0]);
    });
  }
};