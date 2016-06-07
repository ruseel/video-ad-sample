
(function() {
  window.VP = window.VP || {};
  var Rapsody = window.VP.Rapsody = window.VP.Rapsody || {};



  // play 만 호출하면 source를 돌아가게 한다?
  //  다양한 소스를 어떻게 돌아가게 하지?
  //    그렇게 하면 안 된다는 썰들이 좀 있다.
  //
  // 아예 spec안에 source element를 dynamic 하게 바꾸면
  //
  // http://stackoverflow.com/a/8389422/262425

  // state 별로 div layer만 바꾸도록 해야 하나?

  var _video, _old_state, _state;

  Rapsody.init = function(id) {
    _state = "paused";
    _video = document.createElement('video');
    _video.src = "https://s3-ap-southeast-1.amazonaws.com/vp-campaigns-videos-transcoded-singapore/maze_runner_low.mp4";
    // _video.play();

    var placeholder = document.getElementById(id);
    placeholder.appendChild(_video);
    placeholder.addEventListener('click', Rapsody.handleClick_);

    $('.rapsody-play-btn').click(function() {
      alert('x');
    })
  }

  Rapsody.handleClick_ = function() {
    switch(_state) {
      case "paused":
        Rapsody.transition("playing");
        break;
      case "playing":
        _video.pause();
        Rapsody.transition("paused");
        break;
      // case "finisehd":
      //   Rapsody.transition("playing");
      //   break;

    }
    console.log("handleClick_");
  }

  Rapsody.transition = function(new_state) {
    switch (new_state) {
      case "playing":
        _video.play();
        break;
      case "paused":
        _video.pause();
        break;
    }

    _old_state = _state;
    _state = new_state;
  }

})();
