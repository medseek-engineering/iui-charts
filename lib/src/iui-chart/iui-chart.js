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
      
      vm.chartData = chartMetrics.sort(chartService.eventsFirst);
      updatePosition();
    }

    function updateTrendMetric(metric) {
      var metricDomain = chartService.buildDomain(metric[metric.recordsProperty], metric.metricProperties);

      var eventMetrics = vm.chartData.filter(function(metric) { return metric.type === 'event'; });

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

      vm.chartData.forEach(function(metric, metricIndex) {
        if (metric.type === 'event') {
          updateEventMetric(metric, metricIndex);
        }
        if (metric.type === 'trend') {
          updateTrendMetric(metric);
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

          vm.chartData = chartMetrics.sort(chartService.eventsFirst);

          vm.chartData.forEach(function(metric, metricIndex) {
            if (metric.type === 'event') {
              metric.circleClass = 'circle-'+metric[vm.settings.dataKeyProperty];
              metric.metricWrap = container
                .append('g')
                .attr('class', 'metric-'+ metricIndex +' metric-event metric-'+metric[vm.settings.dataKeyProperty]);

              updateEventMetric(metric, metricIndex);
            }
            if (metric.type === 'trend') {
              metric.metricProperties.forEach(function(propertyName) {
                metric[propertyName] = {};
                metric[propertyName].pathClass = 'path-'+propertyName;
                metric[propertyName].circleClass = 'circle-'+propertyName;

                metric[propertyName].metricWrap = container
                  .append('g')
                  .attr('class', 'metric-'+ metricIndex +' metric-trend metric-'+propertyName);

                metric[propertyName].path = metric[propertyName].metricWrap
                  .append('path')
                  .attr('class', 'path '+metric[propertyName].pathClass)
                  .datum(metric[metric.recordsProperty]);
              });
              updateTrendMetric(metric);
            }
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
