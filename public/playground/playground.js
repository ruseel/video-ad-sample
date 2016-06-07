
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
    feed_event(_control_onoff_fsm, "timeout");
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
  if (_control_onoff_fsm.current == "on" || _control_onoff_fsm.current == "tmp-on") {
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
        transite_to(_control_onoff_fsm, "tmp-on");
      },
      "finish": function() {
        transite_to(_control_onoff_fsm, "on");
      }
    },
    "transition_to": {
      "tmp-on": function() {
        controll_off_timer.start();
        update_controls();
      }
    }
  },
  "tmp-on": {
    "feed_events": {
      "touch": function() {
        controll_off_timer.start();
      },
      "timeout": function() {
        transite_to(_control_onoff_fsm, "off");
      },
      "finish": function() {
        transite_to(_control_onoff_fsm, "on");
      }
    },
    "transition_to": {
      "off": function() {
        update_controls();
      },
      "on": function() {
        controll_off_timer.clear();
        update_controls();
      }
    }
  },
  "on": {
    "feed_events": {
      "play": function() {
        transite_to(_control_onoff_fsm, "off");
      },
    },
    "transition_to": {
      "off": function() {
        update_controls();
      }
    }
  }
};

var _playing_fsm = {};
_playing_fsm.name = "_playing_fsm";
_playing_fsm.current = "paused";
_playing_fsm.map = {
  "paused": {
    "feed_events": {
      "play": function() {
        transite_to(_playing_fsm, "playing");
      }
    },
    "transition_to": {
      "playing": function() {
        feed_event(_control_onoff_fsm, "play");
        var _video = document.getElementById('rapsody_video');
        _video.play();
      }
    }
  },
  "playing": {
    "feed_events": {
      "pause": function() {
        transite_to(_playing_fsm, "paused");
      },
      "finish": function() {
        feed_event(_control_onoff_fsm, "finish");
        transite_to(_playing_fsm, "finished");
      }
    },
    "transition_to": {
      "paused": function() {
        update_controls();
      },
      "finished": function() {
        update_controls();
      }
    }
  }
};

// ----

$('.rapsody-controls').click(function() {
  feed_event(_control_onoff_fsm, "touch");
})

$('.rapsody-play-btn').click(function(ev) {
  feed_event(_playing_fsm, "play");
  return false;
})

$('.rapsody-pause-btn').click(function(ev) {
  feed_event(_playing_fsm, "pause");
  return false;
})

$('.finish_emul_btn').click(function(ev) {
  feed_event(_playing_fsm, "finish");
  return false;
});
