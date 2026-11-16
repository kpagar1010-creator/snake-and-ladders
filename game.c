#include <stdlib.h>

#define FINISH 100

static const int starts[] = {4, 9, 17, 20, 28, 40, 51, 54, 62, 63, 64, 71, 87, 93, 95, 99};
static const int ends[]   = {14, 31,  7, 38, 84, 59, 67, 34, 19, 81, 60, 91, 24, 73, 75, 78};
static const int jumps = sizeof(starts) / sizeof(starts[0]);

static int positions[2] = {0, 0};
static int current_player = 0;
static int winner = 0;
static int last_roll = 0;
static int event_type = 0; /* 0: none, 1: ladder, 2: snake, 3: exact-finish bounce */
static int event_from = 0;
static int event_to = 0;

void game_reset(void) {
    positions[0] = positions[1] = 0;
    current_player = winner = last_roll = 0;
    event_type = event_from = event_to = 0;
}

/* Returns the player who rolled (1 or 2); pass a dice value from 1 to 6. */
int game_move(int roll) {
    if (winner || roll < 1 || roll > 6) return 0;

    int player = current_player;
    int old_position = positions[player];
    int proposed = old_position + roll;
    last_roll = roll;
    event_type = event_from = event_to = 0;

    if (proposed > FINISH) {
        event_type = 3;
        event_from = old_position;
        event_to = old_position;
    } else {
        positions[player] = proposed;
        for (int i = 0; i < jumps; i++) {
            if (positions[player] == starts[i]) {
                event_from = starts[i];
                event_to = ends[i];
                positions[player] = ends[i];
                event_type = ends[i] > starts[i] ? 1 : 2;
                break;
            }
        }
        if (positions[player] == FINISH) winner = player + 1;
    }

    if (!winner) current_player = 1 - current_player;
    return player + 1;
}

int game_get_position(int player) { return (player >= 0 && player < 2) ? positions[player] : 0; }
int game_get_current_player(void) { return current_player + 1; }
int game_get_winner(void) { return winner; }
int game_get_last_roll(void) { return last_roll; }
int game_get_event_type(void) { return event_type; }
int game_get_event_from(void) { return event_from; }
int game_get_event_to(void) { return event_to; }
