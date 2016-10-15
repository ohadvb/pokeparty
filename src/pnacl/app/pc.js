class Pokemon extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return ( <div className="pc-entry" onClick={this.props.onClick}>
          <img src={"/app/sprites/" + this.props.index + ".png"}/>
          <h1>{this.props.name} / {this.props.species}</h1>
          <h2>Lv {this.props.level}</h2>
        </div> );
 
    }
}

class PokemonList extends React.Component {
    constructor(props) {
        super(props);
        this.onClick = this.onClick.bind(this);    
    }

    onClick(mon) {
        if (this.props.onClick != null) {
            this.props.onClick(mon);
        }
    }

    render() {
        var that = this;
        if (this.props.list.length == 0) {
            return <div> </div>;
        }
        return ( <div>
            { this.props.list.map(mon => ( <Pokemon {...mon} onClick={that.onClick.bind(that, mon)} /> ))  }
            </div>
        );
    }
}

PokemonList.defaultProps = { onClick : null };

class MyBoxes extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (<div className="pc-my">
                <header>
                    <a className="pc-btn" href="#">&#x25c0;</a>
                    <span>BOX {this.props.box + 1}</span>
                    <a className="pc-btn" href="#">&#x25b6;</a>
                </header>
                <PokemonList list={this.props.boxes[this.props.box]} />
                </div> );
    }
}

class SearchBox extends React.Component {
    constructor(props) {
        super(props); 
        this.handleChange = this.handleChange.bind(this);
    }

    handleChange() {
        this.props.onChange(this.refs.filterTextInput.value);
    }

    render () {
        return <input type="text" value={this.props.text} ref="filterTextInput" onChange={this.handleChange}/>;
    }
}

class OtherBox extends React.Component {
    constructor(props) {
        super(props);
        this.state = {searchText : "" };

        this.handleChange = this.handleChange.bind(this);
        this.handleClick = this.handleClick.bind(this);
    }

    handleChange(newText) {
        this.setState({searchText : newText});
    }

    handleClick(mon) {
        this.props.addMon(mon);
    }

    render() {
            var rows = [];
            this.props.list.forEach( function(mon) {
                if (this.state.searchText != "" && mon.name.indexOf(this.state.searchText) === -1) {
                    return;
                }
                rows.push(mon);
            }.bind(this).bind(rows));
            return (
                <div className="pc-other">
                    <header>
                        <span>Search:</span>
                        <SearchBox text={this.state.searchText} onChange={this.handleChange}/>
                    </header>
                    <PokemonList list={rows} onClick={this.handleClick} />
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
        this.addMon = this.addMon.bind(this);
        this.render = this.render.bind(this);
}

    addMon(mon) {
        console.log("addMon");
        i = this.state.box;
        if (this.state.boxes[i].length >= 20)
        {
            return;
        }
        this.state.boxes[i].push(mon);
        this.setState({boxes : this.state.boxes});
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
                <OtherBox list = {this.state.list} addMon = {this.addMon} />
            </div>
        );
    }
}

ReactDOM.render(<PC />, document.getElementById("PC_APP"));
