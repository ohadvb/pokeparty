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
        console.log(this.props.list);
        console.log(this.state.list);
        if (this.state.list.length == 0) {
            return <div> </div>;
        }
        console.log("rendering");
        console.log(this.state.list);
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
        return (<PokemonList list={this.state.boxes[0]} />);
    }
}

ReactDOM.render(<PC />, document.getElementById("PC_APP"));
