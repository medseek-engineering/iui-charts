(function() {
  'use strict';

  angular.module('iui.chart')
    .directive('iuiChart', iuiChart);

  function iuiChart() {
    var directive = {
      scope: {
        chartData: '=',
        displayFields: '=',
        chartSettings: '=',
        dateRange: '='
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


    scope.$watch('[chartData, displayFields, dateRange]', watchChartData, true);

    function watchChartData(newVal, oldVal) {
      if (newVal !== oldVal) {
        
        var newChartData     =  newVal[0];
        var newDisplayFields =  newVal[1];
        var newDateRange     =  newVal[2];
        var oldChartData     =  oldVal[0];

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

        ctrl.updateData(sortedChartData, newDateRange);
      }
    }
  }

  ChartController.$inject = [ '$scope',
                              'iuiChartTimeLabels',
                              'iuiChartDefaultSettings',
                              'chartService' ];

  function ChartController(    $scope,
                               iuiChartTimeLabels,
                               iuiChartDefaultSettings,
                               chartService ) {

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

    function updateData(chartMetrics, dateRange) {

      var dateRangeWithMinAndMaxConsidered = setDateRange(dateRange, chartMetrics);

      xScale.domain(dateRangeWithMinAndMaxConsidered);
      updateZoomFromChart();
      
      vm.chartData = chartMetrics;

      plotArea
        .data([vm.chartData])
        .call(updateChart);
    }

    function padDates(dateRange) {

      var min = new Date(dateRange[0]);
      var max = new Date(dateRange[1]);

      var minN = min.getTime();
      var maxN = max.getTime();

      // + or - one day
      var minDate = new Date(minN - vm.settings.datePadding);
      var maxDate = new Date(maxN + vm.settings.datePadding);

      return [minDate, maxDate];
    }

    function setDateRange(newDateRange, chartMetrics) {
      var minMaxDates = chartService.getMinMaxDates(chartMetrics, vm.settings),

          fromDate    = (newDateRange && newDateRange.from) ? newDateRange.from
                                                            : minMaxDates[0],

          toDate      = (newDateRange && newDateRange.to)   ? newDateRange.to
                                                            : minMaxDates[1];

      var paddedMinMax    = padDates(minMaxDates);
      var paddedDateRange  = padDates([fromDate, toDate]);

      // if the passed in date range is greater than the 
      // min or max data in the data, then we use the more extreme

      minDate = (paddedMinMax[0].getTime()     <
                 paddedDateRange[0].getTime()) ? paddedMinMax[0]
                                               : paddedDateRange[0];

      maxDate = (paddedMinMax[1].getTime()     >
                 paddedDateRange[1].getTime()) ? paddedMinMax[1]
                                               : paddedDateRange[1];

      return paddedDateRange;
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

      var circleGroups =
            metricGroups
              .filter(function(d) {
                return d.type === 'event';
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
          .attr('r', vm.settings.eventMetricHeight/2);

        circles
          .exit()
          .remove();

        metricCount = metricCount + 1;
        eventMetricCount = eventMetricCount + 1;

      });

    }

    function updateZoomFromChart() {
      zoom.x(xScale);
      var fullDomain = maxDate - minDate,
          currentDomain = xScale.domain()[1] - xScale.domain()[0];
      var minScale = currentDomain / fullDomain,
          maxScale = currentDomain/vm.settings.zoomInMax;
      zoom.scaleExtent([minScale, maxScale]);
    }

    function buildChart(selection) {
      selection
        .each(function(chartMetrics) {
          var container = d3.select(this);

          var minMaxDates = setDateRange($scope.dateRange, chartMetrics);

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

      plotArea = outerPlotArea.append('g')
        .attr('transform',
              'translate(' +
              vm.settings.margin.left +
              ', ' +
              vm.settings.margin.top +
              ')');

      chartOverlay = outerPlotArea
        .append('g')
        .append('rect')
        .attr('width', vm.settings.w)
        .attr('height', vm.settings.h)
        .attr('class', 'chart-overlay');

      plotArea
        .datum(chartData)
        .call(buildChart);

    }

    function removeChart() {
      outerPlotArea.remove();
    }

  }

})();
