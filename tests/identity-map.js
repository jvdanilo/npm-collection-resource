angular.module('testing', [
  'collection.resource',
  'ngMock'
]);

describe('Identity map', function() {

  var api;
  var httpBackend;

  beforeEach(module('testing'));

  beforeEach(inject(function (Resource, $injector) {
    api = new Resource({url: '/users', references: true});

    httpBackend = $injector.get('$httpBackend');
  }));

  afterEach(function() {
    httpBackend.verifyNoOutstandingExpectation();
    httpBackend.verifyNoOutstandingRequest();
  });

  it('push items into local memory and fetch with get', function() {
    var item = {id: 10, name: 'test'};
    api.push(item);
    expect(api.$loaded[10]).toBe(item);
    api.get(10).then(function(response) {
      expect(response.data).toBe(item);
    });
  });

  it('fetch local and request reloaded', function() {
    var callback;
    setTimeout = function(c, delay) {
      if ( ! delay) {
        callback = c;
      }
    };

    var item = {id: 10, name: 'test'};

    api.push(item);

    api.get(10, {reload: true}).then(function(response) {
      expect(response.data).toBe(item);
      return callback();
    })
    .then(function() {
      expect(item.id).toBe(10);
      expect(item.name).toBe('test');
      expect(item.last).toBe('test');
    });

    httpBackend.expectGET('/users/10')
      .respond({data: {id: 10, last: 'test'}});

    httpBackend.flush();
  });

  it('query API and push into memory', function() {
    var items = [];

    api.query({enabled:true})
      .to(items)
      .then(function() {

        expect(items[0].id).toBe(10);
        expect(items[1].id).toBe(11);
        expect(items[2].id).toBe(12);

        expect(api.$loaded[10+''].id).toBe(10);
        expect(api.$loaded[11+''].id).toBe(11);
        expect(api.$loaded[12+''].id).toBe(12);
      });

    httpBackend.expectGET('/users?enabled=true').respond({
      data: [
        {id: 10},
        {id: 11},
        {id: 12}
      ]
    });

    httpBackend.flush();
  });

});