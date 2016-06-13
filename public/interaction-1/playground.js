
function transite_to(fsm, new_state) {
  console.log("transite_to(" + fsm.name + ": " + fsm.current + " -> " + new_state + ")");
  old_state = fsm.current;
  fsm.current = new_state;
  _exec_transition_effects(fsm.map, old_state, new_state);
  return fsm;
}

function feed_event(fsm, event) {
  console.log("feed_event( " + fsm.name + ": " + event + ")");
  (get_in(fsm.map, [fsm.current, "feed_events"])
   [event] || function() {})();
}

// ----

function _exec_transition_effects(fsm_map, old_state, new_state) {
  (get_in(fsm_map, [old_state, "transition_to"])
   [new_state] || function() {})();
}

function get_in(map, xs) {
  if (!map) throw "map is false-y";

  var m = map;
  for (var i=0; i < xs.length; i++) {
    var x = xs[i];
    m = m[x];
    if (!m) {
      return {};
    }
  }
  return m;
}

// ----

var CONTROL_OFF_TIMEOUT = 5000;
var controll_off_timer = {};
controll_off_timer.timer = null;
controll_off_timer.start = function(timeout_in_millis) {
  console.log("controll_off_timer.start() called");
  this.clear();
  this.timer = setTimeout(function() {
    transite_to(_control_onoff_fsm, "off");
  }, timeout_in_millis || CONTROL_OFF_TIMEOUT);
};
controll_off_timer.clear = function() {
  if (this.timer) {
    clearTimeout(this.timer);
    this.timer = null;
  }
};

function update_controls() {
  console.log("update_controls: " + _control_onoff_fsm.current + ", " + _playing_fsm.current);
  if (_control_onoff_fsm.current == "on") {
    if (_playing_fsm.current == "playing") {
      $('.rapsody-pause-btn').show();
      $('.rapsody-play-btn').hide();
      $('.rapsody-replay-btn').hide();
    } else if (_playing_fsm.current == "paused") {
      $('.rapsody-pause-btn').hide();
      $('.rapsody-play-btn').show();
      $('.rapsody-replay-btn').hide();
    } else if (_playing_fsm.current == "finished") {
      $('.rapsody-pause-btn').hide();
      $('.rapsody-play-btn').hide();
      $('.rapsody-replay-btn').show();
    }

    $('.rapsody-go-to-advertiser-page').css('display', 'flex');

  } else if (_control_onoff_fsm.current == "off") {
    $('.rapsody-play-btn').hide();
    $('.rapsody-pause-btn').hide();
    $('.rapsody-replay-btn').hide();
    $('.rapsody-go-to-advertiser-page').css('display', 'none');
  }
}

var _control_onoff_fsm = {};
_control_onoff_fsm.name = "_control_onoff_fsm";
_control_onoff_fsm.current = "on";
_control_onoff_fsm.map = {
  "off": {
    "feed_events": {
      "touch": function() {
        transite_to(_control_onoff_fsm, "on");
      }
    },
    "transition_to": {
      "on": function() {
        update_controls();
      }
    }
  },
  "on": {
    "feed_events": {
      "touch": function() {
        transite_to(_control_onoff_fsm, "off");
      }
    },
    "transition_to": {
      "off": function() {
        update_controls();
      }
    }
  }
};

function _video() {
  return document.getElementById('rapsody_video');
}

var _playing_fsm = {};
_playing_fsm.name = "_playing_fsm";
_playing_fsm.current = "paused";
_playing_fsm.map = {
  "paused": {
    "feed_events": {
      "play": function() {
        transite_to(_playing_fsm, "playing");
      },
      "finish": function() {
        transite_to(_playing_fsm, "finished");
      },
    },
    "transition_to": {
      "playing": function() {
        transite_to(_control_onoff_fsm, "off");
        _video().play();
      },
      "finished": function() {
        transite_to(_control_onoff_fsm, "on");
        controll_off_timer.clear();
        update_controls();
      }
    }
  },
  "playing": {
    "feed_events": {
      "pause": function() {
        transite_to(_playing_fsm, "paused");
      },
      "finish": function() {
        transite_to(_playing_fsm, "finished");
      },
      "touch": function() {
        transite_to(_control_onoff_fsm, "on");
        controll_off_timer.start();
      }
    },
    "transition_to": {
      "paused": function() {
        transite_to(_control_onoff_fsm, "on");
        controll_off_timer.clear();
        _video().pause();
        update_controls();
      },
      "finished": function() {
        transite_to(_control_onoff_fsm, "on");
        controll_off_timer.clear();
        update_controls();
      }
    }
  },
  "finished": {
    "feed_events": {
      "play": function() {
        transite_to(_playing_fsm, "playing");
      }
    },
    "transition_to": {
      "playing": function() {
        transite_to(_control_onoff_fsm, "off");
        _video().play();
      },
    }
  }
};

// ----

$('.rapsody-controls').click(function() {
  feed_event(_playing_fsm, "touch");
})

$('.rapsody-play-btn').click(function(ev) {
  feed_event(_playing_fsm, "play");
  return false;
})

$('.rapsody-replay-btn').click(function(ev) {
  feed_event(_playing_fsm, "play");
  return false;
})

$('.rapsody-pause-btn').click(function(ev) {
  feed_event(_playing_fsm, "pause");
  return false;
})

$('.finish-emul-btn').click(function(ev) {
  _video().currentTime = 150;
  _video().play();
  return false;
});

$('.rapsody-fullscreen-btn').click(function(ev) {
  _video().webkitRequestFullScreen();
  return false;
})

$('#rapsody_video').bind('timeupdate', function() {
  var v = document.getElementById('rapsody_video');
  var tm = v.currentTime.toFixed();
  // XXX format sec to hh:mm:ss
  var min = Math.floor(v.currentTime / 60);
  var sec = tm % 60;
  if (sec < 10) {
    sec = '0' + sec;
  }
  $('.rapsody-ad-indicator > span').html(min + ":" + sec);
  var percent = (v.currentTime / v.duration * 100 ) + '%';
  $('.rapsody-progress-bar-highlight').css('width', percent);
});

$('#rapsody_video').bind('pause', function() {
  feed_event(_playing_fsm, 'pause');
});

$('#rapsody_video').bind('ended', function() {
  feed_event(_playing_fsm, 'finish');
});

// ---
update_controls();
