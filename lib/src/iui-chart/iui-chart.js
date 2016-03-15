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
                         ctrl.chartData,
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
                           ctrl.chartData,
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
      
      vm.chartData = chartMetrics.sort(chartService.eventsFirst);
      updatePosition();
    }

    function updateTrendMetric(metric, ceiling) {
      var metricDomain = 
            chartService
              .buildDomain(metric[metric.recordsProperty],
                           metric.metricProperties);

      var metricYScale = d3.scale.linear()
        .domain(d3.extent(metricDomain))
        .range([height, ceiling]);

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
      });
    }

    function updateEventMetric(metric, metricIndex) {

      var metricDataPoints =
        metric.metricWrap
          .selectAll('.'+metric.className)
          .data(metric[metric.recordsProperty]);

      var eventMetricY = (vm.settings.eventMetricHeight +
                          vm.settings.eventMetricSpacing) *
                          metricIndex;

      if (metric.xlink && metric.xlink.length) {
        // if we are using icons to represent data points

        var halfMetricHeight = vm.settings.eventMetricHeight/2;

        metricDataPoints
          .enter()
          .append('use')
          .attr('xlink:href', metric.xlink)
          .classed('chart-icon '+metric.className, true);
        
        metricDataPoints
          .attr('x', function(d){
            return xScale(d[vm.settings.metric.dateProperty]);
          })
          .attr('y', function(d) {
            return eventMetricY;
          })
          .attr('width', vm.settings.eventMetricHeight)
          .attr('height', vm.settings.eventMetricHeight)
          .attr('transform', 'translate(-' + halfMetricHeight +
                             ' -' + halfMetricHeight + ')');

        metricDataPoints
          .exit()
          .transition()
          .remove();

      } else {
        // if no icon symbol defined, we'll use just a circle
        metricDataPoints
          .enter()
          .append('circle')
          .classed('chart-circle '+metric.className, true);

        metricDataPoints
          .attr('cx', function(d){
            return xScale(d[vm.settings.metric.dateProperty]);
          })
          .attr('cy', function(d) {
            return eventMetricY;
          })
          .attr('r', vm.settings.eventMetricHeight);

        metricDataPoints
          .exit()
          .transition()
          .attr('r', 0)
          .remove();
      }

    }

    function updatePosition() {

      var ceiling = chartService.getCeilingYPosition(vm.chartData, vm.settings);

      vm.chartData.forEach(function(metric, metricIndex) {
        if (metric.type === 'event') {
          updateEventMetric(metric, metricIndex);
        }
        if (metric.type === 'trend') {
          updateTrendMetric(metric, ceiling);
        }
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
              updatePosition();
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

          vm.chartData = chartMetrics.sort(chartService.eventsFirst);

          var ceiling = chartService.getCeilingYPosition(vm.chartData, vm.settings);


          var metricCount = 1;

          vm.chartData.forEach(function(metric, metricIndex) {

            if (metric.type === 'event') {
              metric.className = 'metric-'+metric[vm.settings.dataKeyProperty]+'-element';
              metric.metricWrap = container
                .append('g')
                .attr('class', 'metric-index-' + metricCount + ' ' +
                               'metric-event ' +
                               'metric-'+metric[vm.settings.dataKeyProperty]);

              updateEventMetric(metric, metricIndex);
              metricCount = metricCount + 1;
            }

            if (metric.type === 'trend') {

              metric.metricWrap = container
                  .append('g')
                  .attr('class', 'metric-trend ' +
                                 'metric-'+metric[vm.settings.dataKeyProperty]);

              metric.metricProperties.forEach(function(propertyName) {
                metric[propertyName] = {};
                metric[propertyName].pathClass = 'path-'+propertyName;
                metric[propertyName].circleClass = 'circle-'+propertyName;

                metric[propertyName].metricWrap = metric.metricWrap
                  .append('g')
                  .attr('class', 'metric-index-' + metricCount + ' ' +
                                 'metric-trend ' +
                                 'metric-'+propertyName);

                metric[propertyName].path = metric[propertyName].metricWrap
                  .append('path')
                  .attr('class', 'chart-path '+metric[propertyName].pathClass)
                  .datum(metric[metric.recordsProperty]);

                // here we are counting up by each property
                metricCount = metricCount + 1;
              });
              updateTrendMetric(metric, ceiling);
            }
          });

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
