#include <stdio.h>

static const char * MESSAGE_FORMAT = "POKEMSG %s\n";

void message_js(char * msg)
{
    printf(MESSAGE_FORMAT, msg);
}
