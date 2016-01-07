/* globals angular */
/* jshint strict: false */
angular
  .module('collection.resource')
  .run(['Resource', function (Resource) {
    var angularCopy = angular.copy
    var angularExtend = angular.extend

    Resource.extend({
      initialize: function () {
        this.$states = []
      },

      state: function (object) {
        var id = object[this.options.primary] + '' || '$new'
        if (!this.$states[id]) {
          this.$states[id] = []
          this.state(object)
        }

        var nextVersion = (object.$v === undefined) ? 0 : object.$v + 1

        var copy = angularCopy(object)
        delete copy.$v

        var i
        var ignores = this.options.ignores || []
        for (i in ignores) {
          delete copy[ignores[i]]
        }

        var old = this.$states[id][nextVersion - 1]
        if (nextVersion !== 0 && angular.equals(old, copy)) {
          return
        }

        this.$states[id][nextVersion] = copy
        this.$states[id].splice(nextVersion + 1)
        object.$v = nextVersion
      },

      undo: function (object) {
        if (object.$v === undefined) {
          return
        }
        var id = object[this.options.primary] || '$new'
        var backState = this.$states[id][object.$v - 1]

        if (backState) {
          angularExtend(object, backState)
          object.$v = this.$states[id].indexOf(backState)
        }
      },

      hasUndo: function (object) {
        if (!object) {
          return false
        }

        if (object.$v === undefined) {
          return false
        }
        return (object.$v >= 1)
      },

      redo: function (object) {
        if (object.$v === undefined) {
          return
        }
        var id = object[this.options.primary] + '' || '$new'
        var backState = this.$states[id][object.$v + 1]
        if (backState) {
          angularExtend(object, backState)
          object.$v = this.$states[id].indexOf(backState)
        }
      },

      hasRedo: function (object) {
        var id = object[this.options.primary] + '' || '$new'
        var states = this.$states[id]
        if (states) {
          var index = object.$v
          if (index === states.length - 1) {
            return true
          }
        }
        return false
      }
    })
  }])
