const APP_VERSION="0002.9.10";
const APP_BUILD="0002.9.10-inventario-manual";
const DB_KEY="kamban_acopio_db_v0001";
const DB_BACKUP_KEY="kamban_acopio_db_respaldo_v0001";
const LAST_SYNC_KEY="kamban_ultima_sync_v0001";
const LAST_TURN_CLEAR_KEY="kamban_turno_v0001";
const ADMIN_PIN="1234";
const ENDPOINT_FIJO="https://script.google.com/macros/s/AKfycbx_UwdiDhTvcWVAdygIIGh4otJXp22aFHFQ2t5QLJUySxDZBs_lh9ER0la_aA0gX-o/exec";
const BACKEND_VERSION_ESPERADA="0002.9.0";
const DEVICE_ID_KEY="kamban_dispositivo_id_v0001";
const DEVICE_NAME_KEY="kamban_dispositivo_nombre_v0001";
const DEVICE_HEARTBEAT_MS=180000;
const SIGNAL_POLL_MS=60000;
const FORCE_SYNC_TOKEN_KEY="kamban_sync_orden_token_v1";
const FORCE_SYNC_PENDING_KEY="kamban_sync_orden_pendiente_v1";
const REMOTE_REQUEST_PENDING_KEY="kamban_solicitud_remota_pendiente_v1";
const UPDATE_TOKEN_KEY="kamban_actualizacion_orden_token_v1";
const UPDATE_PENDING_KEY="kamban_actualizacion_pendiente_v1";
const UPDATE_REQUEST_PENDING_KEY="kamban_solicitud_actualizacion_pendiente_v1";
const UPDATE_ACK_KEY="kamban_actualizacion_confirmada_v1";
const UPDATE_STATUS_KEY="kamban_actualizacion_estado_v1";
const SYNC_ACK_KEY="kamban_transferencia_confirmada_v1";
const SYNC_STATUS_KEY="kamban_transferencia_estado_v1";

const STATIONS=[
  "BALANZA","DESCARGUIO","CHANCADO","MUESTREO",
  "SECADO","PULVERIZADO","CUARTEOSELLADO","ATENCION AL CLIENTE"
];

const EVENTS_BY_STATION={
  "BALANZA":["INICIO"],
  "DESCARGUIO":["INICIO","FINAL"],
  "CHANCADO":["INICIO","FINAL"],
  "ATENCION AL CLIENTE":["FINAL"],
  "DEFAULT":["RECEPCION","INICIO","FINAL"]
};

const UMBRALES_MINUTOS={
  "BALANZA":30,"DESCARGUIO":60,"CHANCADO":45,"MUESTREO":45,
  "SECADO":180,"PULVERIZADO":90,"CUARTEOSELLADO":45,
  "ATENCION AL CLIENTE":60
};



const SYNC_REQUEST_TIMEOUT_MS=45000;
const SYNC_RETRY_BASE_MS=16000;
const SYNC_RETRY_MAX_MS=90000;
const SYNC_BATCH_SIZE=8;
// Con señal baja no se generan reintentos continuos: cada registro se envía al instante
// y la cola pendiente se revisa cada minuto o apenas regresa la conexión.
const SYNC_PERIODIC_MS=60000;

const RETENCION_LOCAL_DIAS=20;
const BORRADO_LOTE_MAX=50;
const DELETE_QUEUE_KEY="kamban_borrados_pendientes_v0001";
const DELETE_SYNC_BATCH=10;
