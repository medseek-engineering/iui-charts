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
                                return d.type === 'event' && d.xlink && d.xlink.length;
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
            var parentDatum = d3.select(this.parentNode).datum();
            return parentDatum.xlink;
          })
          .attr('class', function(d, i, j) {
            var parentDatum = d3.select(this.parentNode).datum();
            
            return 'chart-icon ' +
                   'metric-element-' + parentDatum[vm.settings.dataKeyProperty] + ' ' +
                   'metric-element-' + metricCount;
          });

        chartIcons
          .attr('x', function(d){
            return xScale(d[vm.settings.metric.dateProperty]);
          })
          .attr('y', function(d, i, j) {
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
                     'metric-element-'+metricCount;
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
