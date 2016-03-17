(function() {
  'use strict';
  var healthInformation = {
    settings: {
      dataKeyProperty: 'Key',
      metric: {
        recordsProperty: 'Records',
        dateProperty: 'date'
      }
    },
    displayFields: [
      {
        key: 'bloodGlucose',
        metricProperties: ['glucose'],
        type: 'trend'
      },
      {
        key: 'medications',
        type: 'event'
      },
      {
        key: 'weights',
        metricProperties: ['weight'],
        type: 'trend'
      },
      {
        key: 'cholesterol',
        metricProperties: ['level'],
        type: 'trend'
      },
      {
        key: 'immunizations',
        type: 'event'
      },
      {
        key: 'bloodPressures',
        metricProperties: ['systolic', 'diastolic'],
        type: 'trend'
      },
      {
        key: 'encounter',
        type: 'event'
      },
      {
        key: 'tasks',
        type: 'event'
      },
      {
        key: 'procedures',
        type: 'event'
      }
    ],
    data: []
  };

  angular.module('app', ['iui.charts'])
    .controller('ExampleController', ExampleController)
    .value('healthInformation', healthInformation);

  ExampleController.$inject = ['healthInformation'];

  var healthInformationData = [
    {
      Key: 'bloodGlucose',
      Records: [
        {
          "id": "825",
          "active": "true",
          "exported": "false",
          "date": "2015-10-06T15:54:09",
          "glucose": 120,
          "markAsPrivate": false,
          "markedBy": "",
          "isExternal": false
        },
        {
          "id": "826",
          "active": "true",
          "exported": "false",
          "date": "2015-11-06T15:54:09",
          "glucose": 100,
          "markAsPrivate": false,
          "markedBy": "",
          "isExternal": false
        },
        {
          "id": "827",
          "active": "true",
          "exported": "false",
          "date": "2015-12-06T15:54:09",
          "glucose": 105,
          "markAsPrivate": false,
          "markedBy": "",
          "isExternal": false
        }
      ]
    },
    {
      Key: 'immunizations',
      Records: [
        {
          "id": "1561",
          "active": "true",
          "name": "cholera",
          "date": "2016-03-09T00:00:00"
        },
        {
          "id": "1633",
          "active": "true",
          "name": "vaccinia (smallpox)",
          "date": "2016-03-15T01:00:00"
        }
      ]
    },
    {
      Key: 'bloodPressures',
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
      Key: 'weights',
      Records: [
        {
          'date': '2015-12-31T15:55:17',
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
      Key: 'encounter',
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
      Key: 'cholesterol',
      Records:[
        {
          "id": "826",
          "active": "true",
          "exported": "false",
          "date": "2015-10-06T15:54:37",
          "hdl": "120",
          "ldl": "25",
          "tryglicerides": "25",
          "level": 150
        },
        {
          "id": "1193",
          "active": "true",
          "exported": "false",
          "date": "2015-10-16T13:37:56",
          "hdl": "150",
          "ldl": "150",
          "tryglicerides": "150",
          "level": 330
        }
      ]
    },
    {
      Key: 'tasks',
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
    },
    {
      Key: 'procedures',
      Records: [
        {
          "id": "829",
          "name": "Photo tests",
          "date": "2015-10-06T00:00:00"
        },
        {
          "id": "1634",
          "name": "MRI study",
          "date": "2016-03-15T01:00:00",
          "comments": "TEST"
        }
      ]
    }
  ];

  function ExampleController(healthInformation) {
    var vm = this;
    vm.healthInformation = healthInformation;
    vm.updateData = updateData;
    updateData();

    function updateData() {
      healthInformation.data = angular.copy(healthInformationData);
    }

  }
})();