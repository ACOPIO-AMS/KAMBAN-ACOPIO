const APP_VERSION="3.0";
const APP_BUILD="3.0-admin-seleccion-corregido";
const DB_KEY="kamban_acopio_db_v0001";
const DB_BACKUP_KEY="kamban_acopio_db_respaldo_v0001";
const LAST_SYNC_KEY="kamban_ultima_sync_v0001";
const ADMIN_PIN="1234";
const ENDPOINT_FIJO="https://script.google.com/macros/s/AKfycbx_UwdiDhTvcWVAdygIIGh4otJXp22aFHFQ2t5QLJUySxDZBs_lh9ER0la_aA0gX-o/exec";
const DEVICE_ID_KEY="kamban_dispositivo_id_v0001";
const DEVICE_NAME_KEY="kamban_dispositivo_nombre_v0001";
const FORCE_SYNC_TOKEN_KEY="kamban_sync_orden_token_v1";
const SYNC_ACK_KEY="kamban_transferencia_confirmada_v1";
const SYNC_STATUS_KEY="kamban_transferencia_estado_v1";
const UPDATE_TOKEN_KEY="kamban_actualizacion_orden_token_v1";
const UPDATE_ACK_KEY="kamban_actualizacion_confirmada_v1";
const UPDATE_STATUS_KEY="kamban_actualizacion_estado_v1";
const DELETE_QUEUE_KEY="kamban_borrados_pendientes_v0001";
const SYNC_BATCH_SIZE=4;
const SYNC_REQUEST_TIMEOUT_MS=30000;
const SYNC_RETRY_BASE_MS=15000;
const SYNC_RETRY_MAX_MS=120000;
const SYNC_PERIODIC_MS=300000;
const DEVICE_HEARTBEAT_MS=180000;
const SIGNAL_POLL_MS=60000;
const RETENCION_LOCAL_DIAS=20;
const RETENCION_INVENTARIO_DIAS=2;
const BORRADO_LOTE_MAX=50;
const QR_INVENTARIO_MAX=2048;
const STATIONS=["BALANZA","DESCARGUIO","CHANCADO","MUESTREO","SECADO","PULVERIZADO","CUARTEOSELLADO","ATENCION AL CLIENTE","INVENTARIO"];
const EVENTS_BY_STATION={
 BALANZA:["INICIO"], DESCARGUIO:["INICIO","FINAL"], CHANCADO:["INICIO","FINAL"],
 "ATENCION AL CLIENTE":["FINAL"], DEFAULT:["RECEPCION","INICIO","FINAL"]
};
