angular.module('testing', [
  'collection.resource',
  'ngMock'
]);

describe('Property casting', function() {

  var api;
  var httpBackend;

  beforeEach(module('testing'));

  beforeEach(inject(function (Resource, $injector) {
    api = new Resource({
      url: '/users',

      casts: {
        joined_on: 'date',
        accessed: 'date',

        settings: function(val, object) {
          if ( ! angular.isObject(val)) {
            return angular.fromJson(val);
          }
          return val;
        },

        bool: function(val) {
          if (val == undefined) {
            return false;
          }
          else if (val == '0') {
            return false;
          }
          return true;
        }
      }
    });

    httpBackend = $injector.get('$httpBackend');
  }));

  afterEach(function() {
    httpBackend.verifyNoOutstandingExpectation();
    httpBackend.verifyNoOutstandingRequest();
  });

  it ("gets model by id using /resource/{id} url", function() {

    api.get(10).thenData(function(response) {
      expect(response.id).toBe(10);
      expect(response.settings).toEqual({test: 12});
      expect(response.bool).toBe(true);

      expect(response.joined_on instanceof Date).toBe(true);
      expect(response.joined_on.getFullYear()).toBe(2017);
      expect(response.joined_on.getMonth() + 1).toBe(12);
      expect(response.joined_on.getDate()).toBe(21);
      expect(response.joined_on.getHours()).toBe(12);
      expect(response.joined_on.getMinutes()).toBe(21);
      expect(response.joined_on.getSeconds()).toBe(12);

      expect(response.accessed instanceof Date).toBe(true);
      expect(response.accessed.getFullYear()).toBe(2017);
      expect(response.accessed.getMonth() + 1).toBe(12);
      expect(response.accessed.getDate()).toBe(21);
    });

    httpBackend.when('GET', '/users/10').respond({
      data: {
        id: 10,
        settings: '{"test": 12}',
        bool: '1',
        joined_on: '2017-12-21 12:21:12',
        accessed: '2017-12-21'
      }
    });
    httpBackend.flush()
  });

});
