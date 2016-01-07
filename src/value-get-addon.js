/* globals angular */
/* jshint strict: false */
angular
  .module('collection.resource')
  .run(['Resource', function (Resource) {
    function getter (obj, s) {
      if (! obj) {
        return
      }
      var splits = s.split('.'),
        target = obj,
        dot

      for (var i in splits) {
        dot = splits[i]
        if (target[dot] == undefined) {
          return
        }
        target = target[dot]
      }
      return target
    }

    Resource.extend({
      initialize: function () {
        var options = this.options,
          _super = options.extendPromise || angular.noop

        options.extendPromise = function (promise) {
          promise.value = function (dotted, callback) {
            promise.then(function (response) {
              callback(getter(response, dotted))
            })

            return promise
          }
          _super(promise)
        }
      }
    })

  }])
