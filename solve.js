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

  function addError(code) {
    errors.push({ code, line: recordLine, row: recordRow });
  }

  function readUnquoted(initial) {
    let parts = null;
    let seg = pos;
    let endPos = len;
    let ended = END;
    while (pos < len) {
      const c = text.charCodeAt(pos);
      if (c === 44) {
        endPos = pos;
        pos += 1;
        ended = COMMA;
        break;
      }
      if (c === 10) {
        endPos = pos;
        pos += 1;
        line += 1;
        ended = LINE_BREAK;
        break;
      }
      if (c === 13) {
        if (text.charCodeAt(pos + 1) === 10) {
          endPos = pos;
          pos += 2;
          line += 1;
          ended = LINE_BREAK;
          break;
        }
        if (parts === null) parts = [text.slice(seg, pos)];
        else parts.push(text.slice(seg, pos));
        addError('stray_cr');
        pos += 1;
        seg = pos;
        continue;
      }
      pos += 1;
    }
    if (parts === null) fieldValue = initial + text.slice(seg, endPos);
    else {
      parts.push(text.slice(seg, endPos));
      fieldValue = initial + parts.join('');
    }
    fieldEnded = ended;
  }

  function readQuoted() {
    const open = pos;
    const openLine = line;
    pos += 1;
    let value = '';
    let seg = pos;
    let closed = false;
    while (pos < len) {
      const c = text.charCodeAt(pos);
      if (c === 34) {
        if (text.charCodeAt(pos + 1) === 34) {
          value += text.slice(seg, pos) + '"';
          pos += 2;
          seg = pos;
          continue;
        }
        fieldValue = value === '' ? text.slice(seg, pos) : value + text.slice(seg, pos);
        pos += 1;
        closed = true;
        break;
      }
      if (c === 13) {
        value += text.slice(seg, pos) + '\n';
        line += 1;
        pos += text.charCodeAt(pos + 1) === 10 ? 2 : 1;
        seg = pos;
        continue;
      }
      if (c === 10) line += 1;
      pos += 1;
    }
    if (!closed) {
      pos = open + 1;
      line = openLine;
      addError('unterminated_quote');
      readUnquoted('"');
      return;
    }
    if (pos >= len) {
      fieldEnded = END;
      return;
    }
    const c = text.charCodeAt(pos);
    if (c === 44) {
      pos += 1;
      fieldEnded = COMMA;
      return;
    }
    if (c === 10) {
      pos += 1;
      line += 1;
      fieldEnded = LINE_BREAK;
      return;
    }
    if (c === 13 && text.charCodeAt(pos + 1) === 10) {
      pos += 2;
      line += 1;
      fieldEnded = LINE_BREAK;
      return;
    }
    const before = fieldValue.length;
    readUnquoted(fieldValue);
    if (fieldValue.length > before) addError('quote_junk');
  }

  while (true) {
    while (pos < len) {
      const c = text.charCodeAt(pos);
      if (c === 10) {
        pos += 1;
        line += 1;
      } else if (c === 13 && text.charCodeAt(pos + 1) === 10) {
        pos += 2;
        line += 1;
      } else {
        break;
      }
    }
    if (pos >= len) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let quoted = false;
    do {
      quoted = text.charCodeAt(pos) === 34;
      if (quoted) readQuoted();
      else readUnquoted('');
      fields.push(fieldValue);
    } while (fieldEnded === COMMA);

    if (fields.length === 1 && fields[0] === '' && !quoted) continue;
    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
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
