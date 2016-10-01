var plugin = document.getElementById('naclModule');
var resizeTimer;
var firstLoad = false;
var saves_fs = null;

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

function send_to_nacl(msg) {
    message = {};
    message["tty: "] = msg;
    plugin.postMessage(message);
} 

function send_file() {
    saves_fs.root.getDirectory("states",{}, find_file); 
}
// chrome.app.window.current().onBoundsChanged.addListener(scaleNacl);
function errorHandler(e) {
    console.log(e)
}

function onInitFs(fs) {
    console.log('Opened fs: ' + fs);
    saves_fs = fs
}

var listener = document.getElementById('listener');

navigator.webkitPersistentStorage.requestQuota( 10*1024*1024, function(grantedBytes) {
    console.log('granted :' + grantedBytes);
    window.webkitRequestFileSystem(PERSISTENT, grantedBytes, onInitFs, errorHandler);
}, function(e) {
      console.log('Error', e);
});

listener.addEventListener(
  'message',
  function(e) {
    if (e.data.split(" ")[1] != "POKEMSG")
      {
          // console.log("discard " + e.data);
          return;
      }
    console.log(e.data);
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


var socket = io.connect('http://' + document.domain + ':' + location.port);
socket.on('connect', function() {
        socket.emit('POKEMSG', "connected");
    });

