#! /usr/bin/env python2

from construct import this, Struct, Array, Byte,\
    Int16ub, Padding, String, Aligned, Terminated, Adapter
import pokemon_encoding

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

def main (argv):
    with open (argv[1], 'rb') as f:
        boxes = f.read ()
    print PokemonDump.parse (boxes)

if __name__ == '__main__':
    main (sys.argv)
