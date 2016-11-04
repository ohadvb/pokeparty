#! /usr/bin/env python2

from construct import this, Struct, Array, Byte, Bytes, \
    Int16ub, Padding, String, Aligned, Terminated, Adapter, Padded, Default
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

class Gen1PokemonIndexAdapter (Adapter):
    def _decode(self,obj,ctx):
        if obj not in pokemon_index.gen1_to_gen2.keys():
            return 0xff
        return pokemon_index.gen1_to_gen2[obj]

    def _encode(self,obj,ctx):
        if obj == 0xff:
            return 0xff
        return pokemon_index.gen2_to_gen1[obj]

Gen1PokemonIndex = Gen1PokemonIndexAdapter(Byte)

Gen1BoxPokemon = Struct (
        'index' / Gen1PokemonIndex,
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
        'PPs' / Byte[4])

Gen1PartyPokemon = Struct (
        'index' / Gen1PokemonIndex,
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
        'level' / Byte,
        'unused' / Byte[10])

Gen2BoxPokemon = Struct (
        'index' / Byte,
        'held item' / Byte,
        'moves' / Byte[4],
        'ot id' / Int16ub,
        'Exp' / Byte[3],
        'EV stats' / Int16ub[5],
        'iv' / Int16ub,
        'PPs' / Byte[4],
        'Friendship' / Default(Byte, 0xff),
        'Pokerus' / Default(Byte, 0),
        'Caught Data' / Default(Int16ub, 0),
        'level' / Byte )

Gen2PartyPokemon = Struct (
        'index' / Byte,
        'held item' / Byte,
        'moves' / Byte[4],
        'ot id' / Int16ub,
        'Exp' / Byte[3],
        'EV stats' / Int16ub[5],
        'iv' / Int16ub,
        'PPs' / Byte[4],
        'Friendship' / Default(Byte, 0xff),
        'Pokerus' / Default(Byte, 0),
        'Caught Data' / Default(Int16ub, 0),
        'level' / Byte,
        'unused' / Byte[16])

TrainerData = Struct (
        'ot id' / Int16ub,
        'ot' / PokemonString )

def PokemonList (capacity, pokemon_struct, index_struct, padding):
    return Struct (
        'count' / Byte,
        'species' / index_struct[capacity], Padding (1, b'\xff'),
        'pokemon' /  pokemon_struct[capacity],
        'ot' / PokemonString[capacity],
        'names' / PokemonString[capacity],
        Padding (padding)
    )

Gen1Boxes = PokemonList(20, Gen1BoxPokemon, Gen1PokemonIndex, 0)[12]
Gen2Boxes = PokemonList(20, Gen2BoxPokemon, Byte, 2)[14]

Gen1PokemonDump = PokemonList (6, Gen1PartyPokemon, Gen1PokemonIndex, 0) >> Gen1Boxes
PokemonDump = PokemonList (6, Gen2PartyPokemon, Byte, 0) >> Gen2Boxes


def parse_box(poke_list, PokemonStruct, gen):
    box = []
    list_count = poke_list.count
    if list_count in  (0, 0xff):
        return box
    for i in range(poke_list.count):
        d = {}
        d["index"] = poke_list.species[i]
        d["level"] = poke_list.pokemon[i]["level"]
        d["pokemon"] = poke_list.pokemon[i]
        d["name"] = poke_list.names[i]
        d["ot"] = poke_list.ot[i]
        d["species"] = pokemon_names.names[d["index"]]
        box.append(d)
    return box

def pad_to_len(l, padding, size):
    l += [padding] * (size - len(l))

def build_boxes(boxes, trainer):
    if len(boxes) == 14:
        out = Gen2Boxes
        pokemon_struct = Gen2BoxPokemon
        gen = 2
    else:
        out = Gen1Boxes
        pokemon_struct = Gen1BoxPokemon
        gen = 1
    ot = trainer["ot"]
    ot_id = trainer["ot id"]
    l = []
    for box in boxes:
        d = {}
        d["count"] = len(box)
        d["species"] = [p["index"] for p in box]
        pad_to_len(d["species"], 0xff, 20)
        d["pokemon"] = [p["pokemon"] for p in box]
        for p in d["pokemon"]:
            p["ot id"] = ot_id
        pad_to_len(d["pokemon"], pokemon_struct.parse("\x00" * pokemon_struct.sizeof()), 20)
        d["ot"] = [ot] * len(box)
        pad_to_len(d["ot"], "\x00" * 11 , 20)
        d["names"] = [p["name"] for p in box]
        pad_to_len(d["names"], "\x00" * 11, 20)
        l.append(d)
    return out.build(l)
    

def parse_data_impl(data, gen):
    if gen == 2:
        dump_struct,  mon_struct, party_mon_struct = PokemonDump, Gen2BoxPokemon, Gen2PartyPokemon
    else:
        dump_struct, mon_struct, party_mon_struct = Gen1PokemonDump, Gen1BoxPokemon, Gen1PartyPokemon
    boxes = {}
    boxes["trainer"] = TrainerData.parse(data)
    dump = dump_struct.parse(data[TrainerData.sizeof():])
    print boxes["trainer"]
    boxes["party"] = parse_box(dump[0], party_mon_struct, gen)
    l = []
    for poke_list in dump[1]:
        l.append(parse_box(poke_list, mon_struct, gen))
    boxes["pc"] = l
    return boxes
        
def parse_data(data):
    return parse_data_impl(data, 2)

def gen1_box_to_gen2(box):
    for mon in box:
        mon["Friendship"] = 0xff
        mon["Pokerus"] = 0
        mon["Caught Data"] = 0
        
def parse_gen1_data(data):
    boxes =  parse_data_impl(data, 1)
    return boxes

def main (argv):
    with open (argv[1], 'rb') as f:
        boxes = f.read ()
    print PokemonDump.parse (boxes)

if __name__ == '__main__':
    main (sys.argv)
