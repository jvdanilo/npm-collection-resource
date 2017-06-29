angular.module('testing', [
  'collection.resource',
  'ngMock'
])

describe('Basic methods', function () {
  var api
  var httpBackend
  var q

  beforeEach(module('testing'))

  beforeEach(inject(function (Resource, $injector) {
    api = new Resource({
      url: '/users',
      casts: {
        created_at: 'date',
        bool: function (val) {
          if (val == undefined) {
            return false
          } else if (val == '0') {
            return false
          }
          return true
        }
      }
    })

    httpBackend = $injector.get('$httpBackend')
    q = $injector.get('$q')
  }))

  afterEach(function () {
    httpBackend.verifyNoOutstandingExpectation()
    httpBackend.verifyNoOutstandingRequest()
  })

  describe('.get()', function () {
    it('gets model by id using /resource/{id} url', function () {
      api.get(10).then(function (response) {
        expect(response.data.id).toBe(10)
      })

      httpBackend.when('GET', '/users/10').respond({data: {id: 10}})
      httpBackend.flush()
    })

    it('gets model by id and passes parameters', function () {
      var item = api.make()

      api.get(10, {sort: 'id', filters: {enabled: true}, fn: function () {}})
        .to(item)

      httpBackend.when('GET', '/users/10?sort=id&filters%5Benabled%5D=true').respond({
        data: {id: 10, $new: true}
      })
      httpBackend.flush()
    })
  })

  describe('.query()', function () {
    it('gets models using /resource url', function () {
      api.query().then(function (response) {
        expect(response.data[0].id).toBe(10)
      })

      httpBackend.when('GET', '/users').respond({data: [{id: 10}]})
      httpBackend.flush()
    })

    it('gets models and passes parameters', function () {
      // This tests serializer
      var date = new Date()
      date.setDate(10)
      date.setMonth(10)
      date.setHours(2)
      date.setMinutes(3)
      date.setSeconds(4)
      var datestring = encodeURIComponent(date.getFullYear() + '-11-10 02:03:04')

      api.query({sort: 'id', filters: {enabled: true, from: date}}).then(function (response) {
        expect(response.data[0].id).toBe(10)
      })

      httpBackend.expectGET('/users?sort=id&filters%5Benabled%5D=true&filters%5Bfrom%5D=' + datestring)
        .respond({data: [
          {id: 10, created_at: '2017-11-10 02:03:04'},
          {id: 11, created_at: '2017-11-10 02:03:04'}
        ]})
      httpBackend.flush()
    })
  })

  describe('.make() and .save()', function () {
    it('can guess POST or PATCH', function () {
      api.save({name: 'test'}).then(function (response) {
        expect(response.data.id).toBe(10)
      })

      httpBackend.expectPOST('/users', {data: {name: 'test'}})
        .respond({data: {id: 10}})
      httpBackend.flush()

      api.save({id: 20, name: 'test'}).then(function (response) {
        expect(response.data.test).toBe(true)
      })
      httpBackend.expectPOST('/users/20', {data: {id: 20, name: 'test'}, _method: 'PATCH'})
        .respond({data: {id: 10, test: true}})
      httpBackend.flush()
    })

    it('makes and POSTS model to /resource', function () {
      var model
      model = api.make()
      expect(model.$new).toBe(true)

      model = api.make({name: 'test'})
      expect(model.name).toBe('test')

      api.save(model).then(function (response) {
        expect(response.data.id).toBe(10)
      })
      httpBackend.expectPOST('/users', {data: {name: 'test', bool: false}})
        .respond({data: {id: 10}})
      httpBackend.flush()
    })

    it('PATCHes existing model to /resource/{id}', function () {
      var model = {id: 20, name: 'test'}
      api.save(model).then(function (response) {
        expect(response.data.test).toBe(true)
      })
      httpBackend.expectPOST('/users/20', {data: {id: 20, name: 'test'}, _method: 'PATCH'})
        .respond({data: {id: 10, test: true}})
      httpBackend.flush()
    })
  })

  describe('.reset()', function () {
    it('requests resource id and populates original object', function () {
      var item = {id: 30}

      api.reset(item).then(function () {
        expect(item.name).toBe('test')
      })

      httpBackend.expectGET('/users/30').respond({data: {id: 30, name: 'test'}})
      httpBackend.flush()

      api.reset(item, {enabled: true}).then(function () {
        expect(item.name).toBe('test')
      })

      httpBackend.expectGET('/users/30?enabled=true')
        .respond({data: {id: 30, name: 'test'}})
      httpBackend.flush()
    })
  })

  describe('.saveProp()', function () {
    it('makes save request for property of holding object / like scope', function () {
      var scope = {
        user: {name: 'test'}
      }

      api.saveProp(scope, 'user').then(function (response) {
        expect(scope.user.test).toBe(true)
      })

      httpBackend.expectPOST('/users', {data: {name: 'test'}})
        .respond({data: {test: true}})
      httpBackend.flush()

      var users = [{}, {name: 'test'}]

      api.saveProp(users, 1).then(function (response) {
        expect(users[1].test).toBe(true)
      })

      httpBackend.expectPOST('/users', {data: {name: 'test'}})
        .respond({data: {test: true}})
      httpBackend.flush()
    })
  })

  describe('.from()', function () {
    it('runs hydrate on object', function () {
      var item = {id: 10, bool: '0'}
      api.from(item)
      expect(item.bool).toBe(false)

      item = {id: 10, bool: '1'}
      api.from(item)
      expect(item.bool).toBe(true)

      api.from()
    })

    it('runs hydrate on array of objects', function () {
      var items = [
        {id: 10, bool: '0'},
        {id: 12, bool: '1'}
      ]
      api.from(items)
      expect(items[0].bool).toBe(false)
      expect(items[1].bool).toBe(true)
    })
  })

  describe('.transformPromise()', function () {
    it('populates simple promise with special promise methods', function () {
      var promise = q(function (resolve, reject) { })

      api.transformPromise(promise, false)

      expect(typeof promise.to).toBe('function')
      expect(typeof promise.thenData).toBe('function')
      expect(typeof promise.fetching).toBe('function')
    })
  })
})
