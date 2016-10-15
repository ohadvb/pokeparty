function openTab(evt) {
        tablinks = document.getElementsByClassName("tablinks");
        for (i = 0; i < tablinks.length; i++) {
                    tablinks[i].className = tablinks[i].className.replace(" active", "");
                }
        evt.currentTarget.className += " active";
}

function openGame(evt) {
    game_tab = document.getElementById("Game");
    pc_tab = document.getElementById("PC");

    openTab(evt);

    if (!pc_tab.className.includes(" hide")) {
        pc_tab.className += " hide";
    }
    if (game_tab.className.includes(" hidden")) {
        game_tab.className = game_tab.className.replace(" hidden", "");
    }
}
function openPC(evt) {
    game_tab = document.getElementById("Game");
    pc_tab = document.getElementById("PC");

    openTab(evt);

    if (!game_tab.className.includes(" hidden")) {
        game_tab.className += " hidden";
    }
    if (pc_tab.className.includes(" hide")) {
        pc_tab.className = pc_tab.className.replace(" hide", "");
    }
    socket.emit("get boxes");
}
