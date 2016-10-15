#! /usr/bin/env python2

from construct import this, Struct, Array, Byte,\
    Int16ub, Padding, String, Aligned, Terminated, Adapter
import pokemon_encoding
import pokemon_names

import itertools
import sys

class PokemonStringAdapter (Adapter):
    def _decode (self, obj, ctx):
        terminated = itertools.takewhile (lambda c: c not in (0x50,0xff), obj)
        return pokemon_encoding.decode (terminated)

PokemonString = PokemonStringAdapter (Byte[11])

def PokemonList (capacity, pokemon_size, padding):
    return Struct (
        'count' / Byte,
        'species' / Byte[capacity], Padding (1, b'\xff'),
        'pokemon' / Byte[pokemon_size][capacity],
        'ot' / PokemonString[capacity],
        'names' / PokemonString[capacity],
        Padding (padding)
    )

PokemonDump = PokemonList (6, 48, 0) >> PokemonList(20, 32, 2)[14]

def parse_box(poke_list):
    box = []
    list_count = poke_list.count
    if list_count in  (0, 0xff):
        return box
    for i in range(poke_list.count):
        d = {}
        pokemon = poke_list.pokemon[i][:32]
        d["binary"] = ("".join(chr(i) for i in pokemon)).encode("hex")
        d["index"] = pokemon[0]
        d["level"] = pokemon[31]
        d["name"] = poke_list.names[i]
        d["species"] = pokemon_names.names[d["index"]]
        box.append(d)
    return box


def parse_data(data):
    dump = PokemonDump.parse(data)
    boxes = {}
    boxes["party"] = parse_box(dump[0])
    l = []
    for poke_list in dump[1]:
        l.append(parse_box(poke_list))
    boxes["pc"] = l
    print boxes
    return boxes
        



def main (argv):
    with open (argv[1], 'rb') as f:
        boxes = f.read ()
    print PokemonDump.parse (boxes)

if __name__ == '__main__':
    main (sys.argv)
