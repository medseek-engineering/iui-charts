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