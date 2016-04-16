angular.module('testing', [
  'collection.resource',
  'ngMock'
]);

describe('Special promises', function() {

  var api;
  var httpBackend;

  beforeEach(module('testing'));

  beforeEach(inject(function (Resource, $injector) {
    api = new Resource({
      url: '/users'
    });

    httpBackend = $injector.get('$httpBackend');
  }));

  afterEach(function() {
    httpBackend.verifyNoOutstandingExpectation();
    httpBackend.verifyNoOutstandingRequest();
  });

  it ('.fetching()', function() {
    var holder = {
      loading: false
    };

    var promise = api.get(10);

    promise.then(function() {
      expect(holder.loading).toBe(true);
    });

    promise.fetching(holder, 'loading');

    promise.then(function() {
      expect(holder.loading).toBe(false);
    })

    httpBackend.when('GET', '/users/10').respond({
      data: {
        id: 10,
        name: 'test'
      }
    });
    httpBackend.flush()
  });

  it ('.fullTo()', function() {
    var holder = {};

    api.query().fullTo(holder, 'response').then(function() {
      expect(holder.response.data[0].id).toBe(10);
      expect(holder.response.data[0].name).toBe('test');
    })

    httpBackend.when('GET', '/users').respond({
      data: [{
        id: 10,
        name: 'test'
      }]
    });
    httpBackend.flush()
  });

  it ('.abort()', function() {
    var promise = api.query()
    promise.then(function() {
      console.log( "This shouldn't be reached" );
    })
    .catch(function(err) {
      expect(err).toBeUndefined()
    })
    httpBackend.when('GET', '/users').respond({
      data: [{id: 10, name: 'test'}]
    });
    promise.abort()
    try {
      httpBackend.flush()
    } catch (error) {
      expect(error.message).toEqual("No pending request to flush !")
    }
  });

  it ('.resolve()', function() {

    api.query().resolve().then(function(response) {
      expect(response[0].id).toBe(10);
      expect(response[0].name).toBe('test');
    })

    httpBackend.when('GET', '/users').respond({
      data: [{id: 10, name: 'test'}]
    });
    httpBackend.flush()
  });

  it ('.bind() lifecycle', function() {
    var event
    var callback

    var scope = {
      $on: function(e, c) {
        event = e
        callback = c
      }
    }

    var promise = api.query()
    expect(promise.bind(scope)).toBe(promise)
    expect(event).toBe('$destroy')
    expect(callback).toBe(promise.abort)

    httpBackend.when('GET', '/users').respond({
      data: [{id: 10, name: 'test'}]
    });
    httpBackend.flush()
  });

});
