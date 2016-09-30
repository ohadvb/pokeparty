from flask import Flask, request, send_from_directory
from flask_socketio import SocketIO

# set the project root directory as the static folder, you can set others.
app = Flask(__name__, static_url_path='')
socketio = SocketIO(app)


@app.route('/app/<path:path>')
def send_js(path):
        return send_from_directory('app', path)

@socketio.on('POKEMSG')
def handle_my_custom_event(msg):
        print('received msg: ' + str(msg))

if __name__ == "__main__":
    socketio.run(app)
