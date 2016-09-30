#include <stdio.h>
#include <sys/poll.h>

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
        // fprintf(stderr, "no messages\n");
        return;
    }
    char msg[1024];
    scanf("%s", msg);
    fprintf(stderr, "%s\n",  msg);
}
