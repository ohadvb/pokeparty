var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

Array.prototype.unique = function () {
    var a = this.concat();
    for (var i = 0; i < a.length; ++i) {
        for (var j = i + 1; j < a.length; ++j) {
            if (a[i] === a[j]) a.splice(j--, 1);
        }
    }
    return a;
};

class Pokemon extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return React.createElement(
            "div",
            { className: "pc-entry", onClick: this.props.onClick },
            React.createElement("img", { src: "/app/sprites/" + this.props.index + ".png" }),
            React.createElement(
                "h1",
                null,
                this.props.name,
                " / ",
                this.props.species
            ),
            React.createElement(
                "h2",
                null,
                "Lv ",
                this.props.level
            )
        );
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
        return React.createElement(
            "div",
            { className: "pc-entry-container" },
            this.props.list.map(mon => React.createElement(Pokemon, _extends({}, mon, { onClick: that.onClick.bind(that, mon) })))
        );
    }
}

PokemonList.defaultProps = { onClick: null };

class MyBoxes extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return React.createElement(
            "div",
            { className: "pc-my" },
            React.createElement(
                "header",
                null,
                React.createElement(
                    "a",
                    { className: "pc-btn", onClick: () => this.props.changeBox(-1) },
                    "\u25C0"
                ),
                React.createElement(
                    "span",
                    null,
                    "BOX ",
                    this.props.box + 1
                ),
                React.createElement(
                    "a",
                    { className: "pc-btn", onClick: () => this.props.changeBox(1) },
                    "\u25B6"
                )
            ),
            React.createElement(PokemonList, { list: this.props.boxes[this.props.box] })
        );
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

    render() {
        return React.createElement("input", { type: "text", value: this.props.text, ref: "filterTextInput", onChange: this.handleChange });
    }
}

class OtherBox extends React.Component {
    constructor(props) {
        super(props);
        this.state = { searchText: "" };

        this.handleChange = this.handleChange.bind(this);
        this.handleClick = this.handleClick.bind(this);
    }

    handleChange(newText) {
        this.setState({ searchText: newText });
    }

    handleClick(mon) {
        this.props.addMon(mon);
    }

    render() {
        var rows = [];
        this.props.list.forEach(function (mon) {
            if (this.state.searchText != "" && mon.name.toLowerCase().indexOf(this.state.searchText.toLowerCase()) === -1 && mon.species.toLowerCase().indexOf(this.state.searchText.toLowerCase())) {
                return;
            }
            rows.push(mon);
        }.bind(this).bind(rows));
        rows = rows.unique();
        return React.createElement(
            "div",
            { className: "pc-other" },
            React.createElement(
                "header",
                null,
                React.createElement(
                    "span",
                    null,
                    "Search:"
                ),
                React.createElement(SearchBox, { text: this.state.searchText, onChange: this.handleChange })
            ),
            React.createElement(PokemonList, { list: rows, onClick: this.handleClick })
        );
    }
}

class PC extends React.Component {
    constructor(props) {
        super(props);
        this.initialized = false;
        this.state = { box: 0, boxes: [[]], list: [] };

        this._set_data = this._set_data.bind(this);
        this.addMon = this.addMon.bind(this);
        this.changeBox = this.changeBox.bind(this);
        this.render = this.render.bind(this);
        this.flush = this.flush.bind(this);
    }

    changeBox(d) {
        var newVal = (this.state.box + d + this.state.boxes.length) % this.state.boxes.length;
        this.setState({ box: newVal });
    }

    addMon(mon) {
        i = this.state.box;
        if (this.state.boxes[i].length >= 20) {
            return;
        }
        this.dirty = true;
        this.state.boxes[i].unshift(mon);
        this.setState({ boxes: this.state.boxes });
    }

    flush() {
        if (this.dirty) {
            socket.emit("update boxes", this.state.boxes);
        }
        this.dirty = false;
    }

    _set_data(boxes) {
        this.dirty = false;
        this.initialized = true;
        this.setState({ boxes: boxes.pc, list: boxes.list });
    }

    componentDidMount() {
        socket.on('boxes', this._set_data);
        document.getElementById("game_tablink").addEventListener('click', this.flush);
    }

    render() {
        if (!this.initialized) {
            return React.createElement(
                "div",
                null,
                " "
            );
        }
        return React.createElement(
            "div",
            { className: "pc" },
            React.createElement(MyBoxes, { box: this.state.box, boxes: this.state.boxes, changeBox: this.changeBox }),
            React.createElement(OtherBox, { list: this.state.list, addMon: this.addMon })
        );
    }
}

ReactDOM.render(React.createElement(PC, null), document.getElementById("PC_APP"));

