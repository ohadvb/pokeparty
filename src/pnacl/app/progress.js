
const IMG_SIZE = 40;
const MONS_PER_LINE=15;

class Mon extends React.Component {
    constructor(props) {
        super(props);
    }
   
    render() {
        var d;
        if (this.props.has)
            d = "none"
        else
            d = "opacity(10%)"
        return (
            <img src={this.props.src} style={{filter: d}} height={IMG_SIZE} width = {IMG_SIZE}/>
        );
    }
}

class Progress extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        var rows = [];
        console.log(this.props.dex);
        for (var i = 1; i <= 251; i++) {
            var index = 2 * Math.floor((i-1)/8);
            var byte = this.props.dex.substring(index, index+2);
            console.log(byte);
            byte = parseInt(byte, 16);
            var has = (byte >>> ((i-1)&7) & 1) === 1

            rows.push(<Mon src={"/app/sprites/" + i + ".png"} has={has}/>);
            if (i % MONS_PER_LINE == 0 ) {
                rows.push(<br/>);
            }
        }
        return ( 
            <div style={{width:IMG_SIZE * MONS_PER_LINE, height:IMG_SIZE*(1+(251/MONS_PER_LINE))}}>
                {rows}
            </div>
        );
    }
}

var socket = io.connect('http://' + document.domain + ':' + location.port);
socket.on('connect', function() {
    socket.emit('connect event', "connect");
    });

socket.on('pokedex', function(msg) {
    ReactDOM.render(<Progress dex={msg}/>, document.getElementById("root"));
});
