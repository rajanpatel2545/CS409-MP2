// src/App.tsx
import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route, Link, NavLink, useNavigate, useParams } from "react-router-dom";
import { listPokemon, getPokemon } from "./api";
import type { Pokemon } from "./types";
import "./App.css";
// -------------------------------------------------------

function ListView() {
  const [items, setItems] = useState<Pokemon[]>([]);
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<"name" | "base_experience" | "height">("name");
  const [dir, setDir] = useState<"asc" | "desc">("asc");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [allNames, setAllNames] = useState<string[] | null>(null);
  const [loadingNames, setLoadingNames] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        setLoading(true);
        const names = (await listPokemon(60, 0)).results.map(r => r.name);
        const out: Pokemon[] = [];
        for (let i = 0; i < names.length; i += 6) {
          const chunk = await Promise.all(names.slice(i, i + 6).map(n => getPokemon(n)));
          out.push(...chunk);
        }
        setItems(out);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load Pokémon.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (q.length < 2 || allNames) return;
    (async () => {
      try {
        setLoadingNames(true);
        const big = await listPokemon(100000, 0);
        setAllNames(big.results.map(r => r.name));
      } finally {
        setLoadingNames(false);
      }
    })();
  }, [q, allNames]);

  const shown = useMemo(() => {
    const filtered = q
      ? items.filter(p => p.name.includes(q.toLowerCase()))
      : items;

    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === "name") {
        return dir === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      const A = sortKey === "base_experience" ? a.base_experience : a.height;
      const B = sortKey === "base_experience" ? b.base_experience : b.height;
      return dir === "asc" ? A - B : B - A;
    });
    return sorted;
  }, [items, q, sortKey, dir]);

  const undisplayedMatches = useMemo(() => {
    if (!q || !allNames) return [];
    const ql = q.toLowerCase();
    const have = new Set(items.map(p => p.name));
    return allNames.filter(n => n.includes(ql) && !have.has(n)).slice(0, 20); // cap to keep UI sane
  }, [q, allNames, items]);

  async function addMissing(name: string) {
    try {
      const p = await getPokemon(name);
      setItems(prev => {
        if (prev.some(x => x.name === p.name)) return prev;
        return [...prev, p];
      });
    } catch {
      setErr(`Could not load ${name}.`);
    }
  }

  return (
    <main className="container">
      <h1>Pokedex — List</h1>

      <div className="toolbar">
        <input
          aria-label="search"
          className="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Pokémon by name…"
        />
        <div className="sort-controls">
          <label>
            Sort by:&nbsp;
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as any)}>
              <option value="name">Name</option>
              <option value="base_experience">Base XP</option>
              <option value="height">Height</option>
            </select>
          </label>
          <button className="btn" onClick={() => setDir(d => (d === "asc" ? "desc" : "asc"))}>
            {dir === "asc" ? "Asc ↑" : "Desc ↓"}
          </button>
        </div>
      </div>

      {err && <p role="alert" className="callout error">{err}</p>}

      {loading && (
        <div className="grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="card skeleton">
              <div className="card-img"></div>
              <div className="card-body">
                <div className="skeleton-line w-60"></div>
                <div className="skeleton-line w-40"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && shown.length > 0 && (
        <div className="grid">
          {shown.map((p) => {
            const art = p.sprites.other?.["official-artwork"]?.front_default || p.sprites.front_default || "";
            return (
              <Link key={p.id} to={`/pokemon/${p.name}`} className="card hoverable">
                {art && <img src={art} alt={p.name} className="card-img" />}
                <div className="card-body">
                  <div className="card-title">#{p.id} {p.name}</div>
                  <div className="card-sub">XP {p.base_experience} · Ht {p.height} · Wt {p.weight}</div>
                  <div className="types">
                    {p.types.map(t => <span key={t.type.name} className={`type-chip type-${t.type.name}`}>{t.type.name}</span>)}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {!loading && q && allNames && undisplayedMatches.length > 0 && (
        <>
          <h2 className="section-sub">More matches</h2>
          <div className="chipbar">
            {loadingNames && <span className="muted">Loading names…</span>}
            {undisplayedMatches.map(n => (
              <button key={n} className="chip" onClick={() => addMissing(n)}>
                + {n}
              </button>
            ))}
          </div>
        </>
      )}

      {!loading && shown.length === 0 && undisplayedMatches.length === 0 && !err && (
        <div className="empty">
          <p>No results try another name.</p>
        </div>
      )}
    </main>
  );
}
// -------------------------------------------------------
function GalleryView() {
  const [items, setItems] = useState<Pokemon[]>([]);
  const [allTypes, setAllTypes] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        setLoading(true);
        const names = (await listPokemon(60, 0)).results.map(r => r.name);
        const out: Pokemon[] = [];
        for (let i = 0; i < names.length; i += 6) {
          const chunk = await Promise.all(names.slice(i, i + 6).map(n => getPokemon(n)));
          out.push(...chunk);
        }
        setItems(out);
        const tset = new Set<string>();
        out.forEach(p => p.types.forEach(t => tset.add(t.type.name)));
        setAllTypes(Array.from(tset).sort());
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load Pokémon.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggle = (t: string) => {
    const next = new Set(selected);
    next.has(t) ? next.delete(t) : next.add(t);
    setSelected(next);
  };

  const shown = useMemo(() => {
    if (selected.size === 0) return items;
    return items.filter(p => p.types.some(t => selected.has(t.type.name)));
  }, [items, selected]);

  return (
    <main className="container">
      <h1>Pokedex — Gallery</h1>

      <div className="chipbar sticky-bar">
        {allTypes.map(t => (
          <button
            key={t}
            className={`chip ${selected.has(t) ? "active" : ""}`}
            aria-pressed={selected.has(t)}
            onClick={() => toggle(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {err && <p role="alert" className="callout error">{err}</p>}

      {loading && (
        <div className="grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="card skeleton">
              <div className="card-img"></div>
              <div className="card-body">
                <div className="skeleton-line w-70"></div>
                <div className="skeleton-line w-30"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && shown.length === 0 && !err && (
        <div className="empty">
          <p>No Pokémon match those type filters.</p>
        </div>
      )}

      {!loading && shown.length > 0 && (
        <div className="grid">
          {shown.map((p) => {
            const art = p.sprites.other?.["official-artwork"]?.front_default || p.sprites.front_default || "";
            return (
              <Link key={p.id} to={`/pokemon/${p.name}`} className="card hoverable">
                {art && <img src={art} alt={p.name} className="card-img" />}
                <div className="card-body">
                  <div className="card-title">{p.name}</div>
                  <div className="types">
                    {p.types.map(t => <span key={t.type.name} className={`type-chip type-${t.type.name}`}>{t.type.name}</span>)}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}

// -------------------------------------------------------

function DetailView() {
  const { name = "" } = useParams<{ name: string }>();
  const nav = useNavigate();
  const [p, setP] = useState<Pokemon | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [idx, setIdx] = useState(-1);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        setP(await getPokemon(name));
      } catch {
        setErr("Not found.");
      }
    })();
  }, [name]);

  useEffect(() => {
    (async () => {
      const names = (await listPokemon(60, 0)).results.map(r => r.name);
      setOrder(names);
      setIdx(names.indexOf(name));
    })();
  }, [name]);

  const prev = () => {
    if (!order.length) return;
    const i = idx <= 0 ? order.length - 1 : idx - 1;
    nav(`/pokemon/${order[i]}`);
  };
  const next = () => {
    if (!order.length) return;
    const i = idx >= order.length - 1 ? 0 : idx + 1;
    nav(`/pokemon/${order[i]}`);
  };

  if (err) return <main className="container"><p role="alert" className="error">{err}</p></main>;
  if (!p) return <main className="container"><p>Loading…</p></main>;

  const art = p.sprites.other?.["official-artwork"]?.front_default || p.sprites.front_default || "";

  return (
    <main className="container">
      <div className="detail-header">
        <button className="btn" onClick={prev}>← Prev</button>
        <h1>#{p.id} {p.name}</h1>
        <button className="btn" onClick={next}>Next →</button>
      </div>

      {art && <img src={art} alt={p.name} className="detail-art" />}

      <section className="detail-grid">
        <div className="panel">
          <h2>Basics</h2>
          <p>Base XP: {p.base_experience}</p>
          <p>Height: {p.height} dm</p>
          <p>Weight: {p.weight} hg</p>
          <p>Types: {p.types.map(t => t.type.name).join(", ")}</p>
        </div>
        <div className="panel">
          <h2>Abilities</h2>
          <ul>{p.abilities.map(a => <li key={a.ability.name}>{a.ability.name}{a.is_hidden ? " (hidden)" : ""}</li>)}</ul>
        </div>
        <div className="panel">
          <h2>Stats</h2>
          <ul>{p.stats.map(s => <li key={s.stat.name}>{s.stat.name}: {s.base_stat}</li>)}</ul>
        </div>
      </section>
    </main>
  );
}

// -------------------------------------------------------
function App() {

  return (
      <BrowserRouter basename={process.env.PUBLIC_URL}>
        <header className="topbar">
        <Link to="/" className="brand">Pokedex</Link>
        <nav className="nav">
          <NavLink to="/" end className={({ isActive }: { isActive: boolean }) => (isActive ? "nav-link active" : "nav-link")}>
            List
          </NavLink>
          <NavLink to="/gallery" className={({ isActive }: { isActive: boolean }) => (isActive ? "nav-link active" : "nav-link")}>
            Gallery
          </NavLink>
        </nav>
      </header>
      <div className ="App">
        Loaded in first 60 Pokemon for entry view, and more are available using search directly
      </div>
      <Routes>
        <Route path="/" element={<ListView />} />
        <Route path="/gallery" element={<GalleryView />} />
        <Route path="/pokemon/:name" element={<DetailView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
