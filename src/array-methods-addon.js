/* globals angular */
/* jshint strict: false */
angular
  .module('collection.resource')
  .run(['Resource', function (Resource) {
    var angularIsArray = angular.isArray

    Resource.extend({
      initialize: function () {
        var options = this.options
        var _super = options.extendPromise || angular.noop

        options.extendPromise = function (promise) {
          var methods = ['unshift', 'push', 'concat']

          function extender (method) {
            promise[method] = function (objectOrArray, property) {
              promise.thenData(function (response) {
                if (angularIsArray(objectOrArray)) {
                  objectOrArray[method](response)
                } else if (property) {
                  objectOrArray[property][method](response)
                } else {
                  objectOrArray[method](response)
                }
              })

              return promise
            }
          }

          for (var i in methods) {
            extender(methods[i])
          }

          _super(promise)
        }
      }
    })
  }])
