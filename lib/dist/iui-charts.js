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
      getMinMaxDates:           getMinMaxDates
    };
    return service;

    function mapDataToDisplayFields(existingChartData, newChartData, displayFields, settings) {
      return newChartData.map(function(chartMetric) {
        var search = {
          key: chartMetric[settings.dataKeyProperty]
        };

        var displayField =
              _.findWhere(displayFields, search);

        var existingMetric =
              _.findWhere(existingChartData, search);

        if (!displayField) {
          if (existingMetric) {
            chartMetric[existingMetric.recordsProperty] = [];
          } else {
            chartMetric[settings.recordsProperty] = [];
          }
        }

        return _.extend({}, settings.metric, existingMetric, chartMetric, displayField);
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
    datePadding: 8.64e7,
    margin: {
      top: 40,
      right: 40,
      bottom: 40,
      left: 40
    },
    w: 800,
    h: 600
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
    ctrl.chartData = ctrl.mapDataToDisplayFields(
                  ctrl.chartData,
                  scope.chartData,
                  scope.displayFields,
                  ctrl.settings);

    var sortedChartData = ctrl.cleanDatesAndSort(ctrl.chartData);

    ctrl.createChart(elem[0], sortedChartData);

    scope.$watch('[chartData, displayFields]', watchChartData, true);

    function watchChartData(newVal, oldVal) {
      if (newVal !== oldVal) {
        var newChartData = newVal[0];
        var newDisplayFields = newVal[1];
        var oldChartData = oldVal[0];
        ctrl.chartData = ctrl.mapDataToDisplayFields(
                      ctrl.chartData,
                      newChartData,
                      newDisplayFields,
                      ctrl.settings);

        var sortedChartData = ctrl.cleanDatesAndSort(ctrl.chartData);

        ctrl.updateData(sortedChartData);
      }
    }
  }

  ChartController.$inject = ['$scope', 'iuiChartTimeLabels', 'iuiChartDefaultSettings', 'chartService'];

  function ChartController($scope, iuiChartTimeLabels, iuiChartDefaultSettings, chartService) {

    var container,
        outerPlotArea,
        plotArea,
        zoom,
        height,
        width,
        minDate,
        maxDate,
        xScale,
        xAxis,
        trendMetrics = [],
        eventMetrics = [],
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
      
      splitMetrics(chartMetrics);
      updatePosition();
    }

    function splitMetrics(chartMetrics) {
      eventMetrics = chartMetrics.filter(function(metric) {
        return !metric.metricProperties || !metric.metricProperties.length;
      });

      trendMetrics = chartMetrics.filter(function(metric) {
        return metric.metricProperties && metric.metricProperties.length;
      });

      return chartMetrics;
    }

    function updateTrendMetric(metric) {
      var metricDomain = chartService.buildDomain(metric[metric.recordsProperty], metric.metricProperties);

      var metricYScale = d3.scale.linear()
        .domain(d3.extent(metricDomain))
        .range([height, (eventMetrics.length)*vm.settings.eventMetricHeight]);

      metric.metricProperties.forEach(function(propertyName) {

        var metricLine = d3.svg.line()
          .x(function(d) {
            return xScale(d[vm.settings.metric.dateProperty]);
          })
          .y(function(d) {
            return metricYScale(d[propertyName]);
          });

        metric[propertyName].path
          .datum(metric[metric.recordsProperty])
          .attr('d', metricLine);

        // metric[propertyName].metricWrap
        //     .selectAll('.'+metric[propertyName].circleClass)
        //     .data(metric[metric.recordsProperty])
        //     .call(enterCircle, metric[propertyName].circleClass, function(d) {
        //     return metricYScale(d[propertyName]);
        //   });

      });
    }

    function updateEventMetric(metric, metricIndex) {
      var circles =
        metric.metricWrap
          .selectAll('.'+metric.circleClass)
          .data(metric[metric.recordsProperty]);

      circles
        .enter()
        .append('circle')
        .classed('circle '+metric.circleClass, true);
      
      circles
        .attr('cx', function(d){
          return xScale(d[vm.settings.metric.dateProperty]);
        })
        .attr('cy', function(d) {
          return vm.settings.eventMetricHeight * metricIndex;
        })
        .attr('r', 0)
        .transition()
        .attr('r', 20);

      circles
        .exit()
        .transition()
        .attr('r', 0)
        .remove();
    }

    function updatePosition() {
      trendMetrics.forEach(function(metric) {
        updateTrendMetric(metric);
      });

      eventMetrics.forEach(function(metric, metricIndex) {
        updateEventMetric(metric, metricIndex);
      });

      largeTicksXAxis.call(largeTicksScale);
      smallTicksXAxis.call(smallTicksScale);
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
          container = d3.select(this);

          var minMaxDates = chartService.getMinMaxDates(chartMetrics, vm.settings);
          minDate = minMaxDates[0];
          maxDate = minMaxDates[1];

          xScale = d3.time.scale()
            .domain(minMaxDates)
            .range([0, width]);

          smallTicksScale = d3.svg.axis()
            .scale(xScale)
            .orient('bottom')
            .ticks(20)
            .tickSize(4, 0)
            .tickPadding(10)
            .tickFormat('');

          largeTicksScale = d3.svg.axis()
            .scale(xScale)
            .orient('bottom')
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

          vm.chartData = splitMetrics(chartMetrics);

          eventMetrics.forEach(function(metric, metricIndex) {
            metric.circleClass = 'circle-'+metric[vm.settings.dataKeyProperty];
            metric.metricWrap = container
              .append('g')
              .attr('class', 'metric-event metric-'+metric[vm.settings.dataKeyProperty]);

            updateEventMetric(metric, metricIndex);
          });

          trendMetrics.forEach(function(metric) {
            metric.metricProperties.forEach(function(propertyName) {
              metric[propertyName] = {};
              metric[propertyName].pathClass = 'path-'+propertyName;
              metric[propertyName].circleClass = 'circle-'+propertyName;

              metric[propertyName].metricWrap = container
                .append('g')
                .attr('class', 'metric-trend metric-'+propertyName);

              metric[propertyName].path = metric[propertyName].metricWrap
                .append('path')
                .attr('class', 'path '+metric[propertyName].pathClass)
                .datum(metric[metric.recordsProperty]);
            });

            updateTrendMetric(metric);
          });

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
              updatePosition();
            });

          outerPlotArea
            .append('g')
            .append('rect')
            .attr('width', vm.settings.w)
            .attr('height', vm.settings.h)
            .attr('class', 'chart-overlay')
            .call(zoom);

          updateZoomFromChart();
        });
    }

    function createChart(chartElement, chartData) {
      outerPlotArea = d3
        .select(chartElement)
        .append('svg')
        .attr('preserveAspectRatio', 'none')
        .attr('viewBox', '0 0 ' + vm.settings.w +' ' + vm.settings.h);

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
