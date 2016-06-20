window.VP = (function(VP) {

  // extracted from
  //  https://github.com/eriksank/eventemitter4/blob/master/index.js
  VP.EventEmitter = function() {
    this.init();
  }

  VP.EventEmitter.prototype.init = function() {
    this.listeners = {};
    this.emitted = {};
  }

  VP.EventEmitter.prototype.on = function(event, listener) {
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(listener);
    return this;
  }

  VP.EventEmitter.prototype.emit = function() {
    var args = _(arguments).toArray();
    var event = args.shift();
    _(this.listeners[event]).toArray().forEach(function(listener) {
      listener.apply(this, args);
    });
  }

  VP.EventEmitter.prototype.emit_once = function() {
    var args = _(arguments).toArray();
    var event = args.shift();
    var self = this;
    _(this.listeners[event]).toArray().forEach(function(listener) {
      if (!self.emitted[event]) {
        self.emitted[event] = true;
        listener.apply(self, args);
      }
    });
  }

  return VP;

})(window.VP || {});
