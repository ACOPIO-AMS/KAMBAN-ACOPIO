/* KANBAN 0002.8.9 - SINCRONIZACIÓN BATCH SEGURA Y LIGERA */

let syncProcesando = false;
let syncTimerPeriodico = null;
let syncTimerReintento = null;
let syncBackendVerificadoEn = 0;

const syncEnCurso = new Set();

let borradoSyncProcesando = false;


/************************************************************
 * CONFIGURACIÓN BATCH
 *
 * Se envían hasta 8 registros por comunicación.
 *
 * No usamos 20 por ahora porque la APP utiliza JSONP/GET
 * y debemos mantener la URL en un tamaño prudente.
 ************************************************************/
const SYNC_BATCH_SIZE = 8;


/************************************************************
 * BORRADOS PENDIENTES
 ************************************************************/
function leerBorradosPendientes() {

  try {

    const d = JSON.parse(
      localStorage.getItem(
        DELETE_QUEUE_KEY
      ) || "[]"
    );

    return Array.isArray(d)
      ? d
      : [];

  } catch (e) {

    return [];

  }

}


function guardarBorradosPendientes(d) {

  localStorage.setItem(
    DELETE_QUEUE_KEY,
    JSON.stringify(d || [])
  );

}


async function procesarBorradosPendientes() {

  if (
    borradoSyncProcesando ||
    !navigator.onLine ||
    !endpoint()
  ) {
    return;
  }


  const lote =
    leerBorradosPendientes()
      .slice(
        0,
        DELETE_SYNC_BATCH
      );


  if (!lote.length) {
    return;
  }


  borradoSyncProcesando = true;


  try {

    const pendientes =
      leerBorradosPendientes();


    for (const x of lote) {

      try {

        const r =
          await jsonpSeguro(
            {
              action: "delete",
              id: x.id,
              estacion: x.estacion
            },
            5000
          );


        if (
          r &&
          r.ok === true
        ) {

          const i =
            pendientes.findIndex(
              y =>
                y.id === x.id
            );


          if (i >= 0) {

            pendientes.splice(
              i,
              1
            );


            guardarBorradosPendientes(
              pendientes
            );

          }

        }

      } catch (e) {

        break;

      }

    }

  } finally {

    borradoSyncProcesando = false;

  }

}


/************************************************************
 * RECURSO
 ************************************************************/
function recursoPayload(r) {

  const e =
    String(
      r.estacion || ""
    )
      .trim()
      .toUpperCase();


  let x =
    String(
      r.recurso || ""
    )
      .trim()
      .toUpperCase();


  if (
    !x &&
    e === "DESCARGUIO" &&
    r.tolva
  ) {

    x =
      "T" +
      String(
        r.tolva
      )
        .replace(
          /^T/i,
          ""
        );

  }


  if (
    !x &&
    e === "CHANCADO" &&
    r.circuito
  ) {

    x =
      "C" +
      String(
        r.circuito
      )
        .replace(
          /^C/i,
          ""
        );

  }


  if (
    !x &&
    e === "SECADO" &&
    r.horno
  ) {

    x =
      "H" +
      String(
        r.horno
      )
        .replace(
          /^H/i,
          ""
        );

  }


  if (
    !x &&
    e === "PULVERIZADO" &&
    r.molino
  ) {

    x =
      "M" +
      String(
        r.molino
      )
        .replace(
          /^M/i,
          ""
        );

  }


  if (
    !x &&
    e === "BALANZA" &&
    (
      r.tipo_mineral ||
      r.tipoMineral
    )
  ) {

    x =
      String(
        r.tipo_mineral ||
        r.tipoMineral
      )
        .trim()
        .toUpperCase();

  }


  if (
    !x &&
    e === "MUESTREO" &&
    r.ubicacion
  ) {

    x =
      String(
        r.ubicacion
      )
        .trim()
        .toUpperCase();

  }


  return x;

}


/************************************************************
 * CREAR PAYLOAD
 ************************************************************/
