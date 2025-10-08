// src/types.ts
export type Pokemon = {
    id: number;
    name: string;
    base_experience: number;
    height: number;
    weight: number;
    sprites: {
      front_default?: string | null;
      other?: { ['official-artwork']?: { front_default?: string | null } };
    };
    types: { type: { name: string } }[];
    abilities: { ability: { name: string }; is_hidden: boolean }[];
    stats: { base_stat: number; stat: { name: string } }[];
  };
  
  export type Named = { name: string; url: string };
  export type PokemonListResponse = {
    count: number;
    next: string | null;
    previous: string | null;
    results: Named[];
  };
  