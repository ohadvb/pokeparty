#include <stdio.h>
#include <string.h>
#include <sys/poll.h>
#include "pokemon.h"
#include "../System.h"
#include "../gb/gb.h"

extern struct EmulatedSystem emulator;

static const char * MESSAGE_FORMAT = "POKEMSG %s\n";
static const u16 POKEDEX_START  = 0xdbe4; 
static const u16 POKEDEX_END  = 0xdc23; 
static const u16 POKEDEX_LEN = POKEDEX_END - POKEDEX_START + 1;
static const u16 PARTY_START = 0xda22;
static const u16 PARTY_END = 0xdb49;
static const u16 PARTY_NAMES_START = 0xdb4a;
static const u16 PARTY_NAMES_END = 0xdbcd;
static const u16 CURRENT_BOX_NUMBER = 0xD8BC; 
static const u16 CURRENT_BOX_START = 0xad6c; // sram 1
static const u16 CURRENT_BOX_END = 0xb1b9;
static const u16 BOXES_START = 0xa000; //sram 2
static const u16 BOXES_END = 0xbe2e;

u8 current_sram_bank = 0;


void message_js(char * msg)
{
    printf(MESSAGE_FORMAT, msg);
}

void do_save()
{
    int ret = emulator.emuWriteState("/store/states/to_upload.sgm");
    message_js("saved states/to_upload.sgm");
}

void send_dex()
{
    printf("POKEMSG pokedex ");
    for( int i = POKEDEX_START; i <= POKEDEX_END; i++ )
    {
        printf("%02x", gbReadMemory(i));
    }
    printf("\n");
}

void do_load(char * path)
{
    fprintf(stderr, "loading %s\n",  path);
    emulator.emuReadState(path);
    send_dex();
}


void do_dex(char * message)
{
    for (int i = 0; i < POKEDEX_LEN; i++)
    {
        u8 b = 0;
        sscanf(message, "%2hhx", &b);
        message += 2;
        realWriteMemory(POKEDEX_START + i, b);
    }

}

void handle_incoming_js_messages()
{
    struct pollfd fds;
    int ret;
    fds.fd = 0; /* this is STDIN */
    fds.events = POLLIN;
    ret = poll(&fds, 1, 0);

    if ( ret != 1 )
    {
        return;
    }
    char msg[1024];
    char arg[1024];
    scanf("%s %s", msg, arg);
    fprintf(stderr, "%s\n",  msg);

    if (0 == strcmp(msg, "save"))
    {
        do_save();
    }
    if (0 == strcmp(msg, "load"))
    {
        do_load(arg);
    }
    if (0 == strcmp(msg, "pokedex"))
    {
        do_dex(arg);
    }
    
}

void run_memory_hooks(u16 address, u8 value)
{
    pokedex_hook(address);
    sram_hook(address, value);
    box_and_party_hook(address);
}

extern u8 * gbRam;
// bank x is in gbRam[x << 13]
//ox4000 selects bank, 0xa to 0 enables, 0 to 0 disables
void sram_hook(u16 address, u8 value)
{
    if (address == 0x4000)
    {
        current_sram_bank = value;
    }
}

void box_and_party_hook(u16 address)
{
    //TODO: current implementation results in 40 prints, find a good way to cache it.
    static bool last_write_was_pokemon = false;
    bool writing_pokemon = false;
    if (address >= PARTY_START && address <= PARTY_END)
    {
        writing_pokemon  = true;
    }
    if (address == CURRENT_BOX_NUMBER)
    {
        writing_pokemon  = true;
    }
    if (current_sram_bank == 1 && address >= CURRENT_BOX_START && address <= CURRENT_BOX_END)
    {
        writing_pokemon  = true;
    }
    if (current_sram_bank == 2 && address >= BOXES_START && address <= BOXES_END)
    {
        writing_pokemon  = true;
    }
    if (!writing_pokemon && last_write_was_pokemon)
    {
        fprintf(stderr, "writing pokemon data\n");
    }
    last_write_was_pokemon = writing_pokemon;
}

void pokedex_hook(u16 address)
{
    static bool last_write_was_pokedex = false;
    if (address >= POKEDEX_START && address <= POKEDEX_END)
    {
        last_write_was_pokedex = true;
        return;
    }
    if(last_write_was_pokedex)
    {
        send_dex();
    }

    last_write_was_pokedex = false;
}
