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
static const u16 PARTY_END = 0xdbcd;
static const u16 PARTY_NAMES_START = 0xdb4a;
static const u16 PARTY_NAMES_END = 0xdbcd;
static const u16 CURRENT_BOX_NUMBER = 0xD8BC; 
static const u16 CURRENT_BOX_START = 0xad6c; // sram 1
static const u16 CURRENT_BOX_END = 0xb1b9;
static const u16 BOXES_START = 0xa000; //sram 2
static const u16 BOXES_END = 0xbe2e;

static const u16 BOX_SIZE = 1104;
extern u8 * gbRam;
u8 current_sram_bank = 0;

unsigned long ticks_since_last_write = 0;

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
        //TODO: binary or instead of writes
        realWriteMemory(POKEDEX_START + i, b | gbReadMemory(POKEDEX_START +i));
    }

}

void do_boxes(char * fname)
{
    u8 box_number = gbReadMemory(CURRENT_BOX_NUMBER);
    FILE * in_file = fopen(fname, "rb");
    for (int box = 0; box < 14; box++)
    {
        if (box == box_number)
        {
            int base_index = 1 << 13;
            fread(&gbRam[base_index + CURRENT_BOX_START - 0xa000], BOX_SIZE, 1, in_file);
        }
        else
        {
            int base_index = 2 << 13;
            fread(&gbRam[base_index + BOXES_START + BOX_SIZE*box -0xa000], BOX_SIZE, 1, in_file);
        }
    }
    fclose(in_file);
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
    if (0 == strcmp(msg, "boxes"))
    {
        do_boxes(arg);
    }
}

void run_memory_hooks(u16 address, u8 value)
{
    pokedex_hook(address);
    sram_hook(address, value);
    box_and_party_hook(address);
}

// bank x is in gbRam[x << 13]
void send_boxes()
{
    u8 box_number = gbReadMemory(CURRENT_BOX_NUMBER);
    FILE * out_file = fopen("/store/boxes.bin", "wb");
    if (out_file == NULL)
    {
        fprintf(stderr, "failed to open boxes file\n");
    }
    for (int i = PARTY_START; i <=PARTY_END; i++)
    {
        u8 output = gbReadMemory(i);
        fwrite(&output, 1, 1, out_file);
    }
    for (int box = 0; box < 14; box++)
    {
        if (box == box_number)
        {
            int base_index = 1 << 13;
            fwrite(&gbRam[base_index + CURRENT_BOX_START - 0xa000], BOX_SIZE, 1, out_file);
        }
        else
        {
            int base_index = 2 << 13;
            fwrite(&gbRam[base_index + BOXES_START + BOX_SIZE*box -0xa000], BOX_SIZE, 1, out_file);
        }
    }
    fclose(out_file);
    printf("POKEMSG boxes %s\n", "boxes.bin");
}

void handle_ticks()
{
    ticks_since_last_write++;
    if (ticks_since_last_write == 200)
    {
        send_boxes();
    }
}
//ox4000 selects bank, 0xa to 0 enables, 0 to 0 disables
void sram_hook(u16 address, u8 value)
{
    if (address == 0x4000)
    {
        if ((current_sram_bank == 1 || current_sram_bank == 2) && value != 1 && value != 2)
        {
            // fprintf(stderr, "done with boxes\n");
            // send_boxes();
        }
        current_sram_bank = value;
    }
}

void box_and_party_hook(u16 address)
{
    //TODO: current implementation results in 40 prints, find a good way to cache it.
    if ((address >= PARTY_START && address <= 0xda29) ||
         (address == CURRENT_BOX_NUMBER)||
         (current_sram_bank == 1 && address >= CURRENT_BOX_START && address <= CURRENT_BOX_END)||
         (current_sram_bank == 2 && address >= BOXES_START && address <= BOXES_END))
    {
        ticks_since_last_write = 0;
    }
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
