#include "../common/types.h"


void message_js(char * msg);
void handle_incoming_js_messages();
void handle_ticks();
void send_dex();
void send_boxes();
void pokedex_hook(u16 address);
void box_and_party_hook(u16 address);
void trainer_id_hook(u16 address);
void run_memory_hooks(u16 address, u8 value);
void sram_hook(u16 address, u8 value);
