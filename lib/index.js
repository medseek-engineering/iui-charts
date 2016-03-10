var rootDir = __dirname + '/';

module.exports = {
  
  config: function(conf) {
    'use strict';
    console.log('Using iui-charts directive');
    conf.client.head.scripts.push(conf.client.app.root + '$iui-charts/dist/core-module-setup.js');
    conf.client.head.scripts.push(conf.client.app.root + '$iui-charts/dist/iui-charts.js');
  },

  app: function(app, conf) {
    'use strict';
    app.get('/\\$iui-charts/*', function(req, res) {
      res.sendfile(rootDir + req.params[0]);
    });
  }
};