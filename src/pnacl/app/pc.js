class Pokemon extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return ( <div className="pc-entry">
          <img src={"/app/sprites/" + this.props.index + ".png"}/>
          <h1>{this.props.name} / {this.props.species}</h1>
          <h2>Lv {this.props.level}</h2>
        </div> );
 
    }

}

class PokemonList extends React.Component {
    constructor(props) {
        super(props);
        console.log(props);
        this.state = {list : props.list };
    }

    componentWillReceiveProps( newProps ) {
        this.setState( newProps );
    }

    render() {
        if (this.state.list.length == 0) {
            return <div> </div>;
        }
        return ( <div>
            { this.state.list.map(mon => ( <Pokemon {...mon} /> ))  }
            </div>
        );
    }
}

class PC extends React.Component {
    constructor(props) {
        super(props);
        this.state = {box : 0, boxes : [[]], list : [] };

        this._set_data = this._set_data.bind(this);
}

    _set_data(boxes) {
        this.setState({boxes: boxes.pc, list : boxes.list});
    }

    componentDidMount() {
        socket.on('boxes', this._set_data);
    }

    render() {
        console.log("PC.render");
        console.log({...this.state});
        return (
            <div>
            <div className="pc-my">
                <header>
                    <a className="pc-btn" href="#">&#x25c0;</a>
                    <span>BOX {this.state.box + 1}</span>
                    <a className="pc-btn" href="#">&#x25b6;</a>
                </header>
                <PokemonList list={this.state.boxes[this.state.box]} />
            </div>
            <div className="pc-other">
                <header>
                    <span>Search:</span>
                <input/>
                <PokemonList list={this.state.list} />
                </header>
            </div>
            </div>
        );
    }
}

ReactDOM.render(<PC />, document.getElementById("PC_APP"));
