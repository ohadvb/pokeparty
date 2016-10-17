#include <stdio.h>
#include <string.h>
#include <sys/poll.h>
#include "pokemon.h"
#include "../System.h"
#include "../gb/gb.h"

extern struct EmulatedSystem emulator;

static const char * MESSAGE_FORMAT = "POKEMSG %s\n";


u16 POKEDEX_START  = 0xdbe4; 
u16 POKEDEX_END  = 0xdc23; 
u16 POKEDEX_LEN = POKEDEX_END - POKEDEX_START + 1;
u16 GEN2_POKEDEX_LEN = POKEDEX_LEN/2;
u16 PARTY_START = 0xda22;
u16 PARTY_LIST_END = 0xda29;
u16 PARTY_END = 0xdbcd;
u16 CURRENT_BOX_NUMBER = 0xD8BC; 
u16 CURRENT_BOX_START = 0xad6c; // sram 1
u16 CURRENT_BOX_END = 0xb1b9;
u8 BOXES_SRAM_MIN = 2;
u8 BOXES_SRAM_MAX = 2;
u16 BOXES_START = 0xa000; //sram 2
u16 BOXES_END = 0xbe2e;
u16 BOX_SIZE = 1104;

extern u8 * gbRam;
extern u8 * gbRom;
u8 current_sram_bank = 0;

unsigned int gen = 0;
unsigned long ticks_since_last_write = 0;

void set_to_gen1()
{
    POKEDEX_START  = 0xd2f7; 
    POKEDEX_END  = 0xd31c; 
    POKEDEX_LEN = POKEDEX_END - POKEDEX_START + 1;
    PARTY_START = 0xd163;
    PARTY_LIST_END = 0xd16a;
    PARTY_END = 0xd2f6;
    CURRENT_BOX_NUMBER = 0xD5a0; 
    CURRENT_BOX_START = 0xb0c0; // sram 1
    CURRENT_BOX_END = 0xb521;
    u8 BOXES_SRAM_MIN = 2;
    u8 BOXES_SRAM_MAX = 3;
    BOXES_START = 0xa000; //sram 2 & 3
    BOXES_END = 0xba4b;
    BOX_SIZE = 1122;
}


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
    send_boxes();
}


void do_dex(char * message)
{
    for (int i = 0; i < POKEDEX_LEN; i++)
    {
        u8 b = 0;
        sscanf(message, "%2hhx", &b);
        message += 2;
        if (i == POKEDEX_LEN/2 && POKEDEX_LEN != GEN2_POKEDEX_LEN * 2)
        {
            message += 2 * (GEN2_POKEDEX_LEN - i);
        }
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

void init_gen()
{
    char * game_text = (char*)&gbRom[0x134];
    static const char GOLD[] = "POKEMON_GLD";
    static const char SILVER[] = "POKEMON_SLV";
    static const char BLUE[] = "POKEMON BLUE";
    static const char RED[] = "POKEMON RED";
    static const char YELLOW[] = "POKEMON YELLOW";

    if (strncmp(game_text, GOLD, strlen(GOLD)) == 0 ||
        strncmp(game_text, SILVER, strlen(SILVER)) == 0)
        {
            fprintf(stderr, "gen 2 game\n");
            gen = 2;
        }
    if (strncmp(game_text, BLUE, strlen(BLUE)) == 0 ||
        strncmp(game_text, BLUE, strlen(BLUE)) == 0 ||
        strncmp(game_text, RED, strlen(RED)) == 0)
        {
            fprintf(stderr, "gen 1 game\n");
            gen = 1;
            set_to_gen1();
        }
}

void run_memory_hooks(u16 address, u8 value)
{
    if (!gen)
    {
        init_gen();
    }
    pokedex_hook(address, value);
    sram_hook(address, value);
    box_and_party_hook(address);
    trainer_id_hook(address);
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

void trainer_id_hook(u16 address)
{
    if (address == 0xdad1)
        realWriteMemory(address, 0x5);
    if (address == 0xdad2)
        realWriteMemory(address, 0x39);
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
    if ((address >= PARTY_START && address <= PARTY_LIST_END) ||
         (address == CURRENT_BOX_NUMBER)||
         (current_sram_bank == 1 && address >= CURRENT_BOX_START && address <= CURRENT_BOX_END)||
         (current_sram_bank >= BOXES_SRAM_MIN && current_sram_bank <= BOXES_SRAM_MAX && address >= BOXES_START && address <= BOXES_END))
    {
        ticks_since_last_write = 0;
    }
}

void pokedex_hook(u16 address, u8 value)
{
    static bool last_write_was_pokedex = false;
    if (gen == 1 && address == POKEDEX_START  && value == 0x4b && gbReadMemory(0xd60d) == 0) // first gen reuses first byte before dex
    {
        last_write_was_pokedex = false;
        return;
    }
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
