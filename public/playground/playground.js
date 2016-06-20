window.VP = (function(VP) {

  var DEBUG = true;

  function spy(a) {
    if (DEBUG) {
      console.log(a);
    }
    return a;
  }

  function debug() {
    if (DEBUG) {
      console.log.apply(console, arguments);
    }
  }

  function ensure(lhs, msg) {
    if (DEBUG && !lhs) {
      throw Error('ensure error: ' + msg);
    }
    return lhs;
  }

  function isWIFI() {
    /** navigator.connector는 직접 Nexus5 chrome, iPhone6 safari, OSX chrome에서 했을 때는
        Nexus5 chrome에서만 돌아가더라 */
    if (navigator && navigator.connector) {
      return navigator.connector.type == 'wifi'
    }
  }

  /**
   * VP
   * -- Fred
   * ---- View
   * ---- VAST
   * -- RapsodyPlayer
   * ---- View

   * VP.Fred.{View,VAST}, VP.RapsodyPlayer.View는
   * namespace(== namespace로 사용하는 객체)이고
   * VP.RapsodyPlayer는 전역 객체라서 initialization path가 엄척 헷갈린다.
   * 나의 잘못.
   */
  VP.Fred = {};
  VP.Fred.main = function(vastDoc, perferredHardwarePixelWH) {

    VP.Fred.View.buildWithFredValue(
      spy(VP.Fred.VAST.fredValue(vastDoc, perferredHardwarePixelWH)),
      "placeholder");

    VP.Fred.VAST.setUpTracking();

    if (!navigator.userAgent.match(/iPhone|iPad/i)) {
      VP.RapsodyPlayer.setUpAutoPlayInSight(VP.RapsodyPlayer.View.videoEl);
    }

  }

  VP.Fred.View = {
    buildWithFredValue: function(fredValue, id) {
      var img = document.createElement('img')
      img.className = "vp-fred-img";
      img.src = fredValue['image_banner'];


      var ph = ensure(document.getElementById(id), "placeholder should be exsits");
      ph.appendChild(img);
      ph.appendChild(
        VP.RapsodyPlayer.View.build(fredValue));
    }
  }

  VP.Fred.VAST = {
    fredValue: function(vastDoc, perferredHardwarePixelWH) {
      var linear = this.firstInlineLinear(vastDoc);
      return {
        video:
          this.videURLFromAMediaFile(
            this.bestMatchInMediaFiles(
              this.mediaFiles(linear),
              perferredHardwarePixelWH)),
        image_banner:
          this.imageBannerURL(
            this.firstCompanion(vastDoc)),
        destination_url:
          this.clickThrough(linear),
        click_track:
          this.clickTracking(linear),
      };
    },
    videURLFromAMediaFile: function(mediaFile) {
      return mediaFile.childNodes[0].nodeValue;
    },
    firstInlineLinear: function(vastDoc) {
      var linear = vastDoc
        .evaluate('/VAST/Ad/InLine/Creatives/Creative/Linear', vastDoc)
        .iterateNext();
      return ensure(linear, 'no linear element exists');
    },
    firstCompanion: function(vastDoc) {
      var companion = vastDoc.evaluate('//CompanionAds/Companion', vastDoc).iterateNext();
      return ensure(companion, 'no companion element exists');
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
    _find: function(el, selector) {
      return el.querySelectorAll(selector)[0];
    },
    imageBannerURL: function(companion) {
      return this._find(companion, 'StaticResource').textContent;
    },
    clickThrough: function(linear) {
      return this._find(linear, 'ClickThrough').textContent;
    },
    clickTracking: function(linear) {
      return this._find(linear, 'ClickTracking').textContent;
    },
    setUpTracking: function () {
      _([0,25,50,75,100]).each(function(t) {
        VP.RapsodyPlayer.on('timeplayed'+t, function() {
          // XXX 여기서 trackEvent를 호출한다?
          console.log('timeplayed'+t);
        })
      })
    }
  }

  VP.RapsodyPlayer = (function() {

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
        debug("controlOffTimer.start() called");
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

    // FSM.controllOnOff 는 처음 만들 때는 temp-on state 가 있었던지라
    // 쓸모가 있어 보였는데 지금은 아니다.
    // 없애나, 놓아두나??
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
          "autoplay-in-sight": function () {
            muteVolume();
            transite_to(FSM.player, "playing");
          }
        },
        "transition_to": {
          "playing": function() {
            transite_to(FSM.controllOnOff, "off");
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
            recoverVolume();
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

    var q = function(selector) { return document.querySelectorAll(selector)[0]; }
    var show = function(selector, display) {
      var el = q(selector);
      if (el) el.style.display = display || 'block'
    };
    var hide = function(selector) {
      var el = q(selector);
      if (el) el.style.display = 'none'
    };

    function muteVolume() {
      FSM.player.originalVolume = _video().volume;
      _video().volume = 0;
    }

    function recoverVolume() {
      if (FSM.player.originalVolume && _video().volume == 0) {
        hide('.rapsody-sound-indicator');
        _video().volume = FSM.player.originalVolume;
      }
    }

    function updateControls() {
      debug("updateControls: " + FSM.controllOnOff.current + ", " + FSM.player.current);
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

    function play() {
      feed_event(FSM.player, 'play');
    }

    function pause() {
      feed_event(FSM.player, 'pause');
    }

    var _o = {
      FSM: FSM,
      transite_to: transite_to,
      feed_event: feed_event,

      updateControls: updateControls,
      play: play,
      pause: pause,
    };

    // EventEmitter로서의 정체성과 FSM에 event를 발생시키는 것과 이름이 Event로 겹친다.
    VP.EventEmitter.prototype.init.call(_o);
    _.extend(_o, VP.EventEmitter.prototype);
    return _o;
  })();

  VP.RapsodyPlayer.View = {};
  VP.RapsodyPlayer.View.build = function(fredValue) {
    var self = this;
    var video_url = fredValue['video']
      , destination_url = fredValue['destination_url'];

    var rapsody_placeholder = document.createElement('div');
    rapsody_placeholder.className = "rapsody-placeholder";

    var v = document.createElement('video')
    v.src = video_url;
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

    _listen(_findByClassName('rapsody-go-to-advertiser-page'),
      'click',
      function () {
        location.href = destination_url;
      });

    var _fmtTm = function(timeInSec) {
      var tm = timeInSec.toFixed();
      var min = Math.floor(tm / 60);
      var sec = tm % 60;
      return min + ":" + ((sec < 10) ? '0' + sec: sec);
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

    self.videoEl.addEventListener('timeupdate',
      function() {
        var v = self.videoEl;
        self.timeLabel().innerHTML = _fmtTm(v.currentTime);
        self.progressBarHighlight().style.width =
          (v.currentTime / v.duration * 100) + '%';
      }
    );

    self.videoEl.addEventListener('timeupdate',
      function() {
        var percent = (v.currentTime / v.duration) * 100;
        _.each([0, 25, 50, 75, 100], function(_p) {
          if (percent >= _p) {
            // :sigh: globals
            VP.RapsodyPlayer.emit_once("timeplayed" + _p);
          }
        });
      }
    );

    return rapsody_placeholder;
  }


  function isElementInViewport (el, visibleRatio) {
    // http://stackoverflow.com/a/7557433/262425
    var rect = el.getBoundingClientRect();
    debug(rect);
    debug(rect.bottom * visibleRatio, (window.innerHeight || document.documentElement.clientHeight));
    var visibleRatio = visibleRatio || 1.0;
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.top + rect.height * visibleRatio <= (window.innerHeight || document.documentElement.clientHeight) && /*or $(window).height() */
        rect.left + rect.width * visibleRatio <= (window.innerWidth || document.documentElement.clientWidth)  * visibleRatio /*or $(window).width() */
    );
  };

  VP.RapsodyPlayer.setUpAutoPlayInSight = function(videoEl) {
    var fired = false;
    var _ = function(ev) {
      if (isElementInViewport(videoEl, .5) && !fired) {
        fired = true;
        VP.RapsodyPlayer.feed_event(VP.RapsodyPlayer.FSM.player, 'autoplay-in-sight');
      }
    };
    document.addEventListener('touchstart', _);
    document.addEventListener('touchend', _);
  }

  return VP;
})(window.VP || {});



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

_testRemoteFetchPromise()
 .then(toDOM)
 .then(function (vastDoc) {
   // 요청하는 쪽에서 어떻게 요청할까? guide를 어떻게 적을까?
   //   css를 뭐로 넣어주어야 하나?

   // XXX 핸드폰에서 정말 pixelRatio를 구해서 쓴다.
   VP.Fred.main(vastDoc, {w: 750, h: 750/6*4 });
   console.log("calling resolve");
 })
 .then(function () {
   console.log("updateControls");
   VP.RapsodyPlayer.updateControls();
 })


//
//
// XXX volumn off를 한 번 play가 시작되고 나면 없애자.
//
//