function crearPayload(r) {

  return {

    action: "save",

    frontend_version:
      APP_VERSION,

    codigo:
      String(
        r.codigo || ""
      ).trim(),

    evento:
      String(
        r.evento || ""
      )
        .trim()
        .toUpperCase(),

    fecha_hora:
      String(
        r.fecha_hora || ""
      ).trim(),

    operador:
      String(
        r.operador || ""
      ).trim(),

    estacion:
      String(
        r.estacion || ""
      )
        .trim()
        .toUpperCase(),

    recurso:
      recursoPayload(r),

    detalle:
      String(
        r.detalle ||
        r.motivo_stock ||
        ""
      )
        .trim()
        .toUpperCase(),

    id:
      String(
        r.id || ""
      ).trim(),

    eliminado:
      r.eliminado === true,

    version:
      String(
        r.version ||
        APP_VERSION
      )

  };

}


/************************************************************
 * VALIDAR PAYLOAD
 ************************************************************/
function validarPayload(p) {

  if (!p.id) {

    throw new Error(
      "Registro sin ID."
    );

  }


  if (!p.codigo) {

    throw new Error(
      "Registro sin código."
    );

  }


  if (!p.estacion) {

    throw new Error(
      "Registro sin estación."
    );

  }


  if (
    [
      "BALANZA",
      "DESCARGUIO",
      "CHANCADO",
      "MUESTREO",
      "SECADO",
      "PULVERIZADO"
    ].includes(
      p.estacion
    ) &&
    !p.recurso
  ) {

    throw new Error(
      "Falta RECURSO en " +
      p.codigo +
      "."
    );

  }

}


/************************************************************
 * JSONP SEGURO
 ************************************************************/
function jsonpSeguro(
  params,
  timeout = SYNC_REQUEST_TIMEOUT_MS
) {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const cb =
        "kamban_cb_" +
        Date.now() +
        "_" +
        Math.random()
          .toString(36)
          .slice(2);


      const script =
        document.createElement(
          "script"
        );


      let done = false;


      const clean = () => {

        if (done) {
          return;
        }


        done = true;


        clearTimeout(
          timer
        );


        try {

          delete window[cb];

        } catch (e) {

          window[cb] =
            undefined;

        }


        if (
          script.parentNode
        ) {

          script.parentNode
            .removeChild(
              script
            );

        }

      };


      const timer =
        setTimeout(
          () => {

            clean();


            reject(
              new Error(
                "Apps Script no respondió dentro del tiempo límite."
              )
            );

          },
          timeout
        );


      window[cb] =
        r => {

          clean();

          resolve(r);

        };


      script.onerror =
        () => {

          clean();


          reject(
            new Error(
              "No se pudo conectar con Apps Script."
            )
          );

        };


      const q =
        new URLSearchParams();


      Object.entries(
        {
          ...params,
          callback: cb,
          _: Date.now()
        }
      )
        .forEach(
          ([k, v]) => {

            if (
              v !== undefined &&
              v !== null
            ) {

              q.set(
                k,
                String(v)
              );

            }

          }
        );


      script.src =
        endpoint() +
        "?" +
        q.toString();


      document.head
        .appendChild(
          script
        );

    }
  );

}


/************************************************************
 * VERIFICAR BACKEND
 ************************************************************/
async function verificarBackend(
  forzar = false
) {

  const now =
    Date.now();


  if (
    !forzar &&
    syncBackendVerificadoEn &&
    (
      now -
      syncBackendVerificadoEn
    ) < 300000
  ) {

    return true;

  }


  const r =
    await jsonpSeguro(
      {
        action: "ping"
      },
      10000
    );


  if (
    !r ||
    r.ok !== true
  ) {

    throw new Error(
      "El backend no respondió correctamente."
    );

  }


  if (
    String(
      r.version || ""
    ) !==
    String(
      BACKEND_VERSION_ESPERADA
    )
  ) {

    throw new Error(
      "Backend incompatible. Encontrado: " +
      String(
        r.version ||
        "sin versión"
      ) +
      " | Esperado: " +
      BACKEND_VERSION_ESPERADA
    );

  }


  syncBackendVerificadoEn =
    now;


  return true;

}


