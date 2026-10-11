/* KANBAN ACOPIO - respaldo Excel real XLSX, sin CDN ni conexión. */
(function () {
  'use strict';
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }
  function col(i) {
    let s = '';
    for (let n = i + 1; n; n = Math.floor((n - 1) / 26)) {
      s = String.fromCharCode(65 + (n - 1) % 26) + s;
    }
    return s;
  }
  function xmlHoja(matriz) {
    const filas = matriz.map((fila, ri) => {
      const cells = fila.map((v, ci) => {
        const pos = col(ci) + (ri + 1);
        const str = esc(v).slice(0, 32767); // máximo de texto por celda de Excel
        return `<c r="${pos}" s="${ri === 0 ? 1 : 0}" t="inlineStr"><is><t xml:space="preserve">${str}</t></is></c>`;
      }).join('');
      return `<row r="${ri + 1}">${cells}</row>`;
    }).join('');
    const cols = matriz.length ? matriz[0].length : 1;
    const end = col(Math.max(0, cols - 1)) + Math.max(1, matriz.length);
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
      `<dimension ref="A1:${end}"/>` +
      '<sheetFormatPr defaultRowHeight="17"/>' +
      `<sheetData>${filas}</sheetData>` +
      (matriz.length > 1 && cols > 0 ? `<autoFilter ref="A1:${end}"/>` : '') +
      '</worksheet>';
  }
  function crc32(bytes) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) {
      crc ^= bytes[i];
      for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  function u16(v) { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, v, true); return b; }
  function u32(v) { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, v >>> 0, true); return b; }
  function zipSinCompresion(archivos) {
    const enc = new TextEncoder(), locales = [], centrales = [];
    let posicion = 0, bytesCentral = 0;
    for (const [nombre, contenido] of archivos) {
      const name = enc.encode(nombre), data = enc.encode(contenido), crc = crc32(data);
      const local = [u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
        u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), name, data];
      locales.push(...local);
      const central = [u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
        u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0),
        u16(0), u16(0), u32(0), u32(posicion), name];
      centrales.push(...central);
      posicion += 30 + name.length + data.length;
      bytesCentral += 46 + name.length;
    }
    const end = [u32(0x06054b50), u16(0), u16(0), u16(archivos.length),
      u16(archivos.length), u32(bytesCentral), u32(posicion), u16(0)];
    return new Blob([...locales, ...centrales, ...end], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  }
  function construirExcel(sheets) {
    const main = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
    const rel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    const titulos = sheets.map((s, i) => `<sheet name="${esc(s[0])}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('');
    const links = sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="${rel}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('');
    const tipos = sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('');
    const archivos = [
      ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${tipos}</Types>`],
      ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
      ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="${main}" xmlns:r="${rel}"><sheets>${titulos}</sheets></workbook>`],
      ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${links}<Relationship Id="rId${sheets.length + 1}" Type="${rel}/styles" Target="styles.xml"/></Relationships>`],
      ['xl/styles.xml', `<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="${main}"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF17365D"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>`]
    ];
    sheets.forEach((s, i) => archivos.push([`xl/worksheets/sheet${i + 1}.xml`, xmlHoja(s[1])]));
    return zipSinCompresion(archivos);
  }
  function exportarExcel() {
    try {
      const registros = datos();
      const centrales = ['codigo', 'evento', 'fecha_hora', 'operador', 'estacion', 'recurso',
        'id', 'detalle', 'sincronizado', 'sync_intentos', 'sync_ultimo_error',
        'sync_ultima_fecha', 'sync_bloqueado', 'version', 'eliminado', 'lectura_original'];
      const adicionales = [...new Set(registros.flatMap(r => Object.keys(r)))].filter(k => !centrales.includes(k)).sort();
      const campos = centrales.concat(adicionales);
      const titulo = campos.map(k => k.toUpperCase());
      const matriz = (arreglo) => [titulo, ...arreglo.map(r => campos.map(k =>
        typeof r[k] === 'boolean' ? (r[k] ? 'SI' : 'NO') : r[k] == null ? '' :
          typeof r[k] === 'object' ? JSON.stringify(r[k]) : String(r[k])))];
      const pendientes = registros.filter(r => r.sincronizado !== true && !r.eliminado);
      const control = [
        ['CONCEPTO', 'VALOR'],
        ['GENERADO', new Date().toISOString()],
        ['DISPOSITIVO', typeof nombreDispositivo === 'function' ? nombreDispositivo() : 'SIN NOMBRE'],
        ['VERSION', typeof APP_BUILD !== 'undefined' ? APP_BUILD : ''],
        ['REGISTROS LOCALES', String(registros.length)],
        ['PENDIENTES POR ENVIAR', String(pendientes.length)],
        ['SINCRONIZADOS', String(registros.filter(r => r.sincronizado === true).length)],
        ['IMPORTANTE', 'Este respaldo contiene SOLO la base local de este dispositivo; no reúne los datos de los demás equipos.'],
        ['SEGURIDAD', 'No borrar registros pendientes; verificar ID en Google Sheets antes de limpiar datos.']
      ];
      const libro = construirExcel([['REGISTROS', matriz(registros)], ['PENDIENTES', matriz(pendientes)], ['CONTROL', control]]);
      const url = URL.createObjectURL(libro);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'RESPALDO_KANBAN_' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + '.xlsx';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 60000);
      return libro;
    } catch (error) {
      alert('No se pudo crear el respaldo Excel: ' + String(error.message || error));
      console.error('Respaldo XLSX:', error);
      return null;
    }
  }
  window.exportarExcel = exportarExcel;
  // Exposición limitada para pruebas locales del formato, sin llamadas externas.
  window.__kanbanCrearLibro = construirExcel;
})();
