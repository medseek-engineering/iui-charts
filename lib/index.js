var rootDir = __dirname + '/';

module.exports = {
  
  config: function(conf) {
    console.log('Using longitudinal-view directive');
    conf.client.head.scripts.push(conf.client.app.root + '$longitudinal-view/dist/core-module-setup.js');
    conf.client.head.scripts.push(conf.client.app.root + '$longitudinal-view/dist/longitudinal-view.min.js');
  },

  app: function(app, conf) {
    app.get('/\\$longitudinal-view/*', function(req, res) {
      res.sendfile(rootDir + req.params[0]);
    });
  }
};