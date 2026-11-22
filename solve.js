const COMMA = 1;
const LINE_BREAK = 2;
const END = 3;

export function run(input) {
  const text = typeof input.text === 'string' ? input.text : String(input.text);
  const header = input.header === true;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;
  const len = text.length;
  let pos = text.charCodeAt(0) === 0xFEFF ? 1 : 0;
  let line = 1;
  let recordLine = 1;
  let recordRow = null;
  let fieldValue = '';
  let fieldEnded = END;

  function readUnquoted(initial) {
    let seg = pos;
    let prefix = initial;
    while (pos < len) {
      let nc = text.indexOf(',', pos); if (nc === -1) nc = len;
      let nl = text.indexOf('\n', pos); if (nl === -1) nl = len;
      let nr = text.indexOf('\r', pos); if (nr === -1) nr = len;
      let end = nc, kind = 0;
      if (nl < end) { end = nl; kind = 1; }
      if (nr < end) { end = nr; kind = 2; }
      if (end === len) { fieldValue = prefix + text.slice(seg, len); pos = len; fieldEnded = END; return; }
      if (kind === 0) { fieldValue = prefix + text.slice(seg, end); pos = end + 1; fieldEnded = COMMA; return; }
      if (kind === 1) { fieldValue = prefix + text.slice(seg, end); pos = end + 1; line++; fieldEnded = LINE_BREAK; return; }
      if (text.charCodeAt(end + 1) === 10) { fieldValue = prefix + text.slice(seg, end); pos = end + 2; line++; fieldEnded = LINE_BREAK; return; }
      prefix += text.slice(seg, end);
      errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
      pos = end + 1;
      seg = pos;
    }
    fieldValue = prefix;
    fieldEnded = END;
  }

  function readQuoted() {
    const open = pos;
    const openLine = line;
    pos++;
    let value = '';
    let seg = pos;
    while (pos < len) {
      const c = text.charCodeAt(pos);
      if (c === 34) {
        if (text.charCodeAt(pos + 1) === 34) { value += text.slice(seg, pos) + '"'; pos += 2; seg = pos; continue; }
        fieldValue = value === '' ? text.slice(seg, pos) : value + text.slice(seg, pos);
        pos++;
        if (pos >= len) { fieldEnded = END; return; }
        const d = text.charCodeAt(pos);
        if (d === 44) { pos++; fieldEnded = COMMA; return; }
        if (d === 10) { pos++; line++; fieldEnded = LINE_BREAK; return; }
        if (d === 13 && text.charCodeAt(pos + 1) === 10) { pos += 2; line++; fieldEnded = LINE_BREAK; return; }
        const before = fieldValue.length;
        readUnquoted(fieldValue);
        if (fieldValue.length > before) errors.push({ code: 'quote_junk', line: recordLine, row: recordRow });
        return;
      }
      if (c === 13) {
        value += text.slice(seg, pos) + '\n';
        line++;
        pos += text.charCodeAt(pos + 1) === 10 ? 2 : 1;
        seg = pos;
        continue;
      }
      if (c === 10) { line++; pos++; continue; }
      pos++;
    }
    pos = open + 1; line = openLine;
    errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
    readUnquoted('"');
  }

  while (pos < len) {
    const c = text.charCodeAt(pos);
    if (c === 10) { pos++; line++; continue; }
    if (c === 13 && text.charCodeAt(pos + 1) === 10) { pos += 2; line++; continue; }

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;

    if (c !== 34) {
      let nl = text.indexOf('\n', pos); if (nl === -1) nl = len;
      const qi = text.indexOf('"', pos);
      if ((qi === -1 || qi >= nl)) {
        const ri = text.indexOf('\r', pos);
        if (ri === -1 || ri >= nl) {
          const lineText = text.slice(pos, nl);
          const fields = lineText.indexOf(',') === -1 ? [lineText] : lineText.split(',');
          pos = nl < len ? nl + 1 : len;
          line++;
          fieldEnded = LINE_BREAK;
          if (!(fields.length === 1 && fields[0] === '')) {
            if (width < 0) width = fields.length;
            if (header && columns === null) { columns = fields; }
            else {
              if (fields.length < width) {
                errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
                while (fields.length < width) fields.push('');
              } else if (fields.length > width) {
                errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.slice(width) });
                fields.length = width;
              }
              rows.push(fields);
            }
          }
          continue;
        }
      }
    }

    const fields = [];
    let quoted = false;
    do {
      quoted = text.charCodeAt(pos) === 34;
      if (quoted) readQuoted(); else readUnquoted('');
      fields.push(fieldValue);
    } while (fieldEnded === COMMA);

    if (fields.length === 1 && fields[0] === '' && !quoted) continue;
    if (width < 0) width = fields.length;
    if (header && columns === null) { columns = fields; continue; }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.slice(width) });
      fields.length = width;
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
