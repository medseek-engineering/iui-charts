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
      eventsFirst:              eventsFirst
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

    function eventsFirst(a, b) {
      if (a.type === 'event' && b.type !== 'event') {
        return -1;
      }
      else if (a.type === 'event' && b.type === 'event') {
        return 0;
      }
      else {
        return 1;
      }
    }

  }

})();