/************************************************************
 * ENVÍO INDIVIDUAL
 *
 * Se conserva como respaldo.
 ************************************************************/
async function enviarYConfirmar(
  registro
) {

  const p =
    crearPayload(
      registro
    );


  validarPayload(p);


  const r =
    await jsonpSeguro(
      p,
      SYNC_REQUEST_TIMEOUT_MS
    );


  if (
    !r ||
    r.ok !== true
  ) {

    throw new Error(
      r &&
      r.error
        ? r.error
        : "Apps Script rechazó el registro."
    );

  }


  const remoto =
    r.data || {};


  const id =
    String(
      remoto.id ||
      r.id ||
      ""
    ).trim();


  const rec =
    String(
      remoto.recurso ||
      r.recurso ||
      ""
    )
      .trim()
      .toUpperCase();


  if (
    id !== p.id
  ) {

    throw new Error(
      "El backend confirmó un ID diferente."
    );

  }


  if (
    p.recurso &&
    rec !== p.recurso
  ) {

    throw new Error(
      "RECURSO no confirmado."
    );

  }


  return p;

}


/************************************************************
 * ENVÍO BATCH
 *
 * NUEVO:
 * Varios registros viajan en una sola comunicación.
 ************************************************************/
async function enviarLoteYConfirmar(
  registros
) {

  const payloads =
    registros.map(
      crearPayload
    );


  payloads.forEach(
    validarPayload
  );


  const r =
    await jsonpSeguro(
      {

        action:
          "batch",

        data:
          JSON.stringify(
            payloads
          )

      },

      SYNC_REQUEST_TIMEOUT_MS
    );


  if (
    !r ||
    r.ok !== true
  ) {

    throw new Error(
      r &&
      r.error
        ? r.error
        : "Apps Script rechazó el lote."
    );

  }


  if (
    !Array.isArray(
      r.data
    )
  ) {

    throw new Error(
      "El backend no devolvió confirmaciones del lote."
    );

  }


  return {

    payloads:
      payloads,

    respuesta:
      r

  };

}


/************************************************************
 * TIEMPO DE REINTENTO
 ************************************************************/
function esperaReintento(n) {

  return Math.min(

    SYNC_RETRY_MAX_MS,

    SYNC_RETRY_BASE_MS *
    Math.pow(
      2,
      Math.min(
        Math.max(
          n - 1,
          0
        ),
        4
      )
    )

  );

}


/************************************************************
 * PROGRAMAR REINTENTO
 ************************************************************/
function programarReintentoGlobal(
  delay =
    SYNC_RETRY_BASE_MS
) {

  clearTimeout(
    syncTimerReintento
  );


  if (
    !navigator.onLine
  ) {

    return;

  }


  syncTimerReintento =
    setTimeout(
      () =>
        procesarPendientesSync(
          false
        ),
      delay
    );

}


/************************************************************
 * MARCAR ERROR
 ************************************************************/
function marcarErrorSync(
  id,
  msg
) {

  const actual =
    obtenerRegistro(
      id
    );


  const intentos =
    Number(
      actual &&
      actual.sync_intentos ||
      0
    ) + 1;


  actualizarRegistro(
    id,
    {

      sincronizado:
        false,

      sync_intentos:
        intentos,

      sync_ultimo_error:
        msg,

      sync_ultima_fecha:
        fechaHoraLocal()

    }
  );


  return intentos;

}


/************************************************************
 * PROCESAR PENDIENTES
 ************************************************************/
