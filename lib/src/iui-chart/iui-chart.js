(function() {
  'use strict';

  angular.module('iui.chart', [])
    .directive('iuiChart', iuiChart);

  function iuiChart() {
    var directive = {
      scope: {
        chartData: '=',
        displayFields: '=',
        chartSettings: '='
      },
      link: chartLink,
      restrict: 'EA',
      replace: true,
      templateUrl: '/$iui-charts/iui-chart/iui-chart.html'
    };
    return directive;
  }


  // default settings for the chart
  var settings = {
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


  var container,
      outerPlotArea,
      plotArea,
      chart,
      zoom,
      height,
      width,
      minDate,
      maxDate,
      xScale,
      eventMetrics,
      trendMetrics;

  var xAxis,
      localeFormatter,
      largeTickFormat,
      smallTickFormat,
      smallTicksScale,
      largeTicksScale,
      largeTicks,
      smallTicks,
      largeTicksXAxis,
      smallTicksXAxis;

  localeFormatter = d3.locale({
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
  });

  largeTickFormat = localeFormatter.timeFormat.multi([
      ['%I:%M%p', function(d) { return d.getMinutes(); }],
      ['%I%p', function(d) { return d.getHours(); }],
      ['%a %d', function(d) { return d.getDay() && d.getDate() !== 1; }],
      ['%b %d', function(d) { return d.getDate() !== 1; }],
      ['%B', function(d) { return d.getMonth(); }],
      ['%Y', function() { return true; }]
  ]);

  var chartData = [];

  width =   settings.w -
            settings.margin.left -
            settings.margin.right;

  height =  settings.h -
            settings.margin.top -
            settings.margin.bottom;


  function chartLink(scope, elem, attr) {

    _.extend(settings, scope.chartSettings);

    chartData = mapDataToDisplayFields(
                  scope.chartSettings.dataKeyProperty,
                  scope.chartData,
                  scope.displayFields);

    var sortedChartData = cleanDatesAndSort(chartData);
    createChart(elem[0], sortedChartData);

    scope.$watch('[chartData, displayFields]', watchChartData, true);

    function watchChartData(newVal, oldVal) {
      if (newVal !== oldVal) {
        var newChartData = newVal[0];
        var newDisplayFields = newVal[1];
        chartData = mapDataToDisplayFields(
                      scope.chartSettings.dataKeyProperty,
                      newChartData,
                      newDisplayFields);
        var sortedChartData = cleanDatesAndSort(chartData);
        updateData(sortedChartData);
      }
    }
  }

  function mapDataToDisplayFields(dataKeyProperty, newChartData, displayFields) {
    return newChartData.map(function(chartMetric) {

      var search = {
        key: chartMetric[settings.dataKeyProperty]
      };

      var displayField =
            _.findWhere(displayFields, search);

      var existingMetric =
            _.findWhere(chartData, search);

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

  function setMinMaxDates(chartMetrics) {
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
    minDate = new Date(minN - settings.datePadding);
    maxDate = new Date(maxN + settings.datePadding);

    return [minDate, maxDate];
  }

  function splitMetrics(chartMetrics) {
    eventMetrics = chartMetrics.filter(function(metric) {
      return !metric.metricProperties || !metric.metricProperties.length;
    });

    trendMetrics = chartMetrics.filter(function(metric) {
      return metric.metricProperties && metric.metricProperties.length;
    });
  }

  function updateTrendMetric(metric) {
    var metricDomain = buildDomain(metric[metric.recordsProperty], metric.metricProperties);

    var metricYScale = d3.scale.linear()
      .domain(d3.extent(metricDomain))
      .range([height, (eventMetrics.length)*settings.eventMetricHeight]);

    metric.metricProperties.forEach(function(propertyName) {

      var metricLine = d3.svg.line()
        .x(function(d) {
          return xScale(d[settings.metric.dateProperty]);
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
    metric.circles = metric.metricWrap
      .selectAll('.'+metric.circleClass)
      .data(metric[metric.recordsProperty]);

    metric.circles
      .enter()
      .append('circle')
      .classed('circle '+metric.circleClass, true);
    
    metric.circles
      .attr('cx', function(d){
        return xScale(d[settings.metric.dateProperty]);
      })
      .attr('cy', function(d) {
        return settings.eventMetricHeight * metricIndex;
      })
      .attr('r', 0)
      .transition()
      .attr('r', 20);

    metric.circles
      .exit()
      .transition()
      .attr('r', 0)
      .remove();
  }


  function updateData(chartMetrics) {

    var minMaxDates = setMinMaxDates(chartMetrics);
    xScale.domain(minMaxDates);
    
    splitMetrics(chartMetrics);
    updatePosition();
    updateZoomFromChart();
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

        var minMaxDates = setMinMaxDates(chartMetrics);

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
          .tickPadding(10)
          .tickFormat(largeTickFormat);

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


        splitMetrics(chartData);

        eventMetrics.forEach(function(metric, metricIndex) {
          metric.circleClass = 'circle-'+metric[settings.dataKeyProperty];
          metric.metricWrap = container
            .append('g')
            .attr('class', 'metric-event metric-'+metric[settings.dataKeyProperty]);
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
          .attr('width', settings.w)
          .attr('height', settings.h)
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
      .attr('viewBox', '0 0 ' + settings.w +' ' + settings.h);

    plotArea = outerPlotArea.append('g')
      .attr('transform',
            'translate(' +
            settings.margin.left +
            ', ' +
            settings.margin.top +
            ')');

    plotArea
      .datum(chartData)
      .call(buildChart);
  }

})();

