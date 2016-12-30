from flask import Flask, request, send_from_directory, jsonify, redirect
from flask_socketio import SocketIO,send,emit
from werkzeug.utils import secure_filename
import pdb
import box_parser
import os.path, os
import fnmatch

UPLOAD_PATH = 'app/shared'
UPLOAD_FOLDER = "/" + UPLOAD_PATH
ALLOWED_EXTENSIONS = set(['sgm'])

BOXES_PATH = '/app/boxes'

pokedex = "00" * 64
boxes = {}
gen1_boxes = {}

gen1_list = {}
gen2_list = {}

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

def get_games_list():
    return get_list("app/games", "*.zip", ".zip")

def games_list(broadcast = False):
    my_send("games list", get_games_list(), broadcast) 
    

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

def should_add_mon(l, mon):
    mon = mon["pokemon"]
    if mon["level"] == 0:
        return False
    if mon["index"] not in l:
        return True
    cur_mon = l[mon["index"]]["pokemon"]
    if cur_mon["level"] < mon["level"]:
        return True
    if cur_mon["level"] > mon["level"]:
        return False
    if "Friendship" in cur_mon and "Friendship" in mon:
        if cur_mon["Friendship"] < mon["Friendship"]:
            return True
        if cur_mon["Friendship"] > mon["Friendship"]:
            return False
    if cur_mon["Exp"] < mon["Exp"]:
        return True
    return False

def update_list(l, new_mons):
    for mon in new_mons["party"]:
        if not should_add_mon(l, mon):
            continue
        l[mon["index"]] = mon
    for box in new_mons["pc"]:
        for mon in box:
            if not should_add_mon(l, mon):
                continue
            l[mon["index"]] = mon

@socketio.on("save")
def upload_file(data):
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], data["game"], data["name"] + ".sgm")
    if os.path.exists (file_path):
        print 'Upload rejected, file exists'
        my_send("save_exists", [data["name"]], False)
        return 
    f = open(file_path, "wb")
    f.write(data["data"])
    f.close()
    saves_list()
    return 
                                    
@socketio.on('boxes')
def upload_box(data):
    if (data["gen"] == 1):
        gen1_data= box_parser.parse_gen1_data(data["data"])
        gen1_boxes[request.sid] = gen1_data
        boxes[request.sid] = gen1_data
        update_list(gen1_list, gen1_data)
        update_list(gen2_list, gen1_data)
        print gen1_data
    else:
        boxes[request.sid] = box_parser.parse_data(data["data"])
        update_list(gen2_list, boxes[request.sid])
        print boxes[request.sid]
    emit("uploaded", "boxes")
    return

boxes_count = 0
@socketio.on('update boxes')
def update_boxes(new_boxes):
    global boxes_count
    if len(new_boxes) == 12:
        trainer = gen1_boxes[request.sid]["trainer"]
    else:
        trainer = boxes[request.sid]["trainer"]
    data = box_parser.build_boxes(new_boxes, trainer) 

    file_name = "%s.boxes.%d.dat" %(request.sid, boxes_count)
    boxes_count += 1
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], file_name)
    f = open(file_path, "wb")
    f.write(data)
    f.close()

    boxes[request.sid]["pc"] = new_boxes
    emit("update boxes", file_name) 

def flat_list(to_send):
    return sorted(to_send.values(), key=lambda x:x["level"], reverse=True)

@socketio.on('get boxes')
def send_boxes(msg):
    gen = msg
    if gen == 1:
        out_boxes = gen1_boxes
        out_list = flat_list(gen1_list)
    else:
        out_boxes = boxes
        out_list = flat_list(gen2_list)
    if not request.sid in out_boxes:
        emit("boxes", [])
    to_send = out_boxes[request.sid]
    to_send["list"] = out_list
    emit("boxes", to_send) 

@app.route('/')
def redirect_to_game():
    return redirect("/app/game.html")

@app.route('/app/<path:path>')
def send_js(path):
    return send_from_directory('app', path)

@socketio.on('connect event')
def handle_my_custom_event(msg):
        print "connected"
        games_list(False)
        send_dex(False);

def create_dir(path):
    if not os.path.exists(path):
        print "created %s" %(path)
        os.mkdir(path)


def create_save_path(game):
    path = os.path.join(UPLOAD_PATH, game)
    create_dir(path)
    saves_path[game] = path


@socketio.on('startgame event')
def handle_my_custom_event(msg):
    create_save_path(msg)
    saves_list(False)
    send_dex(False)

@socketio.on('pokedex')
def handle_my_custom_event(msg):
    global pokedex
    if (len(msg) < len(pokedex)):
            fill = "0" * ((len(pokedex)-len(msg))/2)
            msg = msg[:len(msg)/2] + fill + msg[len(msg)/2:] + fill 
            print len(msg),len(pokedex)
    new_dex =  "".join(["%x" % (int(x,16) | int(y,16)) for (x, y) in zip(msg, pokedex[:len(msg)])])
    print new_dex
    if new_dex  == pokedex:
        send_dex(False)
        return
    pokedex = new_dex
    send_dex()

def prepare_environment():
    create_dir(UPLOAD_PATH)
    for game in get_games_list():
        create_save_path(game)

    

if __name__ == "__main__":
    # app.debug=True
    prepare_environment()
    socketio.run(app, host="0.0.0.0")
