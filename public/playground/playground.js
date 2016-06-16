window.VP = window.VP || {};

(function(VP) {

  function ensure(lhs, msg) {
    if (!lhs) {
      throw Error('ensure error: ' + msg);
    }
    return lhs;
  }

  /**
   * VP
   * -- Fred
   * ---- View
   * ---- VAST
   * -- RapsodyPlayer
   * ---- View
   */
  VP.Fred = {};
  VP.Fred.main = function(vastDocPromise, perferredHardwarePixelWH) {
    vastDocPromise.then(function(vastDoc) {
      VP.Fred.View.buildWithFredValue(
        VP.Fred.VAST.fredValue(vastDoc, perferredHardwarePixelWH),
        "placeholder");
    });
  }

  VP.Fred.View = {
    buildWithFredValue: function(fredValue, id) {
      var img = document.createElement('img')
      img.src = fredValue['image_banner'];

      var ph = ensure(document.getElementById(id), "placeholder should be exsits");
      ph.appendChild(img);
      ph.appendChild(
        VP.RapsodyPlayer.View.build(fredValue));
    }
  }

  VP.Fred.VAST = {
    fredValue: function(vastDoc, perferredHardwarePixelWH) {
      return {
        video:
          this.videURLFromAMediaFile(
            this.bestMatchInMediaFiles(
              this.mediaFiles(
                this.firstInlineLinear(vastDoc)),
              perferredHardwarePixelWH)),
        image_banner:
          this.imageBannerURL(
            this.firstCompanion(vastDoc))
      };
    },
    videURLFromAMediaFile: function(mediaFile) {
      return mediaFile.childNodes[0].nodeValue;
    },
    firstInlineLinear: function(vastDoc) {
      var linear = vastDoc
        .evaluate('/VAST/Ad/InLine/Creatives/Creative/Linear', vastDoc)
        .iterateNext();
      if (!linear) {
        throw new Error("no linear element exists");
      }
      return linear;
    },
    firstCompanion: function(vastDoc) {
      var companion = vastDoc.evaluate('//CompanionAds/Companion', vastDoc).iterateNext();
      if (!companion) throw Error('no Companion exists');
      return companion;
    },
    mediaFiles: function(node) {
      return node.getElementsByTagName('MediaFile');
    },
    bestMatchInMediaFiles: function(mediaFiles, perferredHardwarePixelWH) {
      var w = function(el) { return el.getAttribute("width"); }
      var m = _.chain(mediaFiles)
       .filter(function(m) { return w(m) < perferredHardwarePixelWH["w"]; })
       .max(function(m) { return w(m); })
       .value();
      return m;
    },
    imageBannerURL: function(companion) {
      var lst = companion.getElementsByTagName('StaticResource');
      if (lst.length > 0) {
        return lst[0].textContent;
      }
    }
  }

  /*
   * 이 RapsodyPlayer가 외부에 노출되야 하는 API가 없는 것 같기도 하고
   * 잘 모르겠다. 일단 완전히 격리되게 (function() {})() 으로 쌓아 두었다.
   */
  VP.RapsodyPlayer = (function() {

    /**
     * fsm (finite state manchine)의 주요 함수
     *   transite_to
     *   feed_event
     *
     * 좀 더 OO 스럽게 고칠 수도 있겠지만
     * 굳이 그러지 말아보자.
     */
    function transite_to(fsm, new_state) {
      console.log("transite_to(" + fsm.name + ": " + fsm.current + " -> " + new_state + ")");
      var old_state = fsm.current;
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

    function _video() {
      // :sigh: globals
      return VP.RapsodyPlayer.View.videoEl;
    }

    var controlOffTimer = {
      CONTROL_OFF_TIMEOUT: 5000,
      timer: null,
      start: function(timeout_in_millis) {
        console.log("controlOffTimer.start() called");
        var self = this;
        self.clear();
        self.timer = setTimeout(function() {
          transite_to(FSM.controllOnOff, "off");
        }, timeout_in_millis || self.CONTROL_OFF_TIMEOUT);
      },
      clear: function() {
        if (this.timer) {
          clearTimeout(this.timer);
          this.timer = null;
        }
      },
    };

    var FSM = {};
    FSM.controllOnOff = {};
    FSM.controllOnOff.name = "FSM.controllOnOff";
    FSM.controllOnOff.current = "on";
    FSM.controllOnOff.map = {
      "off": {
        "feed_events": {
          "touch": function() {
            transite_to(FSM.controllOnOff, "on");
          }
        },
        "transition_to": {
          "on": function() {
            updateControls();
          }
        }
      },
      "on": {
        "feed_events": {
          "touch": function() {
            transite_to(FSM.controllOnOff, "off");
          }
        },
        "transition_to": {
          "off": function() {
            updateControls();
          }
        }
      }
    };

    FSM.player = {};
    FSM.player.name = "FSM.player";
    FSM.player.current = "paused";
    FSM.player.map = {
      "paused": {
        "feed_events": {
          "play": function() {
            transite_to(FSM.player, "playing");
          },
          "finish": function() {
            transite_to(FSM.player, "finished");
          },
        },
        "transition_to": {
          "playing": function() {
            transite_to(FSM.controllOnOff, "off");
            debugger;
            _video().play();
          },
          "finished": function() {
            transite_to(FSM.controllOnOff, "on");
            controlOffTimer.clear();
            updateControls();
          }
        }
      },
      "playing": {
        "feed_events": {
          "pause": function() {
            transite_to(FSM.player, "paused");
          },
          "finish": function() {
            transite_to(FSM.player, "finished");
          },
          "touch": function() {
            transite_to(FSM.controllOnOff, "on");
            controlOffTimer.start();
          }
        },
        "transition_to": {
          "paused": function() {
            transite_to(FSM.controllOnOff, "on");
            controlOffTimer.clear();
            _video().pause();
            updateControls();
          },
          "finished": function() {
            transite_to(FSM.controllOnOff, "on");
            controlOffTimer.clear();
            updateControls();
          }
        }
      },
      "finished": {
        "feed_events": {
          "play": function() {
            transite_to(FSM.player, "playing");
          }
        },
        "transition_to": {
          "playing": function() {
            transite_to(FSM.controllOnOff, "off");
            _video().play();
          },
        }
      }
    };

    function updateControls() {
      console.log("updateControls: " + FSM.controllOnOff.current + ", " + FSM.player.current);
      var q = function(selector) { return document.querySelectorAll(selector)[0]; }
      var show = function(selector, display) { q(selector).style.display = display || 'block' };
      var hide = function(selector) { q(selector).style.display = 'none' };
      if (FSM.controllOnOff.current == "on") {
        if (FSM.player.current == "playing") {
          show('.rapsody-pause-btn')
          hide('.rapsody-play-btn')
          hide('.rapsody-replay-btn')
        } else if (FSM.player.current == "paused") {
          hide('.rapsody-pause-btn')
          show('.rapsody-play-btn')
          hide('.rapsody-replay-btn')
        } else if (FSM.player.current == "finished") {
          hide('.rapsody-pause-btn')
          hide('.rapsody-play-btn')
          show('.rapsody-replay-btn')
        }
        show('.rapsody-go-to-advertiser-page', 'flex');
      } else if (FSM.controllOnOff.current == "off") {
        hide('.rapsody-pause-btn')
        hide('.rapsody-play-btn')
        hide('.rapsody-replay-btn')
        hide('.rapsody-go-to-advertiser-page')
      }
    }

    return {
      updateControls: updateControls,
      transite_to: transite_to,
      feed_event: feed_event,
      FSM: FSM,
    };
  })();

  VP.RapsodyPlayer.View = {};
  VP.RapsodyPlayer.View.build = function(fredValue) {
    var self = this;

    var rapsody_placeholder = document.createElement('div');
    rapsody_placeholder.className = "rapsody-placeholder";

    var v = document.createElement('video')
    v.src = fredValue['video'];
    v.id = 'rapsody_video';
    self.videoEl = v;

    rapsody_placeholder.appendChild(v);

    var rapsody_controls = document.createElement('div');
    rapsody_controls.className = "rapsody-controls";
    rapsody_controls.innerHTML =
    "       <div class=\"rapsody-controls\">" +
    "        <div class=\"rapsody-center-pannel\">" +
    "          <div class=\"rapsody-play-btn\"></div>" +
    "          <div class=\"rapsody-pause-btn\"></div>" +
    "          <div class=\"rapsody-replay-btn\"></div>" +
    "        </div>" +
    "        <div class=\"rapsody-progress-bar\">" +
    "          <span class=\"rapsody-progress-bar-highlight\"></span>" +
    "        </div>" +
    "        <div class=\"rapsody-bottom-pannel\">" +
    "          <div class=\"rapsody-bottom-left-pannel\">" +
    "            <div class=\"rapsody-ad-indicator\">" +
    "              광고 · <span>0:00</span>" +
    "            </div>" +
    "          </div>" +
    "          <div class=\"rapsody-bottom-right-pannel\">" +
    "            <div class=\"rapsody-fullscreen-btn\"></div>" +
    "            <div class=\"rapsody-sound-indicator rapsody-volumn-off\">" +
    "            </div>" +
    "          </div>" +
    "        </div>" +
    "        <div class=\"rapsody-go-to-advertiser-page\">" +
    "          광고주 사이트 방문" +
    "        </div>" +
    "      </div>";
    rapsody_placeholder.appendChild(rapsody_controls);

    var _listen = function(e, eventName, fn) {
        e.addEventListener(eventName, function(ev) {
          fn();
          ev.preventDefault();
          ev.stopPropagation();
        });
    };
    var _findByClassName = function(className) {
      return rapsody_controls.getElementsByClassName(className)[0];
    }


    var RP =
      ensure(VP.RapsodyPlayer,
            'RapsodyPlayer should be initialized first');
    var mkFnFeedEventToPlayer = function(fsmEvent) {
      return function() {
        // :sigh: globals
        RP.feed_event(RP.FSM.player, fsmEvent);
      };
    };

    _listen(rapsody_controls,
      'click',
      mkFnFeedEventToPlayer('touch'));
    _listen(_findByClassName('rapsody-play-btn'),
      'click',
      mkFnFeedEventToPlayer('play'));
    _listen(_findByClassName('rapsody-replay-btn'),
      'click',
      mkFnFeedEventToPlayer('play'));
    _listen(_findByClassName('rapsody-pause-btn'),
      'click',
      mkFnFeedEventToPlayer('pause'));
    _listen(_findByClassName('rapsody-fullscreen-btn'),
      'click',
      function(ev) {
        self.videoEl.webkitRequestFullScreen();
      });

    var _fmtTm = function(timeInSec) {
      var tm = timeInSec.toFixed();
      var min = Math.floor(v.currentTime / 60);
      var sec = tm % 60;
      if (sec < 10) {
        sec = '0' + sec;
      }
      return min + ":" + sec;
    }

    self.timeLabel = function() {
      return rapsody_controls
        .querySelectorAll('.rapsody-ad-indicator > span')[0];
    }
    self.progressBarHighlight = function() {
      return rapsody_controls
              .querySelectorAll('.rapsody-progress-bar-highlight')[0];
    }

    self.videoEl.addEventListener(
      'pause', mkFnFeedEventToPlayer('pause'));
    self.videoEl.addEventListener(
      'ended', mkFnFeedEventToPlayer('finish'));

    self.videoEl.addEventListener('timeupdate', function() {
      var v = self.videoEl;
      self.timeLabel().innerHTML = _fmtTm(v.currentTime);
      self.progressBarHighlight().style.width =
        (v.currentTime / v.duration * 100 ) + '%';
    });

    return rapsody_placeholder;
  }

})(window.VP);



/*
 * entrypoint and test support func
 *   http://stackoverflow.com/a/30008115/262425
 */
function makeRequest (opts) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open(opts.method, opts.url);
    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        resolve(xhr);
      } else {
        reject({
          status: this.status,
          statusText: xhr.statusText
        });
      }
    };
    xhr.onerror = function () {
      reject({
        status: this.status,
        statusText: xhr.statusText
      });
    };
    if (opts.headers) {
      Object.keys(opts.headers).forEach(function (key) {
        xhr.setRequestHeader(key, opts.headers[key]);
      });
    }
    var params = opts.params;
    // We'll need to stringify if we've been given an object
    // If we have a string, this is skipped.
    if (params && typeof params === 'object') {
      params = Object.keys(params).map(function (key) {
        return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
      }).join('&');
    }
    xhr.send(params);
  });
}

function _testRemoteFetchPromise() {
 return makeRequest({
   "url": "/public/ima-tag-1.xml",
   "method": "GET"
 })
}

function toDOM(xhr) { return xhr.responseXML; }

// 요부분에서 promise를 안쓰겠다고 할 때 어떤 모양새가 될지 모르겠네...
new Promise(function(resolve, reject) {
    // XXX 핸드폰에서 정말 pixelRatio를 구해서 쓴다.
    window.VP.Fred.main(_testRemoteFetchPromise().then(toDOM), {w: 750, h: 750/6*4 })
    setTimeout(resolve, 20);
}).then(window.VP.RapsodyPlayer.updateControls);



//
// console.log는 어떻게 하는 것이 좋을까?
//   build과정에서 알아서 사라지면 제일 좋기는 할텐데..
//
//
//
// volumn off를 한 번 play가 시작되고 나면 없애자.
//
//
