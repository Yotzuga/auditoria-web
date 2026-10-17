# Auditoría (versión web)

App web para llevar el tablero del buscaminas inverso (reemplaza la hoja de Google "Mine").
Implementa las pantallas web de `Mineswepper.pen`: tablero, panel de casilla, recompensas,
**Nuevo mapa** y **Mis mapas**.

React 19 · Vite · Tailwind CSS 4 · lucide-react · Inter + JetBrains Mono.

## Usar

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera dist/
```

## Datos: `mapas.json`

La primera vez, pulsa **Vincular mapas.json** (arriba) y elige **Crear** o **Abrir**. Desde entonces la app
guarda en ese archivo **solo cuando tú lo pides**: botón **Guardar** o `Ctrl S` (no hay autoguardado;
Chrome o Edge; si el navegador pide permiso otra vez, la
pastilla dice **Reconectar**). Recomendado: `data/mapas.json` dentro del proyecto.
`localStorage` queda como respaldo. Si el archivo no se puede leer, la app no lo toca.

```json
{
  "version": 1,
  "actual": "2",
  "mapas": {
    "2": {
      "nombre": "Mapa 2", "cols": 6, "filas": 3, "minas": 7,
      "creado": "2026-10-17T14:00:00-05:00", "editado": "2026-10-17T14:32:00-05:00",
      "tablero": [
        "0 1 k2 w x .",
        "q 0 1 Xg x e",
        "r . . . . ."
      ]
    }
  }
}
```

Códigos de casilla (separados por espacio, una cadena por fila):

| Código | Significado |
|---|---|
| `.` | sin definir |
| `0` | cero revelado |
| `1`–`8` | número revelado |
| `k1`–`k8` | número conocido (sin revelar) |
| `x` | mina identificada |
| `X` | mina revelada; con sufijo = recompensa: `Xp` Plinko, `Xm` Mines, `Xg` Gachas, `Xc` Cartas, `Xv` Variado |
| `r` | posible mina |
| `q` | posible nº (`-` blanco) |
| `w` | nº seguro (`#`) |
| `e` | sin certeza (`-` rojo) |

Marcadas, reveladas, total, recompensas y estado del mapa **no se guardan**: se calculan al abrir.
`npm test` comprueba que codificar y decodificar no pierde nada.

## Notación (igual que la hoja)

| Tecla | Casilla |
|---|---|
| `X` | `x` mina identificada (sin revelar) |
| `⇧X` | `X` mina revelada → pide recompensa (teclas `1`–`5`) |
| `O` o `R` | posible mina |
| `Q` | posible nº (`-` blanco) |
| `W` | nº seguro, valor desconocido (`#`) |
| `E` | sin certeza (`-` rojo) |
| `0` | cero revelado (`-` negro) |
| `1`–`8` (fila superior) | número revelado |
| `Num 1`–`Num 8` (teclado numérico) | número conocido (aún sin revelar) |
| `⇧1`–`⇧8` | número conocido, alternativa si no tienes teclado numérico |
| `⌫` | borrar |
| flechas | mover entre casillas |
| `Ctrl S` | guardar ahora |

Total = marcadas (`x`) + reveladas (`X`), contra el total de minas del mapa.

## Tokens del diseño

Los colores y fuentes de las variables del `.pen` están en `src/index.css` (`@theme`).
Equivalencias: `$text-primary → ink`, `$text-secondary → ink-2`, `$text-muted → ink-3`,
`$border → line`.

## Estructura

- `src/lib/cells.js` – tipos de casilla, estadísticas y estado del mapa
- `src/lib/store.js` – mapas + autoguardado en localStorage
- `src/components/` – TopBar, BoardPanel, Inspector, NewMapDialog, MapsDialog
- `src/App.jsx` – selección, atajos de teclado y diálogos

## Publicar gratis en GitHub Pages

1. Crea un repo **público** en GitHub (p. ej. `auditoria-web`) y sube esta carpeta (`git init`, `git add .`, `git commit`, `git remote add origin …`, `git push -u origin main`).
2. En el repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Cada `git push` a `main` corre `.github/workflows/deploy.yml` (tests + build) y publica en `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`.

`data/*.json` está en `.gitignore`: tus mapas no se suben. En la página publicada hay que vincular `mapas.json` una vez (la dirección web cambia respecto a `localhost`).

## Nube (Firebase, gratis)
Guarda tus mapas en tu cuenta de Google con el mismo Ctrl S. Pasos y comportamiento en [`docs/NUBE_FIREBASE.md`](docs/NUBE_FIREBASE.md).
Sin las variables `VITE_FIREBASE_*` la app funciona igual que antes (archivo local / navegador) y ni descarga Firebase.

## Versión para teléfono (pantalla vertical)
Con menos de 768 px de ancho la app usa el diseño móvil de `Mineswepper.pen` ("Editando casilla" y "Mina revelada (recompensa)"):
tablero en un visor con zoom (botón `150 %`, pellizco con dos dedos, "Ver mapa completo"), números de fila/columna en los bordes,
minimapa (toca para saltar) y una hoja inferior para editar la casilla con flechas ‹ › para pasar a la anterior/siguiente.
En pantallas más anchas sigue el diseño de escritorio.
