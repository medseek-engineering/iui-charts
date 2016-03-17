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
      return displayFields
               .map(function(displayField) {
                 var search = {};
                 search[settings.dataKeyProperty] = displayField.key;
                 var chartDatum = _.findWhere(chartData, search);
                 return _.extend({}, settings.metric, chartDatum, displayField);
               })
               .filter(function(metric) {
                 return metric[metric.recordsProperty];
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