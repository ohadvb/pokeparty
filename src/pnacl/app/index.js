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

function handle_saved_to(msg) {
    saves_fs.root.getFile( msg, {}, function(entry) {
        console.log("uploading");
        entry.file( function(file) {
            var form = new FormData();
            // form.append("filename", "uploaded.sgm");
            var fname = "";
            while( fname == "" )
            {
                fname = prompt("Enter filename:", "");
            }
            form.append("file", file, fname + ".sgm" );

            var xhr = new XMLHttpRequest();
            xhr.onload = function() {
                    console.log("Upload complete.");
            };
            xhr.open("post", "/app/shared", true);
            xhr.send(form);
        }, errorHandler);
    }, errorHandler);
    
}

function send_file() {
    send_to_nacl("save noargs\n");
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
      splitted = e.data.split(" ");
      if (splitted[1] != "POKEMSG")
      {
          // console.log("discard " + e.data);
          return;
      }
      if (splitted[2] == "saved")
      {
          handle_saved_to(splitted[3].replace(/^\s+|\s+$/g, ''));
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
socket.on("update list", function(msg) {
    console.log(msg);
});

