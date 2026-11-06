/**
 * Pure JavaScript ZIP file generator (No dependencies).
 * Generates standard PKZip 2.0 archives that unpack cleanly in all operating systems.
 */

// Precomputed CRC32 table
const CRC32_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC32_TABLE[i] = c >>> 0;
}

function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC32_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function strToUtf8Bytes(str) {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str);
  }
  const utf8 = [];
  for (let i = 0; i < str.length; i++) {
    let charcode = str.charCodeAt(i);
    if (charcode < 0x80) utf8.push(charcode);
    else if (charcode < 0x800) {
      utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
    } else {
      i++;
      charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      utf8.push(
        0xf0 | (charcode >> 18),
        0x80 | ((charcode >> 12) & 0x3f),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f)
      );
    }
  }
  return new Uint8Array(utf8);
}

class ZipBuilder {
  constructor() {
    this.files = [];
  }

  addFile(filename, content) {
    let data;
    if (typeof content === 'string') {
      data = strToUtf8Bytes(content);
    } else if (content instanceof Uint8Array) {
      data = content;
    } else if (content instanceof ArrayBuffer) {
      data = new Uint8Array(content);
    } else {
      throw new Error(`Unsupported content type for file: ${filename}`);
    }

    const nameBytes = strToUtf8Bytes(filename);
    const checksum = crc32(data);

    this.files.push({
      name: filename,
      nameBytes,
      data,
      size: data.length,
      crc: checksum,
      date: new Date()
    });
    return this;
  }

  buildUint8Array() {
    const localHeaders = [];
    const centralHeaders = [];
    let offset = 0;

    for (const f of this.files) {
      const time = ((f.date.getHours() << 11) | (f.date.getMinutes() << 5) | (f.date.getSeconds() >> 1)) & 0xFFFF;
      const date = (((f.date.getFullYear() - 1980) << 9) | ((f.date.getMonth() + 1) << 5) | f.date.getDate()) & 0xFFFF;

      // 1. Local File Header (30 bytes + name + data)
      const localHdr = new Uint8Array(30 + f.nameBytes.length + f.size);
      const lv = new DataView(localHdr.buffer);
      lv.setUint32(0, 0x04034B50, true); // signature
      lv.setUint16(4, 20, true);         // version needed (2.0)
      lv.setUint16(6, 0x0800, true);     // flags: bit 11 = UTF-8 filename
      lv.setUint16(8, 0, true);          // compression: 0 (STORED)
      lv.setUint16(10, time, true);
      lv.setUint16(12, date, true);
      lv.setUint32(14, f.crc, true);     // crc32
      lv.setUint32(18, f.size, true);    // compressed size
      lv.setUint32(22, f.size, true);    // uncompressed size
      lv.setUint16(26, f.nameBytes.length, true);
      lv.setUint16(28, 0, true);         // extra field length
      localHdr.set(f.nameBytes, 30);
      localHdr.set(f.data, 30 + f.nameBytes.length);
      localHeaders.push(localHdr);

      // 2. Central Directory Header (46 bytes + name)
      const cdHdr = new Uint8Array(46 + f.nameBytes.length);
      const cv = new DataView(cdHdr.buffer);
      cv.setUint32(0, 0x02014B50, true); // signature
      cv.setUint16(4, 20, true);         // version made by
      cv.setUint16(6, 20, true);         // version needed
      cv.setUint16(8, 0x0800, true);     // flags: UTF-8
      cv.setUint16(10, 0, true);         // compression: 0
      cv.setUint16(12, time, true);
      cv.setUint16(14, date, true);
      cv.setUint32(16, f.crc, true);
      cv.setUint32(20, f.size, true);
      cv.setUint32(24, f.size, true);
      cv.setUint16(28, f.nameBytes.length, true);
      cv.setUint16(30, 0, true);         // extra length
      cv.setUint16(32, 0, true);         // comment length
      cv.setUint16(34, 0, true);         // disk number
      cv.setUint16(36, 0, true);         // internal attrs
      cv.setUint32(38, 0, true);         // external attrs
      cv.setUint32(42, offset, true);    // relative offset of local header
      cdHdr.set(f.nameBytes, 46);
      centralHeaders.push(cdHdr);

      offset += localHdr.length;
    }

    const cdOffset = offset;
    let cdSize = 0;
    for (const h of centralHeaders) cdSize += h.length;

    // 3. End of Central Directory Record (22 bytes)
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054B50, true);   // signature
    ev.setUint16(4, 0, true);            // disk number
    ev.setUint16(6, 0, true);            // start disk
    ev.setUint16(8, this.files.length, true);  // records on disk
    ev.setUint16(10, this.files.length, true); // total records
    ev.setUint32(12, cdSize, true);      // size of central directory
    ev.setUint32(16, cdOffset, true);    // offset of central directory
    ev.setUint16(20, 0, true);           // comment length

    // Assemble everything into one buffer
    const totalSize = offset + cdSize + 22;
    const zipBuffer = new Uint8Array(totalSize);
    let pos = 0;
    for (const h of localHeaders) {
      zipBuffer.set(h, pos);
      pos += h.length;
    }
    for (const h of centralHeaders) {
      zipBuffer.set(h, pos);
      pos += h.length;
    }
    zipBuffer.set(eocd, pos);

    return zipBuffer;
  }

  toBlob() {
    const bytes = this.buildUint8Array();
    return new Blob([bytes], { type: 'application/zip' });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ZipBuilder, crc32, strToUtf8Bytes };
}
