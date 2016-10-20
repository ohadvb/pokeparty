#! /usr/bin/env python2

from construct import this, Struct, Array, Byte,\
    Int16ub, Padding, String, Aligned, Terminated, Adapter
import pokemon_encoding
import pokemon_index
import pokemon_names
import pdb

import copy
import itertools
import sys

class PokemonStringAdapter (Adapter):
    def _decode (self, obj, ctx):
        terminated = itertools.takewhile (lambda c: c not in (0x50,0xff), obj)
        return pokemon_encoding.decode (terminated)
    
    def _encode (self, obj, ctx):
        encoded = pokemon_encoding.encode(obj)
        pad_to_len(encoded, 0x50, 11)
        return encoded

PokemonString = PokemonStringAdapter (Byte[11])

Gen1BoxPokemon = Struct (
        'index' / Byte,
        'HP' / Int16ub,
        'level' / Byte,
        'status' / Byte,
        'types' / Byte[2],
        'held item' / Byte,
        'moves' / Byte[4],
        'ot id' / Int16ub,
        'Exp' / Byte[3],
        'EV stats' / Int16ub[5],
        'iv' / Int16ub,
        'PPs' / Byte[4],
        'ulevel' / Byte )

Gen1PartyPokemon = Struct (
        'index' / Byte,
        'HP' / Int16ub,
        'ulevel' / Byte,
        'status' / Byte,
        'types' / Byte[2],
        'held item' / Byte,
        'moves' / Byte[4],
        'ot id' / Int16ub,
        'Exp' / Byte[3],
        'EV stats' / Int16ub[5],
        'iv' / Int16ub,
        'PPs' / Byte[4],
        'level' / Byte )


Pokemon = Struct (
        'index' / Byte,
        'held item' / Byte,
        'moves' / Byte[4],
        'ot id' / Int16ub,
        'Exp' / Byte[3],
        'EV stats' / Int16ub[5],
        'iv' / Int16ub,
        'PPs' / Byte[4],
        'Friendship' / Byte,
        'Pokerus' / Byte,
        'Caught Data' / Int16ub,
        'level' / Byte )


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
Gen1PokemonDump = PokemonList (6, 44, 0) >> PokemonList(20, 33, 0)[12]


def parse_box(poke_list, PokemonStruct, gen):
    box = []
    list_count = poke_list.count
    if list_count in  (0, 0xff):
        return box
    for i in range(poke_list.count):
        d = {}
        pokemon = "".join(chr(c) for c in poke_list.pokemon[i][:34])
        d["binary"] = pokemon.encode("hex")
        parsed_mon = PokemonStruct.parse(pokemon)
        print poke_list.species
        d["index"] = poke_list.species[i]
        if gen == 1:
            d["index"] = pokemon_index.gen1_to_gen2[d["index"]]
        d["level"] = parsed_mon["level"]
        d["name"] = poke_list.names[i]
        d["ot"] = poke_list.ot[i]
        d["species"] = pokemon_names.names[d["index"]]
        box.append(d)
    return box

def pad_to_len(l, padding, size):
    l += [padding] * (size - len(l))

def build_boxes(boxes, party):
    if len(boxes) == 14:
        out = PokemonList(20, 32, 2)[14]
    else:
        out = PokemonList(20,33,0)[12]
    ot = party[0]["ot"]
    l = []
    for box in boxes:
        d = {}
        d["count"] = len(box)
        d["species"] = [p["index"] for p in box]
        pad_to_len(d["species"], 0xff, 20)
        d["pokemon"] = [[ord(c) for c in list(p["binary"].decode("hex"))] for p in box]
        pad_to_len(d["pokemon"], [0] * 32, 20)
        d["ot"] = [ot] * len(box)
        pad_to_len(d["ot"], "\x00" * 11 , 20)
        d["names"] = [p["name"] for p in box]
        pad_to_len(d["names"], "\x00" * 11, 20)
        l.append(d)
        s = PokemonList(20, 32, 2)
    return out.build(l)
    

def parse_data_impl(data, dump_struct, party_mon_struct, mon_struct, gen):
    dump = dump_struct.parse(data)
    boxes = {}
    boxes["party"] = parse_box(dump[0], party_mon_struct, gen)
    l = []
    for poke_list in dump[1]:
        l.append(parse_box(poke_list, mon_struct, gen))
    boxes["pc"] = l
    return boxes
        
def parse_data(data):
    return parse_data_impl(data, PokemonDump, Pokemon, Pokemon, 2)

def gen1_box_to_gen2(box, mon_struct):
    for mon in box:
        b = mon["binary"].decode("hex")
        parsed = mon_struct.parse(b)
        parsed["index"] = pokemon_index.gen1_to_gen2[parsed["index"]]
        parsed["Friendship"] = 0xff
        parsed["Pokerus"] = 0
        parsed["Caught Data"] = 0
        mon["binary"] = "".join(Pokemon.build(parsed)).encode("hex")

def gen1_to_gen2(boxes):
    gen1_box_to_gen2(boxes["party"], Gen1PartyPokemon)
    for box in boxes["pc"]:
        gen1_box_to_gen2(box, Gen1BoxPokemon)

def parse_gen1_data(data):
    boxes =  parse_data_impl(data, Gen1PokemonDump, Gen1PartyPokemon, Gen1BoxPokemon, 1)
    gen2_boxes = copy.deepcopy(boxes)
    gen1_to_gen2(gen2_boxes)
    return boxes, gen2_boxes

def main (argv):
    with open (argv[1], 'rb') as f:
        boxes = f.read ()
    print PokemonDump.parse (boxes)

if __name__ == '__main__':
    main (sys.argv)
