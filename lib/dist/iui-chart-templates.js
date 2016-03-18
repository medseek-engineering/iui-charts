(function(module) {
try {
  module = angular.module('iui.chartTemplates');
} catch (e) {
  module = angular.module('iui.chartTemplates', []);
}
module.run(['$templateCache', function($templateCache) {
  $templateCache.put('/$iui-charts/iui-chart/iui-chart.html',
    '<div class="iui-chart"></div>');
}]);
})();
