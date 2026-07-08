function doGet(e) {
  const ID_SHEET = "PEGA_AQUI_EL_ID_DE_TU_GOOGLE_SHEETS";
  const ss = SpreadsheetApp.openById(ID_SHEET);
  const action = e && e.parameter && e.parameter.action;
  const callback = e && e.parameter && e.parameter.callback;

  if (action === "list") {
    const data = [];
    ss.getSheets().forEach(function(hoja) {
      const name = hoja.getName();
      if (name === "KANBAN") return;
      const last = hoja.getLastRow();
      if (last < 2) return;
      const values = hoja.getRange(2, 1, last - 1, 6).getValues();
      values.forEach(function(row) {
        if (!row[0]) return;
        data.push({
          codigo: String(row[0] || ""),
          evento: String(row[1] || ""),
          fecha_hora: String(row[2] || ""),
          operador: String(row[3] || ""),
          estacion: String(row[4] || name),
          id: String(row[5] || ""),
          sincronizado: true,
          eliminado: false
        });
      });
    });
    const json = JSON.stringify({data:data});
    if (callback) return ContentService.createTextOutput(callback + "(" + json + ");").setMimeType(ContentService.MimeType.JAVASCRIPT);
    return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput("KAMBAN OK");
}

function doPost(e) {
  const ID_SHEET = "PEGA_AQUI_EL_ID_DE_TU_GOOGLE_SHEETS";
  const ss = SpreadsheetApp.openById(ID_SHEET);
  const data = JSON.parse(e.postData.contents);
  if (data.test === true) return ContentService.createTextOutput("TEST OK");

  const estacion = data.estacion || "SIN_ESTACION";
  let hoja = ss.getSheetByName(estacion);
  if (!hoja) hoja = ss.insertSheet(estacion);
  if (hoja.getLastRow() === 0) hoja.appendRow(["CODIGO","EVENTO","FECHA_HORA","OPERADOR","ESTACION","ID"]);

  const id = String(data.id || "");
  let filaEncontrada = -1;
  const lastRow = hoja.getLastRow();
  if (lastRow >= 2 && id) {
    const ids = hoja.getRange(2, 6, lastRow - 1, 1).getValues();
    for (let i=0;i<ids.length;i++) if (String(ids[i][0]) === id) { filaEncontrada = i + 2; break; }
  }

  const fila = [data.codigo || "", data.evento || "", data.fecha_hora || "", data.operador || "", data.estacion || "", data.id || ""];
  if (filaEncontrada > 0) hoja.getRange(filaEncontrada, 1, 1, 6).setValues([fila]);
  else hoja.appendRow(fila);

  return ContentService.createTextOutput("OK");
}
