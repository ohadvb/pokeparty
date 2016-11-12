
var IMG_SIZE = 40;
const MONS_PER_LINE=18;

class Mon extends React.Component {
    constructor(props) {
        super(props);
    }
   
    render() {
        var d;
        if (this.props.has)
            d = "none"
        else
            d = "opacity(20%)"
        return (
            <img src={this.props.src} style={{filter: d}} height={IMG_SIZE} width = {IMG_SIZE}/>
        );
    }
}

class Bar extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div className={"c100 p" + Math.floor(this.props.count*(100/this.props.from))}>
                <span>{this.props.count}/{this.props.from}</span>
                <div className="slice">
                    <div className="bar"/>
                    <div className="fill"/>
                </div>
            </div>
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
            var index = 2 * Math.floor((i-1)/8);
            var byte = this.props.dex.substring(index, index+2);
            byte = parseInt(byte, 16);
            var has = (byte >>> ((i-1)&7) & 1) === 1

            count2 += has;
            if (i <= 151) 
                count1+=has;

            rows.push(<Mon src={"/app/sprites/" + i + ".png"} has={has}/>);
            if (i % MONS_PER_LINE == 0 ) {
                rows.push(<br/>);
            }
        }
        return ( 
            <div style={{display: "flex", flexDirection: "row"}}>
                <div>
                    {rows}
                </div>
                <div  style={{display: "flex", flexDirection: "column"}} > 
                    <Bar count={count1} from={151}/>
                    <Bar count={count2} from={251}/>
                </div>
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
