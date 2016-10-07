
var socket = io.connect('http://' + document.domain + ':' + location.port);
socket.on('connect', function() {
    socket.emit('connect event', "connect");
    });
socket.on("update list", function(msg) {
    update_saves(msg);
});
socket.on("games list", function(msg) {
    update_games(msg);
});
socket.on("pokedex", function(msg) {
    send_to_nacl("pokedex " + msg + "\n"); 
});

