from flask import Flask, request, send_from_directory
from flask_socketio import SocketIO,send,emit
from werkzeug.utils import secure_filename
import os.path, os
import fnmatch

UPLOAD_PATH = 'app/shared'
UPLOAD_FOLDER = "/" + UPLOAD_PATH
ALLOWED_EXTENSIONS = set(['sgm'])

pokedex = "00" * 64

# set the project root directory as the static folder, you can set others.
app = Flask(__name__, static_url_path='')
app.config['UPLOAD_FOLDER'] = UPLOAD_PATH
socketio = SocketIO(app)


def send_list(broadcast = True):
   l = []
   for f in os.listdir(UPLOAD_PATH):
       if fnmatch.fnmatch(f, "*.sgm"):
            l.append(f.replace(".sgm", ""))
   if broadcast:
         socketio.emit("update list", l, broadcast = True)
   else:
       emit("update list", l)

def send_dex(broadcast = True):
    global pokedex
    if broadcast:
        socketio.emit("pokedex", pokedex)
    else:
        emit("pokedex", pokedex)


@app.route(UPLOAD_FOLDER, methods = ['POST'])
def upload_file():
    if 'file' not in request.files:
        flash('No file part')
        return redirect(request.url)
    file = request.files['file']
    # if user does not select file, browser also
    # submit a empty part without filename
    # if file.filename == '':
    #     flash('No selected file')
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], file.filename))
    send_list()
    return "Uploaded succesfully"
                                    

@app.route('/app/<path:path>')
def send_js(path):
    return send_from_directory('app', path)

@socketio.on('connect event')
def handle_my_custom_event(msg):
        send_list(False)
        send_dex(False)


@socketio.on('pokedex')
def handle_my_custom_event(msg):
    global pokedex
    if msg == pokedex:
        return
    new_dex =  "".join(["%x" % (int(x,16) | int(y,16)) for (x, y) in zip(msg, pokedex[:len(msg)])])
    print new_dex
    pokedex = new_dex
    send_dex()

if __name__ == "__main__":
    socketio.run(app)
