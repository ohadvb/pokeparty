#include "../common/types.h"


void message_js(char * msg);
void handle_incoming_js_messages();
void pokedex_hook(u16 address);
void box_and_party_hook(u16 address);
void run_memory_hooks(u16 address, u8 value);
void sram_hook(u16 address, u8 value);
