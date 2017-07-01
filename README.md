# Collection Resource

[![npm](https://img.shields.io/npm/v/collection-resource.svg)](https://www.npmjs.com/package/collection-resource)
[![Coverage](https://img.shields.io/badge/coverage-95%25-brightgreen.svg)]()
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)
[![Travis](https://img.shields.io/travis/jvdanilo/npm-collection-resource.svg)](https://travis-ci.org/jvdanilo/npm-collection-resource)

Collection Resource is a simple but powerful AJAX resource library for Angular. It makes requests assuming REST API, and works with plain old JavaScript objects.

## Installation

Install with NPM

```
npm install collection-resource
```

## Usage

To use with angular add it as a module:

```javascript
var app = angular.module('my-special-app', [
  ...
  'collection.resource'
]);
```

Create your model using:

```javascript
app.service('Users', function(Resource) {
  var Users = new Resource({
     // You can set your primary field. "id" is by default
    // primary: 'id',
    url: '/api/v1/users'
  });
  return Users;
});
```

Now you can use your **Users** model in your controller, like:

```javascript
app.controller('UsersListController', function($scope, Users) {

  Users.query().then(function(users) {
    $scope.users = users;
  });
});
```

## Basic methods

A collection resource has a few basic methods with which you can fetch data from server. You can also extend collection resource with your additional methods. Below you can see methods usage assuming **Users** collection and **/api/v1/users** api as example. Most methods return a promise.

### .query([params]) / .where([params])

Requests a list and returns a promise.

```javascript
var promise = Users.query({page: 1});
```

### .get(id[, params]) / .find(id[, params])

Requests a single resource by **id**

```javascript
var promise = Users.get(10);
```

## Creating and updating an object

For the most part, Collection Resource works with any Object, for example:

```javascript
var user = {id: 10, name: 'Nick'};

var promise = Users.save(user);
```

This will send a **PATCH** request to */users/10* api path with user data.

By default Collection Resource will try to recognize, by existance of **id** (or primary field) which request to send POST or PATCH.

For other cases where you want to force a POST/CREATING request you can use **.make()** to mark those objects as **new** for POST-ing.

### .make([newObject])

```javascript
var newUser = Users.make({name: 'Nick'});

var promise = Users.save(newUser);
```

This will send a **POST** request to */users* api path with user data. **.make()** only marks your objects with special properties with which Resource can recognize which request to send.

### .from(objectOrArray)

You can use **.from** to convert a new (marked with **.make()**) object into a simple existing object.

```javascript
var user = Users.make();
// Sends a POST request to /users
Users.save(user);

user.id = 10;
user = User.from(user);
// Sends a PATCH request to /users/10
Users.save(user);
```

You can use this to run **property casting** or **hydrator** (described below) on models which you made in memory or saved to local storage.

### .save(object[, params])

```javascript
var promise = Users.save(user, {anything: 10});
```

### .saveProp(objectOrArray, key[, params])

Saves object property and redirects response to the same property (see **.to()** helper).

```javascript
// Sends the property to server and sets the response to the property
var promise = Users.saveProp($scope, 'selectedUser', {anything: 10});

// or
var promise = Users.saveProp($scope.users, 10 /* array index */, {anything: 10});

// or
Users.saveProp($scope, 'selectedUser').fetching($scope, 'saving')
```

## Special promises

Returned promises have a few special methods, other then **.then( )** and **.catch**, which can make your code simpler.

### .to(objectOrArray[, objectProperty])

**.to()** can extract data from response to a variable or object. It can recognize when response has a **data** property and it extracts only the **data** property, or fallbacks to full response.

```javascript
Users.query({page: 1}).to($scope, 'users');

// or

$scope.users = [];
Users.query({page: 1}).to($scope.users);
```

But you can always attach **.then**:

```javascript
Users.query({page: 1})
  .to($scope.users)
  .then(function(users) {
      // do something else with users
  });
```

Combine with **.save()**

```javascript
var user = Users.make();
Users.save(user).to($scope, 'user');

// or

Users.save($scope.selectedUser).to($scope, 'selectedUser');
```

### .fetching(object, property)

Sets **object** property to true while request is running, and sets to false when request is finished. This can be useful for adding loading spinners.

```javascript
Users.query({team: 'dev'})
  .fetching($scope, 'loading')
  .to($scope, 'users');

// Use in template
<div ng-if="loading" class="loading-spinner">...</div>
<div ng-if=" ! loading" class="users-list">....</div>

// or
Users.saveProp($scope, 'user').fetching($scope, 'saving');
// In template
<button ng-disabled="saving" ng-... > Save </button>
```

### .thenData(callback)

When response has **data** property it gives you **data** property, otherwise it gives you full response

```javascript
/*
Server response:
[
  {"name": "Nick"}
]

Or:

{
  "data": [
    {"name": "Nick"}
  ]
}

Both responses will give you the list
*/
Users.query({anything: true})
  .thenData(function(users) {
    // process users ...
  });
```

### .error(callback) and .catch(callback)

By default you will get a warning for every request that you haven't added **.catch()** or **.error()** handler. The difference with **.error()** is that the original promise is passed through.

```javascript
Users.query({anything: 1})
  .error(function(errorResponse) {
    // ... handle error response
  })
  .to($scope.users); // Executes on successful response, doesn't chain to .error

// or

Users.where({anything: false})
  .to($scope.users)
  .catch(function(errorResponse) {
    // ... handle error response
    // ... recover from error
  })
  // handle recovery
  .then(function() { });
```

### .abort()

Aborts a request:

```javascript
var request = Users.query();

if (shouldAbortCondition) {
  request.abort();
}
```

### .bind($scope)

Binds request to **$scope** lifecycle and aborts request when **$scope** is destroyed.

```javascript
Users.query()
  .to($scope.users)
  .bind($scope);
```

## Identity Map

Collection resource has identity map implementation. It can track your models by **id** (or primary field) and keep a single memory reference to your objects, so you can load models from server without keeping track of multiple references and changes yourself.

This gives you the same object by **id** (or primary field) every time. So you can never get double objects and model synchronization problems.

You can use several requests to load the same data, and the references will be the same, and when you edit one, the other will also be changed.

```javascript
// This will fetch a user by id of 10
Users.get(10).to($scope, 'selected');

// This will also fetch a user with id 10. But the user with id 10
// will override already fetched user by id 10
// So this will refresh $scope.selected from the sample above
Users.query({filters: {id: '10,12,14'}}).to($scope.users);
```

Since this keeps models by id in memory we can also skip requests to server, and we get automatic caching.

```javascript
// Here we fetch some users
Users.query({filters: {id: '10,12,14'}}).to($scope.users);

// When the first request is loaded, we know we already have user by id 10
// so you get a local reference and the request to server is never made
Users.get(10).to($scope, 'selected');
```

This can make your app much faster, since you can preload models partialy or fully in advance. You can enable this with:

```javascript
app.service('Users', function(Resource) {
  var Users = new Resource({
    url: '/api/v1/users',

    references: true
  });
  return Users;
});
```

## Fetch local and refresh from server

Sometimes you might want to do both: get the local (already loaded) reference and also refresh it with server request. You can do this by adding **reload: true** to **.get(id)** request parameters:

```javascript
// Assume we have id 10 already loaded with
// Users.query().to($scope.users)

// This request will give you id 10 immediately but will also go to server
// and reload with fresh changes
Users.get(10, {reload: true}).to($scope, 'selected');
```

## Partial models

You can also partialy load models, here's an example how you can implement partial loading of "list" and "detail" requests (assuming you implement backend API similarly):

```javascript
// This is a request for the list interface
Users.query({fields: 'id,name,updated_at'}).to($scope.users)

// User clicks more to see more details for model by id 10
Users.get(10, {fields: 'id,text,details', reload: true}).then(function() {
  // When this request finishes your model by id 10 will have
  // id, name, updated_at, text, details fields
})
```

## Extensions

### Extend Model
You can extend your Collection Resource with helper methods during definition, for example:

```javascript
app.service('Users', function(Resource) {
  var Users = new Resource({
     url: '/api/v1/users'
  });

  Users.approve = function(user) {
    return this.request({method: 'POST', url: this.options.url, data: {approve: true, id:user.id}});
  };

  Users.markDelete = function(user) {
    user.$delete = true;
  };

  return Users;
});

// Use with
Users.approve(user);
// or
Users.markDelete(user);
```

### Extend single item

You can add methods to single items if you need it, but the recommended way is to leave your JavaScript objects **as is**. Here's an example:

```javascript
app.service('Users', function(Resource) {
  var Users = new Resource({
    url: '/api/v1/users',
    hydrator: function(item) {

      item.setLang = function(code) {
        // ...
      };

      // For example here's how you can implement .save() method on single item
      item.save = function(params) {
        return Users.save(this, params).to(this);
      };
    }
  });

  return Users;
});

// Usage

Users.get(id).to($scope, 'user');
...
$scope.user.setLang('en');
$scope.user.save();
```

### Extend Collection Resource

If you want to develop advanced addon's for Collection Resource, you can use **Resource.extend()** to do that, and you can see the official addon for **Undo/Redo** functionality for example. Here's how to extend Collection Resource:

```javascript
angular
  .module('collection.resource')
  .run(function (Resource) {

    Resource.extend({
        // This is fired during initialization of resource
        initialize: function() {
            this.localMem = {};
        },

        // Add your other methods
        getMem: function() { ... },

        setMem: function() { ... },
    });
  });

// Usage
Users.getMem();
Users.setMem();
```

### Property casting

You can preprocess or cast item properties during fetching and hydration phase. This can be usefull for dates, JSON properties, comma separated values or other.

There is already built in cast for **date** type, but you can also pass a function to create your own. Here's an example:

```javascript
app.service('Users', function(Resource) {
  var Users = new Resource({
    url: '/api/v1/users',

    casts: {
      last_logged_in: 'date', // Converts date string to date object

      features: function(v) {   // This converts a comma separated string to array
        if ( ! angular.isArray(v)) {
          return v.split(',')
        }
        return v;
      },

      enabled: function(v) { // Convert raw value to boolean
        return v ? true : false;
      },

      info: function(v) {  // This converts JSON to object
        if ( ! angular.isObject(v)) {
          return angular.fromJson(v);
        }
        return v;
      }
    }
  });
  return Users;
});

// Fetch and use
Users.get(10).to(this, 'user')
...
console.log(this.user.last_logged_in) //  Converted to Date
console.log(this.user.enabled) //  Converted to boolean
console.log(this.user.features) //  Converted to Array
console.log(this.user.info) //  Converted from JSON to object
```
