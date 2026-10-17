# Formato de `mapas.json` (Auditoría)

Archivo único, texto UTF-8. Lo escribe la app web; las herramientas de buscaminas solo lo **leen**.
Lector listo para Python: `mapas_json.py` (devuelve el mismo `g[(fila, col)] = (tipo, valor)` que `grid.py`).

## Estructura

```json
{
  "version": 1,
  "actual": "2",
  "mapas": {
    "2": {
      "nombre": "Mapa 2",
      "cols": 6,
      "filas": 3,
      "minas": 7,
      "creado": "2026-10-17T14:00:00-05:00",
      "editado": "2026-10-17T14:30:00-05:00",
      "tablero": [
        "0 1 k2 w x .",
        "q e r Xg X .",
        "8 . . . . Xv"
      ]
    }
  }
}
```

| Campo | Tipo | Significado |
|---|---|---|
| `version` | entero | Versión del formato (ahora `1`). Si no es 1, el lector debe negarse. |
| `actual` | texto | Llave del mapa abierto en la app. |
| `mapas` | objeto | Llave = número entero **como texto** (`"1"`, `"2"`, …), ordenadas numéricamente. |
| `nombre` | texto | Nombre visible. |
| `cols`, `filas` | entero > 0 | Dimensiones. **Ojo: `filas`, no `rows`.** |
| `minas` | entero > 0 | Total de minas del mapa (objetivo: reventar todas). |
| `creado`, `editado` | ISO 8601 con zona | Fechas. |
| `tablero` | lista de textos | Exactamente `filas` textos; cada uno con exactamente `cols` códigos separados por **un espacio**. |

Fila 1 = primera cadena, columna 1 = primer código (índices desde 1, como en la hoja). 

**No se guardan** (se calculan leyendo el tablero): marcadas (cantidad de `x`), reveladas (cantidad de `X…`), total = x + X frente a `minas`, conteo de recompensas (por sufijo de `X`), estado (vacío / en curso / terminado).

## Códigos de casilla

| Código | Significado | Hoja "Mine" | `grid.py` |
|---|---|---|---|
| `.` | Casilla vacía (sin tocar) | celda vacía | `E` |
| `0` | Cero revelado | `-` negro | `K` |
| `1`–`8` | Número revelado | número | `N`, val = n |
| `k1`–`k8` | Número **conocido** en casilla sin revelar (seguro, valor deducido) | *(nuevo)* | `H` + `known[(f,c)] = n` |
| `x` | Mina identificada (marcada, aún sin reventar) | `x` | `M`, val `'x'` |
| `X` | Mina revelada (reventada) | `X` | `M`, val `'X'` |
| `Xp` `Xm` `Xg` `Xc` `Xv` | Mina revelada + recompensa: **p**linko, **m**ines, **g**achas, **c**artas, **v**ariado | `X` | `M` `'X'` + `rewards[(f,c)]` |
| `r` | Posible mina | `O` | `O` |
| `q` | Posible nº / cero deducido | `-` blanco | `W` |
| `w` | Nº seguro (valor desconocido) | `#` | `H` |
| `e` | Sin certeza | `-` rojo | `R` |

Notas:
- La recompensa es solo el conteo por sufijo: la posición no importa, pero vive en la misma casilla que su `X`, así nunca se desincroniza de las minas.
- Un código desconocido debe **ignorarse con aviso**, o fallar claro si prefieres estrictez (`mapas_json.py` lanza `ValueError`).
- `k1–k8` es el único código sin equivalente en `grid.py`: si no te sirve, trátalo como `H`.

## Reglas de lectura
1. `json.load`, comprobar `version == 1`.
2. Elegir mapa: `mapas[actual]` o una llave dada.
3. `len(tablero) == filas`; cada fila `.split()` da `cols` códigos.
4. `R = filas`, `C = cols` (equivalen a las variables de entorno `GR` / `GC` de `grid.py`).

## Uso rápido

```python
from mapas_json import load_map
m = load_map('data/mapas.json')          # mapa "actual"
m = load_map('data/mapas.json', '24')    # uno concreto
g, R, C = m['g'], m['rows'], m['cols']
m['known'], m['rewards'], m['reward_counts'], m['total'], m['mines']
```
