
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

socket.on("update boxes", function(msg) {
    send_to_nacl("boxes /shared/" + msg + "\n"); 
});

socket.on("uploaded", function(msg) {
    send_to_nacl("uploaded boxes\n"); 
});

socket.on("save_exists", function(msg) {
    alert(msg +  " already exists!");
});
