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

void run_memory_hooks(u16 address)
{
    pokedex_hook(address);
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
