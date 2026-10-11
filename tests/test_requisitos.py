from pathlib import Path
p=Path(__file__).resolve().parents[1]
s=(p/'aplicar_parche.py').read_text()
b=(p/'INGRESO_DE_DATOS_KANBAN_0002_9_12.gs').read_text()
assert 'registroStockAutomatico' in s and 'registrosActuales.unshift(registroStockAutomatico,registro)' in s
assert 'Array.from({length:11}' in s
assert 'RETENCION_INVENTARIO_DIAS=2' in s
assert 'return String(b.ultimo).localeCompare(String(a.ultimo));' in s
assert 'const SYNC_BATCH_SIZE=4' in s
assert 'guardarDatos(datos().filter(r=>!quitar.has(r.id)))' in s
assert 'kaNormalizarUbicacionInventario_' in b
assert 'var KA_REVISION="0002.9.12"' in b
print('OK: 8 verificaciones estáticas de requisitos')
