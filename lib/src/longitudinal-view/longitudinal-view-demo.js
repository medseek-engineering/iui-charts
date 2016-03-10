(function() {
  'use strict';

  var settings = {
    margin: {
      top: 40,
      right: 40,
      bottom: 40,
      left: 40
    },
    w: 800,
    h: 600
  };

  var chartElement = '#chartArea';

  var outerPlotArea,
      plotArea,
      chart,
      eventMetricHeight = 30,
      circlesOnLinesTimeDifference = 5097600000,
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

  var chartData = [
    {
      Key: 'weights',
      metricProperties: ['weight'],
      type: 'trend',
      Records: [
        {
          'date': '2014-12-31T15:55:17',
          'bmi': 22.24,
          'weight': 120
        },
        {
          'date': '2016-01-06T15:55:17',
          'bmi': 22.24,
          'weight': 155
        },
        {
          'date': '2016-01-07T15:55:17',
          'bmi': 22.24,
          'weight': 200
        },
        {
          'date': '2016-01-09T15:55:17',
          'bmi': 22.24,
          'weight': 200
        },
        {
          'date': '2016-01-11T15:55:17',
          'bmi': 22.24,
          'weight': 195
        }
      ]
    },
    {
      Key: 'bloodPressures',
      metricProperties: ['systolic', 'diastolic'],
      type: 'trend',
      Records: [
        {
          'id': '791',
          'date': '2016-01-06T18:10:39',
          'pulse': '120',
          'systolic': 130,
          'diastolic': 110
        },
        {
          'id': '828',
          'date': '2016-01-07T15:56:15',
          'pulse': '120',
          'systolic': 125,
          'diastolic': 110
        },
        {
          'id': '1195',
          'date': '2016-01-08T13:50:50',
          'pulse': '88',
          'systolic': 117,
          'diastolic': 76
        },
        {
          'id': '198',
          'systolic': 120,
          'diastolic': 70,
          'pulse': '72',
          'date': '2016-01-09T09:53:00'
        },
        {
          'id': '198',
          'systolic': 104,
          'diastolic': 70,
          'pulse': '72',
          'date': '2016-01-10T09:53:00'
        },
        {
          'id': '198',
          'systolic': 140,
          'diastolic': 90,
          'pulse': '72',
          'date': '2016-01-11T09:53:00'
        },
        {
          'id': '198',
          'systolic': 170,
          'diastolic': 120,
          'pulse': '72',
          'date': '2016-01-12T09:53:00'
        },
        {
          'id': '198',
          'systolic': 195,
          'diastolic': 140,
          'pulse': '72',
          'date': '2016-01-13T09:53:00'
        }
      ]
    },
    {
      Key: 'medications',
      type: 'event',
      Records: [
        {
          'date': '2016-01-05T19:55:17'
        },
        {
          'date': '2016-01-07T05:55:17'
        },
        {
          'date': '2016-01-08T20:55:17'
        },
        {
          'date': '2016-01-10T04:55:17'
        },
        {
          'date': '2016-01-11T09:55:17'
        },
        {
          'date': '2016-01-12T18:55:17'
        }
      ]
    },
    {
      Key: 'encounter',
      type: 'event',
      Records: [
        {
          'date': '2016-01-05T15:55:17'
        },
        {
          'date': '2016-01-07T15:55:17'
        },
        {
          'date': '2016-01-08T15:55:17'
        },
        {
          'date': '2016-01-10T15:55:17'
        },
        {
          'date': '2016-01-11T15:55:17'
        },
        {
          'date': '2016-01-12T15:55:17'
        }
      ]
    },
    {
      Key: 'tasks',
      type: 'event',
      Records: [
        {
          'date': '2016-01-09T09:55:17'
        },
        {
          'date': '2016-01-08T19:55:17'
        },
        {
          'date': '2016-01-12T15:55:17'
        }
      ]
    }
  ];

  width =   settings.w -
            settings.margin.left -
            settings.margin.right;

  height =  settings.h -
            settings.margin.top -
            settings.margin.bottom;

  function cleanDatesAndSort(chartMetrics) {
    _.each(chartMetrics, function(metric) {
      // clean dates
      _.each(metric.Records, function(reading, readingIndex) {
        reading.date = new Date(reading.date); 
      });
      metric.Records.sort(function(a,b){
        // Turn your strings into dates, and then subtract them
        // to get a value that is either negative, positive, or zero.
        return new Date(b.date) - new Date(a.date);
      });
    });
  }

  function buildDomain(dataset, metrics) {
    var fullDomain=[];
    _.each(dataset, function (datum) {
      _.each(metrics, function(metric) {
        fullDomain.push(datum[metric]);
      });
    });
    
    fullDomain.push(0);
    return fullDomain;
  }

  function enterCircle(selection, className, metricY) {
    selection
      .enter()
      .append('circle')
      .classed('circle '+className, true);
    
    selection
      .attr('cx', function(d){
        return xScale(d.date);
      })
      .attr('cy', metricY)
      .attr('r', 0)
      .transition()
      .attr('r', 20);


    selection
      .exit()
      .transition()
      .attr('r', 0)
      .remove();
      
  }

  function setDates(chartMetrics) {
    var dates =
      _.chain(chartMetrics)
        .reduce(function(a,b) {
          return a.concat(b.Records);
        }, [])
        .pluck('date')
        .value();

    var dateRange = d3.extent(dates);

    var minN = dateRange[0].getTime();
    var maxN = dateRange[1].getTime();

    // + or - one day
    minDate = new Date(minN - 8.64e7);
    maxDate = new Date(maxN + 8.64e7);
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
    var metricDomain = buildDomain(metric.Records, metric.metricProperties);

    var metricYScale = d3.scale.linear()
      .domain(d3.extent(metricDomain))
      .range([height, (eventMetrics.length)*eventMetricHeight]);

    _.each(metric.metricProperties, function(propertyName) {

      var metricLine = d3.svg.line()
        .x(function(d) {
          return xScale(d.date);
        })
        .y(function(d) {
          return metricYScale(d[propertyName]);
        });

      metric[propertyName].path
        .datum(metric.Records)
        .attr('d', metricLine);

      // metric[propertyName].metricWrap
      //     .selectAll('.'+metric[propertyName].circleClass)
      //     .data(metric.Records)
      //     .call(enterCircle, metric[propertyName].circleClass, function(d) {
      //     return metricYScale(d[propertyName]);
      //   });

    });
  }

  function updateEventMetric(metric, metricIndex) {
    metric.circles = metric.metricWrap
      .selectAll('.'+metric.circleClass)
      .data(metric.Records)
      .call(enterCircle, metric.circleClass, function(d) {
        return eventMetricHeight * metricIndex;
      });
  }

  function update(chartMetrics) {

    cleanDatesAndSort(chartMetrics);
    splitMetrics(chartMetrics);
    
    _.each(trendMetrics, function(metric) {
      updateTrendMetric(metric);
    });
    _.each(eventMetrics, function(metric, metricIndex) {
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

  function makeChart(selection) {
    var container;
    selection
      .each(function(chartMetrics) {
        container = d3.select(this);

        cleanDatesAndSort(chartMetrics);
        splitMetrics(chartMetrics);
        setDates(chartMetrics);

        xScale = d3.time.scale()
          .domain([minDate, maxDate])
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

        eventMetrics.forEach(function(metric, metricIndex) {
          metric.circleClass = 'circle-'+metric.Key;
          metric.metricWrap = container
            .append('g')
            .attr('class', 'metric-event metric-'+metric.Key);
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
              .datum(metric.Records);
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
            update(chartMetrics);
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
    .call(makeChart);

})();


