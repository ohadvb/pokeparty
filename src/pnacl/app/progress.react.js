
var IMG_SIZE = 40;
const MONS_PER_LINE = 18;

class Mon extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        var d;
        if (this.props.has) d = "none";else d = "opacity(20%)";
        return React.createElement("img", { src: this.props.src, style: { filter: d }, height: IMG_SIZE, width: IMG_SIZE });
    }
}

class Bar extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return React.createElement(
            "div",
            { className: "c100 p" + Math.floor(this.props.count * (100 / this.props.from)) },
            React.createElement(
                "span",
                null,
                this.props.count,
                "/",
                this.props.from
            ),
            React.createElement(
                "div",
                { className: "slice" },
                React.createElement("div", { className: "bar" }),
                React.createElement("div", { className: "fill" })
            )
        );
    }
}

class Progress extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        var rows = [];
        var count1 = 0;
        var count2 = 0;
        console.log(this.props.dex);
        for (var i = 1; i <= 251; i++) {
            var index = 2 * Math.floor((i - 1) / 8);
            var byte = this.props.dex.substring(index, index + 2);
            byte = parseInt(byte, 16);
            var has = (byte >>> (i - 1 & 7) & 1) === 1;

            count2 += has;
            if (i <= 151) count1 += has;

            rows.push(React.createElement(Mon, { src: "/app/sprites/" + i + ".png", has: has, key: i }));
            if (i % MONS_PER_LINE == 0) {
                rows.push(React.createElement("br", { key: "br" + i }));
            }
        }
        return React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "row" } },
            React.createElement(
                "div",
                null,
                rows
            ),
            React.createElement(
                "div",
                { style: { display: "flex", flexDirection: "column" } },
                React.createElement(Bar, { count: count1, from: 151 }),
                React.createElement(Bar, { count: count2, from: 251 })
            )
        );
    }
}

var socket = io.connect('http://' + document.domain + ':' + location.port);
socket.on('connect', function () {
    socket.emit('connect event', "connect");
});

socket.on('pokedex', function (msg) {
    ReactDOM.render(React.createElement(Progress, { dex: msg }), document.getElementById("root"));
});

