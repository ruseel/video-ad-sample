window.VP = (function(VP) {

  // extracted from
  //  https://github.com/eriksank/eventemitter4/blob/master/index.js
  VP.EventEmitter = function() {
    this.init();
  }

  VP.EventEmitter.prototype.init = function() {
    this.listeners={};
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

  return VP;
  
})(window.VP || {});
