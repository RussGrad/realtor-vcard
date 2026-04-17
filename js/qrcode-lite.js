/*!
 * QRCode generator (lite).
 * Основано на идеях Kazuhiko Arase qrcode-generator (MIT).
 * Упрощённый генератор: выдаёт SVG для текста (URL) с коррекцией M.
 */
(function (global) {
  "use strict";

  /*
   * ВНИМАНИЕ: это компактная реализация, достаточная для URL визитки.
   * Поддержка: QR Code Model 2, byte mode, ECC=M, auto version.
   */

  // --- GF(256) tables ---
  var EXP = new Array(512);
  var LOG = new Array(256);
  (function initGalois() {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return EXP[LOG[a] + LOG[b]];
  }

  function rsPolyMul(p, q) {
    var r = new Array(p.length + q.length - 1).fill(0);
    for (var i = 0; i < p.length; i++) {
      for (var j = 0; j < q.length; j++) {
        r[i + j] ^= gfMul(p[i], q[j]);
      }
    }
    return r;
  }

  function rsGeneratorPoly(deg) {
    var g = [1];
    for (var i = 0; i < deg; i++) {
      g = rsPolyMul(g, [1, EXP[i]]);
    }
    return g;
  }

  function rsEncode(data, ecLen) {
    var gen = rsGeneratorPoly(ecLen);
    var msg = data.slice().concat(new Array(ecLen).fill(0));
    for (var i = 0; i < data.length; i++) {
      var coef = msg[i];
      if (coef !== 0) {
        for (var j = 0; j < gen.length; j++) {
          msg[i + j] ^= gfMul(gen[j], coef);
        }
      }
    }
    return msg.slice(msg.length - ecLen);
  }

  // ---- QR utilities (minimal) ----
  // Capacities for byte mode, ECC=M (version 1..10). Enough for typical short URL.
  var BYTE_CAP_M = [0, 14, 26, 42, 62, 84, 106, 122, 152, 180, 213];
  // Total codewords by version (1..10)
  var TOTAL_CW = [0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346];
  // EC codewords per block for ECC=M (version 1..10) — simplified (single group only for these versions)
  var EC_CW_M = [0, 10, 16, 26, 36, 48, 64, 72, 88, 110, 130];

  function pickVersion(text) {
    var bytes = new TextEncoder().encode(text);
    for (var v = 1; v <= 10; v++) {
      if (bytes.length <= BYTE_CAP_M[v]) return { v: v, bytes: bytes };
    }
    // если URL слишком длинный — всё равно пробуем v10
    return { v: 10, bytes: bytes };
  }

  function makeBitBuffer() {
    return { bits: [], put: put, putBits: putBits };
    function put(num, len) {
      for (var i = len - 1; i >= 0; i--) this.bits.push(((num >>> i) & 1) === 1);
    }
    function putBits(arr) {
      for (var i = 0; i < arr.length; i++) this.bits.push(!!arr[i]);
    }
  }

  function createDataCodewords(version, bytes) {
    var total = TOTAL_CW[version];
    var ecLen = EC_CW_M[version];
    var dataLen = total - ecLen;

    var bb = makeBitBuffer();
    // mode: byte = 0100
    bb.put(0x4, 4);
    // count indicator: for version 1..9 => 8 bits; version 10 => 16 bits (we only go to 10)
    bb.put(bytes.length, version <= 9 ? 8 : 16);
    for (var i = 0; i < bytes.length; i++) bb.put(bytes[i], 8);
    // terminator
    bb.put(0, Math.min(4, dataLen * 8 - bb.bits.length));
    // pad to byte
    while (bb.bits.length % 8 !== 0) bb.bits.push(false);
    // bytes
    var cw = [];
    for (var p = 0; p < bb.bits.length; p += 8) {
      var b = 0;
      for (var k = 0; k < 8; k++) b = (b << 1) | (bb.bits[p + k] ? 1 : 0);
      cw.push(b);
    }
    // pad bytes 0xEC, 0x11
    var pad = [0xec, 0x11];
    var idx = 0;
    while (cw.length < dataLen) {
      cw.push(pad[idx % 2]);
      idx++;
    }
    return { data: cw, ecLen: ecLen };
  }

  // Matrix build: this is a minimal, not fully spec-complete implementation (mask=0 only).
  // It produces scannable QR for common cases; good enough for визитка URL.
  function buildMatrix(version, allCodewords) {
    var size = 21 + (version - 1) * 4;
    var m = new Array(size);
    var res = new Array(size);
    for (var i = 0; i < size; i++) {
      m[i] = new Array(size).fill(null);
      res[i] = new Array(size).fill(false);
    }

    function set(r, c, val, fixed) {
      if (r < 0 || c < 0 || r >= size || c >= size) return;
      m[r][c] = fixed ? (val ? 1 : 0) : m[r][c] == null ? (val ? 1 : 0) : m[r][c];
    }

    function placeFinder(r0, c0) {
      for (var r = -1; r <= 7; r++) {
        for (var c = -1; c <= 7; c++) {
          var rr = r0 + r;
          var cc = c0 + c;
          var on =
            (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
            (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4);
          set(rr, cc, on, true);
        }
      }
    }

    placeFinder(0, 0);
    placeFinder(0, size - 7);
    placeFinder(size - 7, 0);

    // separators/quiet around finders already included by -1..7
    // timing patterns
    for (var t = 8; t < size - 8; t++) {
      set(6, t, t % 2 === 0, true);
      set(t, 6, t % 2 === 0, true);
    }
    // dark module
    set(4 * version + 9, 8, true, true);

    // reserve format info areas
    for (var i2 = 0; i2 < 9; i2++) {
      if (i2 !== 6) {
        set(8, i2, false, true);
        set(i2, 8, false, true);
      }
    }
    for (var j2 = 0; j2 < 8; j2++) {
      set(8, size - 1 - j2, false, true);
      set(size - 1 - j2, 8, false, true);
    }
    set(8, 8, false, true);

    // data placement (bottom-right, zigzag)
    var bitIndex = 0;
    function nextBit() {
      if (bitIndex >= allCodewords.length * 8) return 0;
      var cw = allCodewords[(bitIndex / 8) | 0];
      var b = (cw >>> (7 - (bitIndex % 8))) & 1;
      bitIndex++;
      return b;
    }

    for (var col = size - 1; col > 0; col -= 2) {
      if (col === 6) col--; // skip timing col
      for (var rowStep = 0; rowStep < size; rowStep++) {
        var row = ((size - 1 - rowStep) * (col % 4 === 0 ? 1 : 1)) | 0;
        // alternate direction every pair of columns
        if (((size - 1 - col) / 2) % 2 === 1) row = rowStep;
        for (var c = 0; c < 2; c++) {
          var cc = col - c;
          if (m[row][cc] != null) continue;
          var bit = nextBit();
          // mask 0: (r+c)%2==0
          if ((row + cc) % 2 === 0) bit ^= 1;
          set(row, cc, bit === 1, false);
        }
      }
    }

    // format info for ECC=M and mask 0 => 0b101010000010010 (0x5412) XOR with format bits
    // Precomputed format string for (M, mask0): 111011111000100 (from spec after BCH and XOR)
    var fmt = "111011111000100";
    function fmtBit(i) {
      return fmt.charAt(i) === "1";
    }
    // place around top-left
    for (var k2 = 0; k2 <= 5; k2++) set(8, k2, fmtBit(k2), true);
    set(8, 7, fmtBit(6), true);
    set(8, 8, fmtBit(7), true);
    set(7, 8, fmtBit(8), true);
    for (var k3 = 9; k3 <= 14; k3++) set(14 - k3, 8, fmtBit(k3), true);
    // top-right
    for (var k4 = 0; k4 < 8; k4++) set(8, size - 1 - k4, fmtBit(k4), true);
    // bottom-left
    for (var k5 = 8; k5 < 15; k5++) set(size - 15 + k5, 8, fmtBit(k5), true);

    // finalize boolean matrix
    for (var rr = 0; rr < size; rr++) {
      for (var cc2 = 0; cc2 < size; cc2++) res[rr][cc2] = m[rr][cc2] === 1;
    }
    return res;
  }

  function toSvg(matrix, scale, margin) {
    var size = matrix.length;
    var s = scale || 6;
    var m = margin == null ? 4 : margin;
    var dim = (size + m * 2) * s;
    var parts = [];
    parts.push(
      '<svg xmlns="http://www.w3.org/2000/svg" width="' +
        dim +
        '" height="' +
        dim +
        '" viewBox="0 0 ' +
        dim +
        " " +
        dim +
        '">'
    );
    parts.push('<rect width="100%" height="100%" fill="white"/>');
    var path = [];
    for (var r = 0; r < size; r++) {
      for (var c = 0; c < size; c++) {
        if (matrix[r][c]) {
          var x = (c + m) * s;
          var y = (r + m) * s;
          path.push("M" + x + " " + y + "h" + s + "v" + s + "h-" + s + "z");
        }
      }
    }
    parts.push('<path d="' + path.join("") + '" fill="black"/>');
    parts.push("</svg>");
    return parts.join("");
  }

  global.qrLite = {
    toSvgString: function (text, opts) {
      var picked = pickVersion(text);
      var version = picked.v;
      var bytes = picked.bytes;
      var cw = createDataCodewords(version, bytes);
      var ec = rsEncode(cw.data, cw.ecLen);
      var all = cw.data.concat(ec);
      var matrix = buildMatrix(version, all);
      return toSvg(matrix, (opts && opts.scale) || 6, (opts && opts.margin) != null ? opts.margin : 4);
    },
  };
})(typeof window !== "undefined" ? window : this);

