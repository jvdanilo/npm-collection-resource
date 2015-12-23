(function(undefined) {
  'use strict';

  /* globals angular */
  /* globals console */

  var angularCopy = angular.copy,
      angularExtend = angular.extend,
      angularIsDate = angular.isDate,
      angularIsArray = angular.isArray,
      angularIsObject = angular.isObject;

  function extendArray(response, array) {
    array.length = 0;
    for (var k in response) {
      array.push(response[k]);
    }
  }

  function extendObject(response, object) {
    // if (response.$new) {
    //   angularExtend(response, object);
    // }
    // else {
    //   angularCopy(response, object);
    // }
    angularCopy(response, object);
  }

  function pad (number) {
    return number < 10 ? '0' + number : number;
  }

  var regSplit = /[\s-:]0?/g;
  var dateFormatCache = {};

  function standardFormatToDate(dateString) {
    if (dateFormatCache[dateString]) {
      return dateFormatCache[dateString];
    }

    var ref = dateString.split(regSplit),
    year    = ref[0],
    month   = ref[1],
    date    = ref[2],
    hour    = ref[3],
    minute  = ref[4],
    seconds = ref[5];

    dateFormatCache[dateString] = new Date(year, month - 1, date, hour, minute, seconds);

    return dateFormatCache[dateString];
  }

  function toStandardFormat (date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
  }

  function parseDate(dateString) {
    // yyyy-mm-dd hh:mm:ss
    if (dateString[4] === '-' && dateString[10] === ' '&& dateString[16] === ':') {
      return standardFormatToDate(dateString);
    }
  }

  function transformRequestParams (obj) {
    for (var k in obj) {
      var v = obj[k];
      if (k[0] === '$') {
        delete obj[k];
      }
      else if (angularIsDate(v)) {
        obj[k] = toStandardFormat(v);
      }
      else if (typeof v === 'object') {
        obj[k] = transformRequestParams(v);
      }
    }
    return obj;
  }

  function paramsSerialize (obj, prefix) {
    var str = [], p, v, k;
    for (p in obj) {
      v = obj[p];
      if (typeof v === 'function') {
        continue;
      }
      k = (prefix ? prefix + '[' + p + ']' : p);
      if (typeof v === 'object') {
        str.push(paramsSerialize(v, k));
      } else {
        str.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
      }
    }
    return str.join('&');
  }

  function Resource(options) {
    this.options = options = angularExtend({
      primary: 'id',

      casts: {
        'updated_at': 'date',
        'created_at': 'date'
      },

      /* Use _method property for request method override */
      _method: true
    }, options);

    var self = this;

    this.$loaded = {};

    for (var i = 0; i < Resource.initializers.length; i++) {
      Resource.initializers[i].call(this);
    }

    var Promise = Resource.Promise;
    var Http = Resource.Http;

    function hydrateMany(array) {
      for (var i = 0; i < array.length; i++) {
        hydrate(array[i]);
      }
    }

    function hydrate(object, isNew) {
      var cast, key;
      if ( ! object) {
        return;
      }

      for (key in options.casts) {
        cast = options.casts[key];

        if (cast === 'date') {
          var v = object[key];
          if (v && ! angularIsDate(v)) {
            object[key] = parseDate(v);
          }
        }
        else if (typeof cast === 'function') {
          object[key] = cast(object[key], object);
        }
      }

      if (isNew) {
        object.$new = true;
      }
      else {
        delete object.$new;
      }

      if (options.hydrate) {
        options.hydrate(object, isNew);
      }
    }

    function hydrator (response) {
      if (angularIsArray(response)) {
        hydrateMany(response);
      }
      else if (angularIsArray(response.data)) {
        hydrateMany(response.data);
      }
      else if (angularIsObject(response.data))  {
        hydrate(response.data);
      }
      else {
        hydrate(response);
      }
    }

    function replaceReferences(objectOrArray) {
      var item, data, i, id, j, len, $loaded = self.$loaded, isSingleObject;

      if (angularIsArray(objectOrArray)) {
        data = objectOrArray;
      }
      else {
        isSingleObject = true;
        data = [objectOrArray];
      }

      for (i = j = 0, len = data.length; j < len; i = ++j) {
        item = data[i];
        id = item[options.primary]+'';

        if (id) {
          if ($loaded[id]) {
            angularExtend($loaded[id], item);
            data[i] = $loaded[item[options.primary]];
          } else {
            $loaded[id] = item;
          }

          if (isSingleObject) {
            return $loaded[id];
          }
        }
        else if (isSingleObject) {
          return item;
        }
      }
    }

    function ensureCatch(promise) {
      var originalCatch = promise.catch;

      promise.catch = function() {
        promise.attachedCatch = true;
        return originalCatch.apply(this, arguments);
      };

      setTimeout(function() {
        if ( ! promise.attachedCatch) {
          promise.catch(console.log);
          console.error('No .error() or .catch() handler is attached to this promise!');
        }
      }, 100);
    }

    function transformPromise (promise, warnWhenWithoutCatch) {
      warnWhenWithoutCatch = (warnWhenWithoutCatch === undefined) ? true : warnWhenWithoutCatch;

      promise.bind = function($scope) {
        $scope.$on('$destroy', promise.abort);
        return promise;
      };

      promise.fetching = function(object, property) {
        object[property] = true;
        promise.finally(function() {
          object[property] = false;
        });
        return promise;
      };

      promise.fullTo = function(objectOrArray, property) {
        return promise.to(objectOrArray, property, true);
      };

      promise.error = function(callback) {
        promise.catch(callback);
        return promise;
      };

      promise.thenData = function(callback) {
        promise.then(function(res) {
          if (angularIsArray(res)) {
            callback(res);
          }
          else if (angularIsArray(res.data)) {
            callback(res.data);
          }
          else if (angularIsObject(res.data)) {
            callback(res.data);
          }
          else {
            callback(res);
          }
        });
        return promise;
      };

      promise.to = function(objectOrArray, property, fullResponse) {
        promise[fullResponse ? 'then' : 'thenData'](function(response) {
          if (angularIsArray(objectOrArray)) {
            extendArray(response, objectOrArray);
          }
          else if (property) {
            objectOrArray[property] = response;
          }
          else {
            extendObject(response, objectOrArray);
          }
        });
        return promise;
      };

      promise.references = function() {
        promise.then(function(res) {
          var result;
          if (angularIsArray(res)) {
            replaceReferences(res);
          }
          else if (angularIsArray(res.data)) {
            replaceReferences(res.data);
          }
          else if (angularIsObject(res.data)) {
            result = replaceReferences(res.data);
            // Replace promise value with replaced reference
            promise.$$state.value.data = result;
          }
          else if (angularIsObject(res)) {
            result = replaceReferences(res);
            // Replace promise value with replaced reference
            promise.$$state.value = result;
          }
        });
        return promise;
      };

      if (options.references) {
        promise.references();
      }

      promise.then(hydrator);

      if (options.extendPromise) {
        options.extendPromise(promise);
      }

      if (warnWhenWithoutCatch) {
        ensureCatch(promise);
      }
    }

    function request(config) {
      config = angularCopy(config);
      var method = config.method;

      if (options._method && method !== 'GET' && method !== 'POST') {
        config.method = 'POST';
        if ( ! config.data) {
          config.data = {};
        }
        config.data._method = method;
      }

      if (config.params) {
        transformRequestParams(config.params);
        var serialized = paramsSerialize(config.params);
        if (serialized) {
          config.url += '?' + serialized;
        }
        delete config.params;
      }

      var raw;
      var abort = Promise.defer();

      var promise = Promise(function(resolve, reject) {
        config.transformRequest = [function(value/*, headersGetter */) {
          transformRequestParams(value);
          return value;
        }].concat(Http.defaults.transformRequest);

        config.headers = config.headers || {};
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        config.timeout = abort.promise;

        raw = Http(config);
        raw.success(resolve).error(reject);
      });

      promise.raw = raw;

      promise.abort = function() {
        abort.resolve('aborted');
      };

      transformPromise(promise);

      return promise;
    }

    this.request = request;

    this.query = this.where = function(object) {
      return this.request({ method: 'GET', params: object, url: options.url});
    };

    this.transformPromise = transformPromise;

    this.get = this.find = function(id, params) {
      var url = options.url + '/' + id;
      params = params || {};

      var reload = params.reload;
      delete params.reload;

      if (this.$loaded[id+'']) {

        var promise = Promise.when({data: this.$loaded[id+'']});

        transformPromise(promise);

        if (reload) {
          setTimeout(function() {

            return self.request({
              method: 'GET',
              url: url,
              params: params
            })
            .error(angular.noop)
            .references();
          });
        }

        return promise;
      }

      return this.request({ method: 'GET', url: url, params: params });
    };

    this.reset = function(object, params) {
      return this.get(object[options.primary], params || {}).to(object);
    };

    this.push = function(objectOrArray, hydrate) {
      hydrate = hydrate === undefined ? true : false;
      if (hydrate) {
        hydrator(objectOrArray);
      }
      replaceReferences(objectOrArray, self.$loaded);
    };

    this.from = function(objectOrArray) {
      if (angularIsArray(objectOrArray)) {
        hydrateMany(objectOrArray);
      }
      else {
        hydrate(objectOrArray);
      }
      return objectOrArray;
    };

    this.make = function(object) {
      object = object || {};
      hydrate(object, true);
      return object;
    };

    function updateObject(object, params) {
      var id,
          url = options.url;

      if ( ! angularIsArray(object)) {
        if ( ! (id = object[options.primary])) {
          throw new Error('Object doesn\'t have ' + options.primary);
        }
        url += '/' + id;
      }

      return self.request({url: url, method: 'PATCH', data: params});
    }

    function createObject(object, params) {
      return self.request({url: options.url, method: 'POST', data: params});
    }

    this.save = function(object, params) {
      var promise;
      params = params || {};
      params.data = angularCopy(object);

      var objectDesntHaveId = angularIsObject(object) && object[options.primary] === undefined;

      if (objectDesntHaveId || object.$new) {
        promise = createObject(object, params);
      }
      else {
        promise = updateObject(object, params);
      }

      promise.then(function(response) {
        delete response.$new;
        if (response.data) {
          delete response.data.$new;
        }
      });

      return promise;
    };

    this.saveProp = function(objectOrArray, property, params) {
      return this.save(objectOrArray[property], params).to(objectOrArray[property]);
    };
  }

  Resource.initializers = [];

  Resource.extend = function(object) {
    var init = object.initialize;
    delete object.initialize;
    if (init) {
      Resource.initializers.push(init);
    }
    for (var key in object) {
      Resource.prototype[key] = object[key];
    }
  };

  angular
    .module('collection.resource', [])
    .service('Resource', ['$q', '$http', function($q, $http) {
      Resource.Promise = $q;
      Resource.Http = $http;

      return Resource;
    }]);

})();
