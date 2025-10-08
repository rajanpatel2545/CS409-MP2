// src/api.ts
import axios from "axios";
import type { Pokemon, PokemonListResponse } from "./types";

const API = axios.create({ baseURL: "https://pokeapi.co/api/v2" });

export async function listPokemon(limit = 100, offset = 0) {
  const { data } = await API.get<PokemonListResponse>("/pokemon", { params: { limit, offset } });
  return data; 
}

export async function getPokemon(nameOrId: string | number) {
  const { data } = await API.get<Pokemon>(`/pokemon/${nameOrId}`);
  return data; 
}
