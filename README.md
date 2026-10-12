KANBAN QR 3.0 - R13 RECURSOS Y TIEMPOS

MUESTREO: al registrar RECEPCION no se solicita recurso; en INICIO se solicita ubicación N° + cancha/segmento. Se limpia tras INICIO. FINAL recupera recurso de INICIO local.
SECADO: al registrar RECEPCION no se solicita recurso; en INICIO se solicita HORNO H1-H10. Se limpia tras INICIO. FINAL recupera recurso de INICIO local.
PULVERIZADO: al registrar RECEPCION no se solicita recurso; en INICIO se solicita MOLINO M1-M10. Se limpia tras INICIO. FINAL recupera recurso de INICIO local.
INVENTARIO: ubicación permanece fija hasta que usuario cambie.
TIEMPOS: Espera=INICIO-RECEPCION; Paradas=suma(REINICIO-PARADA) (vacío si no hubo); Proceso=FINAL-INICIO-Paradas; Permanencia=FINAL-RECEPCION, o FINAL-INICIO si no hubo recepción. Números en minutos.
La tabla local incluye las cuatro métricas.
GOOGLE SHEETS: backend contiene RECALCULAR_TIEMPOS_AUTOMATICO y su instalador INSTALAR_CALCULO_AUTOMATICO. Ejecutar una vez el instalador desde Apps Script, autorizar permisos y publicar una nueva versión de la MISMA implementación para mantener la sincronización. El recálculo es cada minuto, no instantáneo. El cálculo no bloquea el guardado.
No se han modificado la sincronización, el ID, los endpoints ni las claves locales.
LIMITACION: recurso heredado de INICIO solo puede recuperarse localmente en el mismo equipo.
No borrar almacenamiento local con registros pendientes. No se ha verificado producción.
