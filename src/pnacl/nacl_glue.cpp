#include <SDL/SDL.h>
// #include <SDL/SDL_nacl.h>
#include <nacl_io/nacl_io.h>
#include <ppapi/c/pp_errors.h>
#include <ppapi/c/pp_instance.h>
#include <ppapi/c/ppb_instance.h>
#include <ppapi/cpp/completion_callback.h>
#include <ppapi/cpp/file_system.h>
#include <ppapi/cpp/input_event.h>
#include <ppapi/cpp/instance.h>
#include <ppapi/cpp/module.h>
#include <ppapi/cpp/var.h>
#include <ppapi/utility/completion_callback_factory.h>
#include <sys/mount.h>
#include <sys/stat.h>

extern int SDL_main(int argc, char **argv);

class GameInstance : public pp::Instance {
 public:
  explicit GameInstance(PP_Instance instance)
    : pp::Instance(instance),
      game_main_thread_(NULL),
      num_changed_view_(0),
      width_(0),
      height_(0),
      cc_factory_(this) {
    // Game requires mouse and keyboard events; add more if necessary.
    nacl_io_init_ppapi(instance, pp::Module::Get()->get_browser_interface());
    RequestInputEvents(PP_INPUTEVENT_CLASS_MOUSE |
                       PP_INPUTEVENT_CLASS_KEYBOARD);
    ++num_instances_;
    assert(num_instances_ == 1);
  }

  virtual ~GameInstance() {
    // Wait for game thread to finish.
    if (game_main_thread_) {
      pthread_join(game_main_thread_, NULL);
    }
  }

  // This function is called with the HTML attributes of the embed tag,
  // which can be used in lieu of command line arguments.
  virtual bool Init(uint32_t argc, const char* argn[], const char* argv[]) {
    for (uint32_t i = 0; i < argc; ++i) {
      if (argn[i] == std::string("width")) {
        width_ = strtol(argv[i], 0, 0);
      }

      if (argn[i] == std::string("height")) {
        height_ = strtol(argv[i], 0, 0);
      }
    }
    return true;
  }

  // This crucial function forwards PPAPI events to SDL.
  virtual bool HandleInputEvent(const pp::InputEvent& event) {
    SDL_NACL_PushEvent(event.pp_resource());
    return true;
  }

  virtual void HandleMessage(const pp::Var& message) {
    pp::VarDictionary args(message);
    pp::Var filesystem_var = args.Get("filesystem");
    if (!filesystem_var.is_resource())
      return;

    pp::Resource filesystem_resource = filesystem_var.AsResource();
    if (!pp::FileSystem::IsFileSystem(filesystem_resource))
      return;

    PP_Resource filesystem_id = filesystem_resource.pp_resource();
    if (!filesystem_id)
      return;

    char buf[BUFSIZ];
    if (snprintf(buf, BUFSIZ, "type=MANUAL,resource_id=%d", filesystem_id) > BUFSIZ)
      return;

    rom_mount_string_ = buf;

    pp::Var path_var = args.Get("path");
    if (!path_var.is_string())
      return;

    rom_path_string_ = path_var.AsString();
  }

  // This function is called for various reasons, e.g. visibility and page
  // size changes. We ignore these calls except for the first
  // invocation, which we use to start the game.
  virtual void DidChangeView(const pp::Rect& position, const pp::Rect& clip) {
    ++num_changed_view_;
    if (num_changed_view_ > 1) return;
    // NOTE: It is crucial that the two calls below are run here
    // and not in a thread.
    SDL_NACL_SetInstance(pp_instance(),
                         pp::Module::Get()->get_browser_interface(),
                         width_,
                         height_);
    // This is SDL_Init call which used to be in game_main()
    int flags = SDL_INIT_VIDEO | SDL_INIT_AUDIO | SDL_INIT_TIMER |
        SDL_INIT_NOPARACHUTE;
    if(SDL_Init(flags))
      exit(-1);

    StartGameInNewThread(0);
  }
 private:
  static int num_instances_;       // Ensure we only create one instance.
  pthread_t game_main_thread_;     // This thread will run game_main().
  int num_changed_view_;           // Ensure we initialize an instance only once.
  // Dimension of the SDL video screen.
  int width_;
  int height_;
  pp::CompletionCallbackFactory<GameInstance> cc_factory_;

  std::string rom_mount_string_;
  std::string rom_path_string_;

  void StartGameInNewThread(int32_t dummy) {
    if (!rom_mount_string_.empty() && !rom_path_string_.empty()) {
      fprintf(stderr, "Mounting %s with %s\n", rom_path_string_.c_str(),
              rom_mount_string_.c_str());
      pthread_create(&game_main_thread_, NULL, &LaunchGame, this);
    } else {
      // Wait some more (here: 100ms).
      pp::Module::Get()->core()->CallOnMainThread(
        100, cc_factory_.NewCallback(&GameInstance::StartGameInNewThread), 0);
    }
  }

  static void* LaunchGame(void* data) {
    // Use "thiz" to get access to instance object.
    GameInstance* thiz = reinterpret_cast<GameInstance*>(data);
    umount("/");
    mount("", "/", "memfs", 0, "");

    mkdir("/config", 0777);
    fprintf(stderr, "mount httpfs = %d\n", mount("/", "/config", "httpfs", 0, ""));

    mkdir("/games", 0777);
    fprintf(stderr, "mount rom = %d\n", mount("/", "/games", "html5fs", 0, thiz->rom_mount_string_.c_str()));

    mkdir("/store", 0777);
    fprintf(stderr, "mount html5fs = %d\n", mount("/", "/store", "html5fs", 0, ""));
    mkdir("/store/states", 0777);
    mkdir("/store/captures", 0777);
    // Craft a fake command line.
    char rom_path[BUFSIZ];
    strncpy(rom_path, ("/games" + thiz->rom_path_string_).c_str(), BUFSIZ);
    char* argv[] = { "vbam", "--config=/config/vbam.cfg", rom_path, NULL};
    SDL_main(3, argv);
    return 0;
  }
};

int GameInstance::num_instances_;

class GameModule : public pp::Module {
 public:
  GameModule() : pp::Module() {}
  virtual ~GameModule() {}

  virtual pp::Instance* CreateInstance(PP_Instance instance) {
    return new GameInstance(instance);
  }
};

namespace pp {
Module* CreateModule() {
  return new GameModule();
}

}  // namespace pp
