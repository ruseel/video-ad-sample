// http://stackoverflow.com/a/30008115/262425
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


// ---

var perferredHardwarePixelWH = {w: 750, h: 750/6*4 };

function best_match(mediaFiles, perferredHardwarePixelWH) {
  var w = function(el) { return el.getAttribute("width"); }
  var m = _.chain(mediaFiles)
   .filter(function(m) { return w(m) < perferredHardwarePixelWH["w"]; })
   .max(function(m) { return w(m); })
   .value();
  return m;
}

function getVideoURL(fnBestMatch, linear, perferredHardwarePixelWH) {
  var mediaFiles = linear.getElementsByTagName('MediaFile');
  var one = fnBestMatch(mediaFiles, perferredHardwarePixelWH);
  var video_url = one.childNodes[0].nodeValue;
  return video_url;
}

function getLinear(vastDoc) {
  var linear = vastDoc
    .evaluate('(/VAST/Ad/InLine/Creatives/Creative/Linear)[1]', vastDoc)
    .iterateNext();
  if (!linear) {
    throw new Error("no linear element exists");
  }
  return linear;
}

// 자, videoURL을 가져올 수 있다.
//   클래스로 만든다면 뭐가 있어야 할까?

function vastPromise() {
  return makeRequest({
    "url": "/public/ima-tag-1.xml",
    "method": "GET"
  })
}

function toDOM(xhr) {
  return xhr.responseXML;
}

function getFuckingCompanion(vastDoc) {
  var companion = vastDoc.evaluate('//CompanionAds/Companion', vastDoc).iterateNext();
  if (!companion) throw Error('no Companion exists');
  return companion;
}

function getImageBannerURLFromFuckingCompanion(companion) {
  var lst = companion.getElementsByTagName('StaticResource');
  if (lst.length > 0) {
    return lst[0].textContent;
  }
}

// 이렇게 이쁘게 고치는 것도 말이 된다.
// v companionAd만 얻자.
// v imageBannerURL만 얻자.
// v vast안에서 이미지를 고쳐보자.
// v 이미지만 하나 구한다.

// v 화면에 두개를 넣어서 구성해보자.
// v 브라보 무언가 나왔다. 또 이것 저것 적어보자.

// v css pixel 300px로 600px 짜리 이미지가 잘 표시될까?
// v 신경쓰지 말자. 잘 될거라고 보자.
//
// v  workflowy에 적어둔 거랑 비교해보자. 없는 듯 하다.

// 그리고 class 를 만들어서 다시 배치한다. 돌아가게만 만들어본다. 거지같이~~!

function ensure(lhs, msg) {
  if (!lhs) {
    throw Error('ensure error: ' + msg);
  }
  return lhs;
}

function displayFuckingMapToPlaceHolder(d, id) {
  var _v = document.createElement('video')
  var _img = document.createElement('img')
  _v.src = d['video'];
  _img.src = d['image_banner'];

  var _p = ensure(document.getElementById(id), "placeholder should be exsits");
  _p.appendChild(_img);
  _p.appendChild(_v);
}

function main() {
  vastPromise()
    .then(toDOM)
    .then(function(vastDoc) {
        return {
          video: getVideoURL(
            best_match,
            getLinear(vastDoc),
            perferredHardwarePixelWH),
          image_banner:
            getImageBannerURLFromFuckingCompanion(
              getFuckingCompanion(vastDoc))
        };
    }).then(function(fuckingMap) {
      displayFuckingMapToPlaceHolder(fuckingMap, "placeholder");
    }).catch(function(err) {
      throw err;
    })
}


main();
