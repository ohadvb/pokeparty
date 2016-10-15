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

class MyBoxes extends React.Component {
    constructor(props) {
        super(props);
        this.state = { box : props.box, boxes : props.boxes };
    }

    render() {
        return (<div className="pc-my">
                <header>
                    <a className="pc-btn" href="#"cla>&#x25c0;</a>
                    <span>BOX {this.state.box + 1}</span>
                    <a className="pc-btn" href="#">&#x25b6;</a>
                </header>
                <PokemonList list={this.state.boxes[this.state.box]} />
                </div> );
    }
}

class OtherBox extends React.Component {
    constructor(props) {
        super(props);
        this.state = {list : props.list};
    }

    render() {
            return (
                <div className="pc-other">
                    <header>
                        <span>Search:</span>
                        <input/>
                    </header>
                    <PokemonList list={this.state.list} />
                </div>
                );
    }
}

class PC extends React.Component {
    constructor(props) {
        super(props);
        this.initialized = false;
        this.state = {box : 0, boxes : [[]], list : [] };

        this._set_data = this._set_data.bind(this);
        this.render = this.render.bind(this);
}

    _set_data(boxes) {
        this.initialized = true;
        this.setState({boxes: boxes.pc, list : boxes.list});
    }

    componentDidMount() {
        socket.on('boxes', this._set_data);
    }

    render() {
        if (!this.initialized) {
            return <div> </div>;
        }
        return (
            <div>
                <MyBoxes box={0} boxes={this.state.boxes} />
                <OtherBox list = {this.state.list} />
            </div>
        );
    }
}

ReactDOM.render(<PC />, document.getElementById("PC_APP"));