async function procesarPendientesSync(
  manual = false
) {

  if (
    syncProcesando
  ) {

    return;

  }


  if (
    !endpoint()
  ) {

    if (manual) {

      alert(
        "Falta configurar la URL de Apps Script."
      );

    }

    return;

  }


  if (
    !navigator.onLine
  ) {

    if (manual) {

      alert(
        "Sin conexión. Los registros quedan guardados localmente."
      );

    }

    return;

  }


  syncProcesando =
    true;


  let enviados = 0;

  let ultimoError = "";


  try {

    /*
     * En sincronización manual comprobamos
     * primero que el backend sea compatible.
     */
    if (manual) {

      await verificarBackend(
        true
      );

    }


    while (
      navigator.onLine
    ) {

      /*
       * Tomamos hasta 8 registros pendientes.
       */
      const pendientes =
        pendientesSyncOrdenados()
          .filter(
            r =>
              !syncEnCurso.has(
                String(
                  r.id
                )
              )
          )
          .slice(
            0,
            SYNC_BATCH_SIZE
          );


      if (
        !pendientes.length
      ) {

        break;

      }


      const ids =
        pendientes.map(
          r =>
            String(
              r.id
            )
        );


      ids.forEach(
        id =>
          syncEnCurso.add(
            id
          )
      );


      try {

        const resultado =
          await enviarLoteYConfirmar(
            pendientes
          );


        const payloads =
          resultado.payloads;


        const respuesta =
          resultado.respuesta;


        const confirmaciones =
          respuesta.data;


        let exitosEnLote =
          0;


        let maxIntentosError =
          0;


        /*
         * Revisamos cada confirmación del servidor.
         */
        for (
          let i = 0;
          i < payloads.length;
          i++
        ) {

          const p =
            payloads[i];


          const conf =
            confirmaciones.find(
              x =>
                String(
                  x &&
                  x.id ||
                  ""
                ).trim() ===
                p.id
            );


          /*
           * REGISTRO CONFIRMADO
           */
          if (
            conf &&
            conf.ok === true
          ) {

            actualizarRegistro(
              p.id,
              {

                sincronizado:
                  true,

                recurso:
                  p.recurso,

                sync_ultimo_error:
                  "",

                sync_ultima_fecha:
                  fechaHoraLocal()

              }
            );


            enviados++;

            exitosEnLote++;

            continue;

          }


          /*
           * ERROR SOLO EN ESTE REGISTRO
           */
          const msg =
            String(

              conf &&
              conf.error

                ? conf.error

                : "El backend no confirmó este registro."

            );


          ultimoError =
            msg;


          const intentos =
            marcarErrorSync(
              p.id,
              msg
            );


          maxIntentosError =
            Math.max(
              maxIntentosError,
              intentos
            );

        }


        /*
         * Si por lo menos uno fue guardado,
         * actualizamos la última sincronización.
         */
        if (
          exitosEnLote > 0
        ) {

          localStorage.setItem(
            LAST_SYNC_KEY,
            fechaHoraLocal()
          );

        }


        render();


        /*
         * Si TODOS fallaron,
         * detenemos momentáneamente.
         */
        if (
          exitosEnLote === 0 &&
          payloads.length
        ) {

          programarReintentoGlobal(
            esperaReintento(
              maxIntentosError ||
              1
            )
          );


          break;

        }

      } catch (error) {

        /*
         * Falló la comunicación completa del lote.
         *
         * Ninguno se marca como sincronizado.
         */
        const msg =
          String(
            error &&
            error.message
              ? error.message
              : error
          );


        ultimoError =
          msg;


        let maxIntentos =
          0;


        for (
          const id of ids
        ) {

          const intentos =
            marcarErrorSync(
              id,
              msg
            );


          maxIntentos =
            Math.max(
              maxIntentos,
              intentos
            );

        }


        render();


        programarReintentoGlobal(
          esperaReintento(
            maxIntentos ||
            1
          )
        );


        break;

      } finally {

        ids.forEach(
          id =>
            syncEnCurso.delete(
              id
            )
        );

      }


      /*
       * Pequeña pausa ENTRE LOTES.
       *
       * Ya no existe pausa entre cada registro.
       */
      await new Promise(
        r =>
          setTimeout(
            r,
            150
          )
      );

    }

  } catch (error) {

    ultimoError =
      String(
        error &&
        error.message
          ? error.message
          : error
      );


    programarReintentoGlobal(
      SYNC_RETRY_BASE_MS
    );

  } finally {

    syncProcesando =
      false;


    render();

  }


  /********************************************************
   * MENSAJE SINCRONIZACIÓN MANUAL
   ********************************************************/
  if (manual) {

    const faltan =
      pendientesSyncOrdenados()
        .length;


    alert(

      ultimoError

        ? (
          "Sincronización procesada con observaciones.\n\n" +
          ultimoError +
          "\n\nSincronizados: " +
          enviados +
          "\nPendientes: " +
          faltan
        )

        : (
          "Sincronizados: " +
          enviados +
          "\nPendientes: " +
          faltan
        )

    );

  }

}


