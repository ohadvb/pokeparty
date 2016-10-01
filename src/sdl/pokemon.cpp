#include <stdio.h>
#include <sys/poll.h>
#include "pokemon.h"
#include "../System.h"

extern struct EmulatedSystem emulator;

static const char * MESSAGE_FORMAT = "POKEMSG %s\n";

void message_js(char * msg)
{
    printf(MESSAGE_FORMAT, msg);
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
    scanf("%s", msg);
    fprintf(stderr, "%s\n",  msg);
}

void run_memory_hooks(u16 address)
{
    pokedex_hook(address);
}

void pokedex_hook(u16 address)
{
    if (address >= 0xdbe4 && address <= 0xdc13)
    {
        // TODO: send pokedex data
        // fprintf(stderr, "%p\n",  address);
    }
}
