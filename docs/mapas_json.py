"""Lector de mapas.json (app Auditoría) para las herramientas de buscaminas.

Devuelve el tablero en el MISMO formato que grid.py: g[(fila, col)] = (tipo, valor), con
fila y columna desde 1. Tipos de grid.py: E vacío, N número, M mina ('x' o 'X'), H '#',
O posible mina, R '-' rojo, K '-' negro (cero revelado), W '-' blanco (cero deducido).

Lo que grid.py no tiene (y mapas.json sí) se devuelve aparte:
  known[(f, c)]   = n   número ya deducido en una casilla sin revelar (código k1-k8)
  rewards[(f, c)] = 'plinko' | 'mines' | 'gachas' | 'cartas' | 'variado'   (minas X con recompensa)

Uso:
    from mapas_json import load_map
    m = load_map('data/mapas.json')            # el mapa "actual" (el abierto en la app)
    m = load_map('data/mapas.json', '24')      # un mapa concreto por su llave
    g, R, C = m['g'], m['rows'], m['cols']
Línea de comandos:  python mapas_json.py data/mapas.json [llave]
"""
import json
import re
import sys

REWARD = {'p': 'plinko', 'm': 'mines', 'g': 'gachas', 'c': 'cartas', 'v': 'variado'}


def decode(tok):
    """Código de casilla -> ((tipo, valor), known, reward). Lanza ValueError si no es válido."""
    if tok == '.':
        return ('E', None), None, None
    if tok == '0':
        return ('K', None), None, None            # cero revelado ('-' negro)
    if re.fullmatch(r'[1-8]', tok):
        return ('N', int(tok)), None, None
    if re.fullmatch(r'k[1-8]', tok):
        return ('H', None), int(tok[1]), None     # sin revelar, seguro, valor conocido
    if tok == 'x':
        return ('M', 'x'), None, None
    if tok == 'X':
        return ('M', 'X'), None, None
    if re.fullmatch(r'X[pmgcv]', tok):
        return ('M', 'X'), None, REWARD[tok[1]]
    if tok == 'r':
        return ('O', None), None, None
    if tok == 'q':
        return ('W', None), None, None            # posible nº / cero deducido ('-' blanco)
    if tok == 'w':
        return ('H', None), None, None            # '#': seguro, valor desconocido
    if tok == 'e':
        return ('R', None), None, None            # '-' rojo: seguro, sin certeza
    raise ValueError(f'código de casilla no válido: {tok!r}')


def load_all(path):
    with open(path, encoding='utf-8') as f:
        raw = json.load(f)
    if raw.get('version', 1) != 1:
        raise ValueError(f"versión {raw.get('version')} no soportada (este lector entiende la 1)")
    return raw


def load_map(path, map_id=None):
    raw = load_all(path)
    mapas = raw['mapas']
    map_id = str(map_id if map_id is not None else raw.get('actual', next(iter(mapas))))
    m = mapas[map_id]
    rows, cols = m['filas'], m['cols']
    tablero = m['tablero']
    if len(tablero) != rows:
        raise ValueError(f'mapa {map_id}: {len(tablero)} filas en tablero, se esperaban {rows}')
    g, known, rewards = {}, {}, {}
    for r, line in enumerate(tablero, start=1):
        toks = line.split()
        if len(toks) != cols:
            raise ValueError(f'mapa {map_id}, fila {r}: {len(toks)} casillas, se esperaban {cols}')
        for c, tok in enumerate(toks, start=1):
            cell, k, rw = decode(tok)
            g[(r, c)] = cell
            if k:
                known[(r, c)] = k
            if rw:
                rewards[(r, c)] = rw
    marked = sum(1 for v in g.values() if v == ('M', 'x'))
    revealed = sum(1 for v in g.values() if v == ('M', 'X'))
    counts = {k: 0 for k in REWARD.values()}
    for rw in rewards.values():
        counts[rw] += 1
    return {
        'id': map_id, 'name': m['nombre'], 'rows': rows, 'cols': cols, 'mines': m['minas'],
        'created': m.get('creado'), 'edited': m.get('editado'),
        'g': g, 'known': known, 'rewards': rewards,
        'marked': marked, 'revealed': revealed, 'total': marked + revealed,
        'reward_counts': counts,
    }


SHEET = {'E': '', 'K': '-', 'W': '-', 'R': '-', 'H': '#', 'O': 'O'}


def show(m):
    """Imprime el tablero con la notación de la hoja (el color del '-' se marca: -k negro, -w blanco, -r rojo)."""
    print(f"{m['name']} (id {m['id']}) {m['cols']}x{m['rows']}  minas {m['total']}/{m['mines']}  "
          f"x={m['marked']} X={m['revealed']}")
    for r in range(1, m['rows'] + 1):
        out = []
        for c in range(1, m['cols'] + 1):
            t, v = m['g'][(r, c)]
            if t == 'N':
                s = str(v)
            elif t == 'M':
                s = v
            elif t in 'KWR':
                s = '-' + t.lower()
            else:
                s = SHEET[t] or '.'
            if (r, c) in m['known']:
                s = '#' + str(m['known'][(r, c)])
            out.append(s.rjust(3))
        print(''.join(out))
    print('recompensas:', m['reward_counts'])


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    show(load_map(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None))
