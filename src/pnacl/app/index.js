var plugin = document.getElementById('naclModule');
var resizeTimer;
var firstLoad = false;

var postFileCallback = function() {};

function scaleNacl() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function() {
    var bounds = chrome.app.window.current().getBounds();
    var scaleX = bounds.width / plugin.width;
    var scaleY = bounds.height / plugin.height;
    var scale = Math.min(scaleX, scaleY);
    plugin.style.webkitTransform = 'scale(' + scale + ')';
  }, 100);
}

function makeNewPlugin() {
  var newNode = plugin.cloneNode(true);
  plugin.parentNode.appendChild(newNode);
  plugin.parentNode.removeChild(plugin);
  plugin = document.getElementById('naclModule');
  document.getElementsByTagName('body')[0].className = 'lightsOn';
}

function showOpenFileDialog() {
  chrome.fileSystem.chooseEntry({
    'type': 'openFile'
    },
    function(entry) {
      if (!entry)
        return;

      postFileCallback = function() {
        plugin.postMessage({
          'path': entry.fullPath,
          'filesystem': entry.filesystem
        });
        document.getElementsByTagName('body')[0].className = 'lightsOff';
        postFileCallback = function() {};
      };
      makeNewPlugin();
    });
}

chrome.app.window.current().onBoundsChanged.addListener(scaleNacl);

var listener = document.getElementById('listener');

// window.webkitStorageInfo.requestQuota(PERSISTENT, 10*1024*1024, function(grantedBytes) {
//       window.requestFileSystem(PERSISTENT, grantedBytes, onInitFs, errorHandler);
// }, function(e) {
//       console.log('Error', e);
// });

listener.addEventListener(
  'message',
  function(e) {
    console.log(e);
  }, true);

listener.addEventListener(
  'crash',
  function(e) {
    makeNewPlugin();
  }, true);

listener.addEventListener(
  'load',
  function(e) {
    document.getElementById('openMessage').style.display = 'block';
    document.getElementById('loadingMessage').style.display = 'none';
    postFileCallback();
    firstLoad = true;
    scaleNacl();
  }, true);

listener.addEventListener(
  'progress',
  function(e) {
    var percent = e.loaded / e.total;
    document.getElementById('progress').style.width = (percent * 100) + '%';
  }, true);

document.addEventListener('keydown', function(e) {
  // Ctrl + o
  if (firstLoad && e.ctrlKey && e.keyCode == 79) {
    showOpenFileDialog();
  }
  // ESC
  if (e.keyCode == 27) {
    makePlugin();
    e.preventDefault();
  }
}, true);
