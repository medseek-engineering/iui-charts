(function() {
  'use strict';
  angular.module('iui.charts', ['iui.chart','iui.chartTemplates']);
})();
(function() {
  'use strict';

  angular.module('iui.chart', []);

})();
(function() {
  'use strict';
  angular.module('iui.chart')
    .factory('chartService', chartService);

  function chartService() {
    var service = {
      mapDataToDisplayFields:   mapDataToDisplayFields,
      cleanDatesAndSort:        cleanDatesAndSort,
      buildDomain:              buildDomain,
      getMinMaxDates:           getMinMaxDates,
      getCeilingYPosition:      getCeilingYPosition,
      addShadowFilter:          addShadowFilter
    };
    return service;

    function mapDataToDisplayFields(chartData, displayFields, settings) {
      return chartData.map(function(chartMetric) {
               var search = { key: chartMetric[settings.dataKeyProperty] };
               var displayField = _.findWhere(displayFields, search);
               return _.extend({}, settings.metric, chartMetric, displayField);
             });
    }

    function cleanDatesAndSort(chartMetrics) {
      chartMetrics.forEach(function(metric) {
        // clean dates
        metric[metric.recordsProperty].forEach(function(reading, readingIndex) {
          reading[metric.dateProperty] = new Date(reading[metric.dateProperty]); 
        });
        metric[metric.recordsProperty].sort(function(a,b){
          // Turn your strings into dates, and then subtract them
          // to get a value that is either negative, positive, or zero.
          return new Date(b[metric.dateProperty]) - new Date(a[metric.dateProperty]);
        });
      });
      return chartMetrics;
    }

    function buildDomain(dataset, metrics) {
      var fullDomain=[];
      dataset.forEach(function (datum) {
        metrics.forEach(function(metric) {
          fullDomain.push(datum[metric]);
        });
      });

      // adding 0 to the domain allows us to set a floor of 0
      fullDomain.push(0);
      return fullDomain;
    }

    function getMinMaxDates(chartMetrics, settings) {
      var dates =
        _.chain(chartMetrics)
          .reduce(function(a,b) {
            return a.concat(b[b.recordsProperty]);
          }, [])
          .pluck(settings.metric.dateProperty)
          .value();

      var dateRange = d3.extent(dates);
      var minN = dateRange[0].getTime();
      var maxN = dateRange[1].getTime();

      // + or - one day
      var minDate = new Date(minN - settings.datePadding);
      var maxDate = new Date(maxN + settings.datePadding);

      return [minDate, maxDate];
    }

    function getCeilingYPosition(chartMetrics, settings) {
      var eventMetrics = chartMetrics.filter(function(metric) { 
        return metric.type === 'event'; 
      });

      return eventMetrics.length *
        (settings.eventMetricHeight + settings.eventMetricSpacing);
    }

    function addShadowFilter(defs) {

      // create filter with id #drop-shadow
      // height=150% so that the shadow is not clipped
      var filter = defs.append('filter')
          .attr('id', 'chart_dropShadow')
          .attr('height', '150%');

      // SourceAlpha refers to opacity of graphic that this filter will be applied to
      // convolve that with a Gaussian with standard deviation 3 and store result
      // in blur
      filter.append('feGaussianBlur')
        .attr('in', 'SourceAlpha')
        .attr('stdDeviation', 2)
        .attr('result', 'blur');

      // translate output of Gaussian blur to the right and downwards with 2px
      // store result in offsetBlur
      filter.append('feOffset')
        .attr('in', 'blur')
        .attr('dx', 1)
        .attr('dy', 1)
        .attr('result', 'offsetBlur');

      var componentTransfer =
        filter.append('feComponentTransfer')
        .attr('in', 'offsetBlur')
        .attr('result', 'offsetBlurFaded');

      componentTransfer
        .append('feFuncA')
        .attr('type', 'linear')
        .attr('slope', 0.3);
        

      // overlay original SourceGraphic over translated blurred opacity by using
      // feMerge filter. Order of specifying inputs is important!
      var feMerge = filter.append('feMerge');

      feMerge.append('feMergeNode')
        .attr('in', 'offsetBlurFaded');
      feMerge.append('feMergeNode')
        .attr('in', 'SourceGraphic');

    }

  }

})();
function crosshairsComponent () {
  'use strict';
  var target = null,
    series = null,
    xScale = d3.time.scale(),
    yScale = d3.scale.linear(),
    yValue = 'y',
    formatH = null,
    formatV = null;

  var lineH = null,
    lineV = null,
    circle = null,
    calloutH = null,
    calloutV = null;

  var highlight = null;

  function findNearest(xMouse) {

    var nearest = null,
      dx = Number.MAX_VALUE;

    series.forEach(function(data) {

      var xData = data.date,
        xDiff = Math.abs(xMouse.getTime() - xData.getTime());

      if (xDiff < dx) {
        dx = xDiff;
        nearest = data;
      }
    });

    return nearest;
  }

  var crosshairs = function (selection) {

    var root = target.append('g')
      .attr('class', 'crosshairs');

    lineH = root.append('line')
      .attr('class', 'crosshairs horizontal')
      .attr('x1', xScale.range()[0])
      .attr('x2', xScale.range()[1])
      .attr('display', 'none');

    lineV = root.append('line')
      .attr('class', 'crosshairs vertical')
      .attr('y1', yScale.range()[0])
      .attr('y2', yScale.range()[1])
      .attr('display', 'none');

    circle = root.append('circle')
      .attr('class', 'crosshairs circle')
      .attr('r', 6)
      .attr('display', 'none');

    calloutH = root.append('text')
      .attr('class', 'crosshairs callout horizontal')
      .attr('x', xScale.range()[1])
      .attr('style', 'text-anchor: end')
      .attr('display', 'none');

    calloutV = root.append('text')
      .attr('class', 'crosshairs callout vertical')
      .attr('y', '1em')
      .attr('style', 'text-anchor: end')
      .attr('display', 'none');
  };

  var mousemove = function () {

    var xMouse = xScale.invert(d3.mouse(this)[0]),
        nearest = findNearest(xMouse);

    if ((nearest !== null) && (nearest !== highlight)) {

      highlight = nearest;

      var x = xScale(highlight.date),
        y = yScale(highlight[yValue]);

      lineH.attr('y1', y)
        .attr('y2', y);
      lineV.attr('x1', x)
        .attr('x2', x);
      circle.attr('cx', x)
        .attr('cy', y);
      calloutH.attr('y', y)
        .text(formatH(highlight));
      calloutV.attr('x', x)
        .text(formatV(highlight));

      lineH.attr('display', 'inherit');
      lineV.attr('display', 'inherit');
      circle.attr('display', 'inherit');
      calloutH.attr('display', 'inherit');
      calloutV.attr('display', 'inherit');
    }
  };

  function mouseout() {

    highlight = null;

    lineH.attr('display', 'none');
    lineV.attr('display', 'none');
    circle.attr('display', 'none');
    calloutH.attr('display', 'none');
    calloutV.attr('display', 'none');
  }

  crosshairs.target = function (value) {
    if (!arguments.length) {
      return target;
    }

    if (target) {

      target.on('mousemove.crosshairs', null);
      target.on('mouseout.crosshairs', null);
    }

    target = value;

    target.on('mousemove.crosshairs', mousemove);
    target.on('mouseout.crosshairs', mouseout);

    return crosshairs;
  };

  // ... other property accessors omitted, but they'd go here

  return crosshairs;
}
(function() {
  'use strict';


  var defaultChartSettings = {
    dataKeyProperty: 'key',
    metric: {
      recordsProperty: 'records',
      dateProperty: 'date'
    },
    eventMetricHeight: 30,
    eventMetricSpacing: 10,
    datePadding: 8.64e7,
    margin: {
      top: 30,
      right: 30,
      bottom: 10,
      left: 30
    },
    w: 640,
    h: 480
  };


  var chartTimeLabels = {
    localeFormat: {
      'decimal': ',',
      'thousands': '.',
      'grouping': [2],
      'currency': ['$', ''],
      'dateTime': '%a %b %e %X %Y',
      'date': '%b %d, %Y',
      'time': '%I:%M:%S %p',

      'periods':     ['AM', 'PM'],

      'days':        ['Sunday',
                      'Monday',
                      'Tuesday',
                      'Wednesday',
                      'Thursday',
                      'Friday',
                      'Saturday'],

      'shortDays':   ['Sun',
                      'Mon',
                      'Tue',
                      'Wed',
                      'Thu',
                      'Fri',
                      'Sat'],

      'months':      ['January',
                      'February',
                      'March',
                      'April',
                      'May',
                      'June',
                      'July',
                      'August',
                      'September',
                      'October',
                      'November',
                      'December'],

      'shortMonths': ['Jan',
                      'Feb',
                      'Mar',
                      'Apr',
                      'May',
                      'Jun',
                      'Jul',
                      'Aug',
                      'Sep',
                      'Oct',
                      'Nov',
                      'Dec']
    },
    tickFormat: [
      ['%I:%M%p', function(d) { return d.getMinutes(); }],
      ['%I%p', function(d) { return d.getHours(); }],
      ['%a %d', function(d) { return d.getDay() && d.getDate() !== 1; }],
      ['%b %d', function(d) { return d.getDate() !== 1; }],
      ['%B', function(d) { return d.getMonth(); }],
      ['%Y', function() { return true; }]
    ]
  };

  angular.module('iui.chart')
    .value('iuiChartTimeLabels', chartTimeLabels)
    .constant('iuiChartDefaultSettings', defaultChartSettings);

})();
(function() {
  'use strict';

  angular.module('iui.chart')
    .directive('iuiChart', iuiChart);

  function iuiChart() {
    var directive = {
      scope: {
        chartData: '=',
        displayFields: '=',
        chartSettings: '='
      },
      link: chartLink,
      controller: ChartController,
      restrict: 'EA',
      replace: true,
      templateUrl: '/$iui-charts/iui-chart/iui-chart.html'
    };
    return directive;
  }

  function chartLink(scope, elem, attr, ctrl) {

    var chartBuilt = false;

    if (scope.chartData && scope.chartData.length) {
      ctrl.chartData = ctrl.mapDataToDisplayFields(
                         scope.chartData,
                         scope.displayFields,
                         ctrl.settings);

      var sortedChartData = ctrl.cleanDatesAndSort(ctrl.chartData);
      ctrl.createChart(elem[0], sortedChartData);
      chartBuilt = true;
    }

    scope.$watch('[chartData, displayFields]', watchChartData, true);

    function watchChartData(newVal, oldVal) {
      if (newVal !== oldVal) {
        
        var newChartData = newVal[0];
        var newDisplayFields = newVal[1];
        var oldChartData = oldVal[0];

        if (!newChartData ||
            !newChartData.length ||
            !newDisplayFields ||
            !newDisplayFields.length) {
          ctrl.removeChart();
          chartBuilt = false;
          return;
        }

        ctrl.chartData = ctrl.mapDataToDisplayFields(
                           newChartData,
                           newDisplayFields,
                           ctrl.settings);

        var sortedChartData = ctrl.cleanDatesAndSort(ctrl.chartData);

        if (!chartBuilt && newChartData && newChartData.length) {
          ctrl.createChart(elem[0], sortedChartData);
          chartBuilt = true;
        }

        ctrl.updateData(sortedChartData);
      }
    }
  }

  ChartController.$inject = ['$scope', 'iuiChartTimeLabels', 'iuiChartDefaultSettings', 'chartService'];

  function ChartController($scope, iuiChartTimeLabels, iuiChartDefaultSettings, chartService) {

    var outerPlotArea,
        plotArea,
        chartOverlay,
        zoom,
        height,
        width,
        minDate,
        maxDate,
        xScale,
        xAxis,
        localeFormatter,
        largeTickFormat,
        smallTicksScale,
        largeTicksScale,
        largeTicksXAxis,
        smallTicksXAxis;

    var vm = this;

    vm.cleanDatesAndSort = chartService.cleanDatesAndSort;
    vm.mapDataToDisplayFields = chartService.mapDataToDisplayFields;
    vm.createChart = createChart;
    vm.buildChart = buildChart;
    vm.updateData = updateData;
    vm.removeChart = removeChart;
    vm.settings = {};
    vm.chartData = [];

    localeFormatter = d3.locale(iuiChartTimeLabels.localeFormat);
    largeTickFormat = localeFormatter.timeFormat.multi(iuiChartTimeLabels.tickFormat);

    _.extend(vm.settings, iuiChartDefaultSettings, $scope.chartSettings);

    width =   vm.settings.w -
              vm.settings.margin.left -
              vm.settings.margin.right;

    height =  vm.settings.h -
              vm.settings.margin.top -
              vm.settings.margin.bottom;

    function updateData(chartMetrics) {

      var currentMinMax = [minDate, maxDate];
      var minMaxDates = chartService.getMinMaxDates(chartMetrics, vm.settings);
      minDate = minMaxDates[0];
      maxDate = minMaxDates[1];

      // if the date range changes, let's change the scale and reset the zoom
      if (currentMinMax[0].getTime() !== minMaxDates[0].getTime() ||
          currentMinMax[1].getTime() !== minMaxDates[1].getTime()) {

        xScale.domain(minMaxDates);
        updateZoomFromChart();
      }
      
      vm.chartData = chartMetrics;

      plotArea
        .data([vm.chartData])
        .call(updateChart);
    }

    function updateChart(selection) {

      // Update Axis
      largeTicksXAxis.call(largeTicksScale);
      smallTicksXAxis.call(smallTicksScale);

      var metricGroups =
            selection
              .selectAll('.metric-group')
              .data(function(d) {
                      return d; 
                    },
                    function(d) {
                      return d[vm.settings.dataKeyProperty];
                    });

      metricGroups
        .exit()
        .remove();

      metricGroups
        .enter()
        .append('g')
        .attr('class', function(d) {
          return 'metric-group ' +
                 'metric-group-' + d[vm.settings.dataKeyProperty];
        });

      

      var metricCount = 1;

      var eventMetricCount = 0;

      var ceiling = chartService.getCeilingYPosition(vm.chartData, vm.settings);
      var halfMetricHeight = vm.settings.eventMetricHeight/2;

      var chartIconGroups = metricGroups
                              .filter(function(d) {
                                return d.type === 'event' &&
                                       d.xlink &&
                                       d.xlink.length;
                              })
                              .classed('metric-group-event', true);

      chartIconGroups.each(function(metricDatum) {

        var chartIconGroup = d3.select(this);
        var chartIcons   = chartIconGroup
                             .selectAll('.chart-icon')
                             .data(function(d) {
                               return d[d.recordsProperty];
                             });

        chartIcons
          .enter()
          .append('use')
          .attr('xlink:href', function(d) {
            return metricDatum.xlink;
          })
          .attr('class', function() {            
            return 'chart-icon ' +
                   'metric-element-' + metricDatum[vm.settings.dataKeyProperty] + ' ' +
                   'metric-element-' + metricCount + '-event';
          });

        chartIcons
          .attr('x', function(d){
            return xScale(d[vm.settings.metric.dateProperty]);
          })
          .attr('y', function() {
            return (vm.settings.eventMetricHeight +
                    vm.settings.eventMetricSpacing) * eventMetricCount;
          })
          .attr('width', vm.settings.eventMetricHeight)
          .attr('height', vm.settings.eventMetricHeight)
          .attr('transform', 'translate(-' + halfMetricHeight +
                             ' -' + halfMetricHeight + ')');

        chartIcons
          .exit()
          .remove();

        metricCount = metricCount + 1;
        eventMetricCount = eventMetricCount + 1;

      });

      var circleGroups =
            metricGroups
              .filter(function(d) {
                return d.type === 'event' &&
                       (!d.xlink || !d.xlink.length);
              })
              .classed('metric-group-event', true);

      circleGroups.each(function(metricDatum) {

        var circleGroup = d3.select(this);
        var circles     = circleGroup
                            .selectAll('.chart-circle')
                            .data(function(d) {
                              return d[d.recordsProperty];
                            });

        circles
          .enter()
          .append('circle')
          .attr('class', function() {            
            return 'chart-circle ' +
                   'metric-element-' + metricDatum[vm.settings.dataKeyProperty] + ' ' +
                   'metric-element-' + metricCount + '-event';
          });

        circles
          .attr('cx', function(d){
            return xScale(d[vm.settings.metric.dateProperty]);
          })
          .attr('cy', function() {
            return (vm.settings.eventMetricHeight +
                    vm.settings.eventMetricSpacing) * eventMetricCount;
          })
          .attr('width', vm.settings.eventMetricHeight)
          .attr('height', vm.settings.eventMetricHeight);

        circles
          .exit()
          .remove();

        metricCount = metricCount + 1;
        eventMetricCount = eventMetricCount + 1;

      });


      var metricTrendGroups =
            metricGroups
              .filter(function(d) {
                return d.type === 'trend' &&
                       d.metricProperties &&
                       d.metricProperties.length;
              })
              .classed('metric-group-trend', true);


      metricTrendGroups.each(function(metricDatum) {

        var metricGroup = d3.select(this);
        

        var metricTrends   =  metricGroup
                                .selectAll('.metric-trend')
                                .data(function(d) {
                                  return d.metricProperties;
                                });
        metricTrends
          .enter()
          .append('g')
          .attr('class', function(d) {
            return 'metric-trend ' +
                   'metric-'+d;
          });

        metricTrends
          .exit()
          .remove();

        var metricDomain =
              chartService.buildDomain(metricDatum[metricDatum.recordsProperty],
                                       metricDatum.metricProperties);

        var metricYScale = d3.scale.linear()
                             .domain(d3.extent(metricDomain))
                             .range([height, ceiling]);

        metricTrends.each(function(metricProperty) {
          var metricTrend = d3.select(this);
          var metricPath   =    metricTrend
                                   .selectAll('.metric-element-' + metricProperty)
                                   .data(function() {
                                     return metricTrends;
                                   });

          var metricLine = d3.svg.line()
              .x(function(d) {
                return xScale(d[vm.settings.metric.dateProperty]);
              })
              .y(function(d) {
                return metricYScale(d[metricProperty]);
              });


          metricPath
            .enter()
            .append('path')
            .attr('class', function(d) {
              return 'chart-path ' +
                     'metric-element-' + metricProperty + ' ' +
                     'metric-element-' + metricCount + '-trend';
            });

          metricPath
              .datum(metricDatum[metricDatum.recordsProperty])
              .attr('d', metricLine);

          metricPath
            .exit()
            .remove();

          metricCount = metricCount + 1;
        
        });

      });

    }

    function updateZoomFromChart() {
      zoom.x(xScale);
      var fullDomain = maxDate - minDate,
          currentDomain = xScale.domain()[1] - xScale.domain()[0];
      var minScale = currentDomain / fullDomain,
          maxScale = minScale * 20;
      zoom.scaleExtent([minScale, maxScale]);
    }

    function buildChart(selection) {
      selection
        .each(function(chartMetrics) {
          var container = d3.select(this);

          var minMaxDates =
                chartService.getMinMaxDates(chartMetrics, vm.settings);
          minDate = minMaxDates[0];
          maxDate = minMaxDates[1];

          xScale = d3.time.scale()
            .domain(minMaxDates)
            .range([0, width]);

          // setup zoom
          zoom = d3.behavior.zoom()
            .x(xScale)
            .on('zoom', function() {
              var x;
              if (xScale.domain()[0] < minDate) {
                x = zoom.translate()[0] -
                    xScale(minDate) +
                    xScale.range()[0];
                zoom.translate([x, 0]);
              } else if (xScale.domain()[1] > maxDate) {
                x = zoom.translate()[0] -
                    xScale(maxDate) +
                    xScale.range()[1];
                zoom.translate([x, 0]);
              }
              container
                .data([vm.chartData])
                .call(updateChart);
            });

          chartOverlay
            .call(zoom);

          smallTicksScale = d3.svg.axis()
            .scale(xScale)
            .orient('top')
            .ticks(20)
            .tickSize(4, 0)
            .tickPadding(10)
            .tickFormat('');

          largeTicksScale = d3.svg.axis()
            .scale(xScale)
            .orient('top')
            .ticks(10)
            .tickSize(10, 0)
            .tickPadding(10);

          xAxis = container
            .append('g')
            .attr('class', 'axis axis-x')
            .attr('transform',
                  'translate(0, '+(height + 0) + ')');

          smallTicksXAxis = xAxis
            .append('g')
            .attr('class', 'ticks-small')
            .call(smallTicksScale);

          largeTicksXAxis = xAxis
            .append('g')
            .attr('class', 'ticks-large')
            .call(largeTicksScale);

          vm.chartData = chartMetrics;

          var ceiling = chartService.getCeilingYPosition(vm.chartData, vm.settings);


          var metricCount = 1;

          container
            .data([vm.chartData])
            .call(updateChart);

          updateZoomFromChart();
        });
    }

    function createChart(chartElement, chartData) {
      outerPlotArea = d3
        .select(chartElement)
        .append('svg')
        .attr('preserveAspectRatio', 'none')
        .attr('viewBox', '0 0 ' + vm.settings.w +' ' + vm.settings.h);

      var defs = outerPlotArea.append('defs');

      chartService.addShadowFilter(defs);

      chartOverlay = outerPlotArea
        .append('g')
        .append('rect')
        .attr('width', vm.settings.w)
        .attr('height', vm.settings.h)
        .attr('class', 'chart-overlay');

      plotArea = outerPlotArea.append('g')
        .attr('transform',
              'translate(' +
              vm.settings.margin.left +
              ', ' +
              vm.settings.margin.top +
              ')');

      plotArea
        .datum(chartData)
        .call(buildChart);
    }

    function removeChart() {
      outerPlotArea.remove();
    }

  }

})();

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
