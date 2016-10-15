from flask import Flask, request, send_from_directory, jsonify
from flask_socketio import SocketIO,send,emit
from werkzeug.utils import secure_filename
import box_parser
import os.path, os
import fnmatch

UPLOAD_PATH = 'app/shared'
UPLOAD_FOLDER = "/" + UPLOAD_PATH
ALLOWED_EXTENSIONS = set(['sgm'])

BOXES_PATH = '/app/boxes'

pokedex = "00" * 64
boxes = {}

# set the project root directory as the static folder, you can set others.
app = Flask(__name__, static_url_path='')
app.config['UPLOAD_FOLDER'] = UPLOAD_PATH
socketio = SocketIO(app)

saves_path = {}

def my_send(msg, l, broadcast):
   if broadcast:
         socketio.emit(msg, l, broadcast = True)
   else:
       emit(msg, l)

def saves_list(broadcast = True):
    suffix = ".sgm"
    d = {}
    for game in saves_path.keys():
        d[game] = get_list(saves_path[game], "*" + suffix, suffix)
    print d
    my_send("update list", d, broadcast)

    # send_list(UPLOAD_PATH, "*" + suffix, suffix, "update list", broadcast)

def games_list(broadcast = False):
    my_send("games list", get_list("app/games", "*.zip", ".zip"), broadcast) 
    

def get_list(path, match, trim_str):
    l = []
    for f in os.listdir(path):
       if fnmatch.fnmatch(f, match):
            l.append(f.replace(trim_str, ""))
    return l

def send_dex(broadcast = True):
    global pokedex
    if broadcast:
        socketio.emit("pokedex", pokedex)
    else:
        emit("pokedex", pokedex)


@app.route(UPLOAD_FOLDER, methods = ['POST'])
def upload_file():
    if 'file' not in request.files:
        abort(400)
    file = request.files['file']
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], file.filename))
    saves_list()
    return "Uploaded succesfully"
                                    
@socketio.on('boxes')
def upload_box(data):
    boxes[request.sid] = box_parser.parse_data(data)
    return

@socketio.on('update boxes')
def update_boxes(new_boxes):
    print new_boxes
    data = box_parser.build_boxes(boxes)

def flat_list(sid):
    l = []
    for key in [k for k in boxes.keys() if k != sid]:
        l = l + boxes[key]["party"]
        for b in boxes[key]["pc"]:
            l = l + b
    return l


@socketio.on('get boxes')
def send_boxes():
    if len(boxes.keys()) == 0:
        emit("boxes", [])
    boxes[request.sid]["list"] = flat_list(request.sid)
    emit("boxes", boxes[request.sid]) 

@app.route('/app/<path:path>')
def send_js(path):
    return send_from_directory('app', path)

@socketio.on('connect event')
def handle_my_custom_event(msg):
        print "connected"
        games_list(False)

def create_save_path(game):
    path = os.path.join(UPLOAD_PATH, game)
    if not os.path.exists(path):
        print "created %s" %(path)
        os.mkdir(path)
    saves_path[game] = path


@socketio.on('startgame event')
def handle_my_custom_event(msg):
    create_save_path(msg)
    saves_list(False)
    send_dex(False)

@socketio.on('pokedex')
def handle_my_custom_event(msg):
    global pokedex
    new_dex =  "".join(["%x" % (int(x,16) | int(y,16)) for (x, y) in zip(msg, pokedex[:len(msg)])])
    print new_dex
    if new_dex  == pokedex:
        send_dex(False)
        return
    pokedex = new_dex
    send_dex()

if __name__ == "__main__":
    socketio.run(app)
