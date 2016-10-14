function openTab(evt, tabName) {
        var i, tabcontent, tablinks;
        tabcontent = document.getElementsByClassName("tabcontent");
        for (i = 0; i < tabcontent.length; i++) {
                    if (!tabcontent[i].className.includes(" hidden")) {
                        tabcontent[i].className += " hidden";
                    }
                }
        tablinks = document.getElementsByClassName("tablinks");
        for (i = 0; i < tablinks.length; i++) {
                    tablinks[i].className = tablinks[i].className.replace(" active", "");
                }
        document.getElementById(tabName).className = document.getElementById(tabName).className.replace(" hidden", "");
        evt.currentTarget.className += " active";
}