/************************************************************
 * SINCRONIZACIÓN INMEDIATA
 ************************************************************/
function sincronizarRegistroInmediato(
  registro
) {

  setTimeout(
    () =>
      procesarPendientesSync(
        false
      ),
    0
  );

}


/************************************************************
 * SINCRONIZACIÓN MANUAL
 ************************************************************/
function sincronizar(
  manual = false
) {

  return procesarPendientesSync(
    manual
  );

}


/************************************************************
 * CARGAR KANBAN
 ************************************************************/
function cargarDrive(
  callback
) {

  window.errorReporte =
    "";


  jsonpSeguro(
    {
      action:
        "kanban"
    },
    30000
  )

    .then(
      r => {

        if (
          !r ||
          r.ok !== true
        ) {

          throw new Error(
            r &&
            r.error
              ? r.error
              : "Apps Script no devolvió una respuesta válida."
          );

        }


        if (
          String(
            r.version ||
            ""
          ) !==
          String(
            BACKEND_VERSION_ESPERADA
          )
        ) {

          throw new Error(

            "Backend sin actualizar. Encontrado: " +

            String(
              r.version ||
              "sin versión"
            ) +

            " | Esperado: " +

            BACKEND_VERSION_ESPERADA

          );

        }


        window.datosRemotos =
          Array.isArray(
            r.data
          )
            ? r.data
            : [];


        window.metaReporte =
          r.meta ||
          null;


        if (callback) {

          callback();

        }

      }
    )

    .catch(
      e => {

        console.error(
          "Lectura KANBAN:",
          e
        );


        window.datosRemotos =
          [];


        window.errorReporte =
          String(
            e &&
            e.message
              ? e.message
              : e
          );


        if (callback) {

          callback();

        }

      }
    );

}


/************************************************************
 * RECUPERACIÓN DE INTERNET
 ************************************************************/
window.addEventListener(
  "online",
  () => {

    syncBackendVerificadoEn =
      0;


    setTimeout(
      () =>
        procesarPendientesSync(
          false
        ),
      300
    );


    setTimeout(
      () =>
        procesarBorradosPendientes(),
      600
    );

  }
);


/************************************************************
 * VOLVER A LA APP
 ************************************************************/
document.addEventListener(
  "visibilitychange",
  () => {

    if (
      document.visibilityState ===
        "visible" &&
      navigator.onLine
    ) {

      setTimeout(
        () =>
          procesarPendientesSync(
            false
          ),
        400
      );

    }

  }
);


/************************************************************
 * INICIO
 ************************************************************/
document.addEventListener(
  "DOMContentLoaded",
  () => {

    /*
     * Intentar sincronizar pendientes
     * apenas abre la APP.
     */
    setTimeout(
      () =>
        procesarPendientesSync(
          false
        ),
      1000
    );


    /*
     * Procesar eliminaciones.
     */
    setTimeout(
      () =>
        procesarBorradosPendientes(),
      1500
    );


    /*
     * Sincronización periódica.
     */
    syncTimerPeriodico =
      setInterval(
        () => {

          if (
            navigator.onLine
          ) {

            procesarPendientesSync(
              false
            );

          }

        },
        SYNC_PERIODIC_MS
      );


    /*
     * Borrados periódicos.
     */
    setInterval(
      () => {

        if (
          navigator.onLine
        ) {

          procesarBorradosPendientes();

        }

      },
      SYNC_PERIODIC_MS
    );

  }
);
