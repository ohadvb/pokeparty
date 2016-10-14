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
    }

    render() {
        this.props.list.map(mon => ( <Pokemon {...mon} /> ));
    }
}

class PC extends React.Component {
    constructor(props) {
        super(props);
    }

    getInitialState(){ return {boxes: [], list :[]}; } 

    componentDidMount() {
        $.get("/app/boxes", function(result) {
            this.setState( {...result} );
            console.log(result);
        }).bind(this);
    }

    render() {
        console.log({...this.state});
    }
}

