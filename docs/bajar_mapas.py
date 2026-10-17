"""Baja tus mapas de la nube (Firestore) a un mapas.json local, para usarlos con mapas_json.py.

Una sola vez:
  pip install google-cloud-firestore
  Consola de Firebase → Configuración del proyecto → Cuentas de servicio → "Generar nueva clave privada".
  Guarda ese .json FUERA de la carpeta del proyecto (es una llave: no la subas a GitHub).

Uso:
  set GOOGLE_APPLICATION_CREDENTIALS=C:\\ruta\\a\\clave.json      (Windows; en Linux/Mac: export ...)
  python bajar_mapas.py                   -> escribe data/mapas.json
  python bajar_mapas.py otra/ruta.json
"""
import json
import os
import sys

from google.cloud import firestore


def client():
    if os.environ.get('FIRESTORE_EMULATOR_HOST'):  # pruebas locales con el emulador
        return firestore.Client(project=os.environ.get('GCLOUD_PROJECT', 'demo-auditoria'))
    cred = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
    if not cred:
        sys.exit('Falta la variable GOOGLE_APPLICATION_CREDENTIALS (ruta a la clave de cuenta de servicio).')
    return firestore.Client.from_service_account_json(cred)


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join('data', 'mapas.json')
    docs = [d.to_dict() for d in client().collection('mapas').stream()]
    if not docs:
        sys.exit('No hay mapas en la nube todavía (guarda con Ctrl S en la app).')
    data = max(docs, key=lambda d: d.get('_rev', 0))  # un solo usuario: normalmente hay un documento
    data.pop('_rev', None)
    data['mapas'] = {k: data['mapas'][k] for k in sorted(data['mapas'], key=int)}
    os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
    tmp = out + '.tmp'
    with open(tmp, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')
    os.replace(tmp, out)
    print(f"{out}: {len(data['mapas'])} mapa(s), actual = {data.get('actual')}")


if __name__ == '__main__':
    main()
