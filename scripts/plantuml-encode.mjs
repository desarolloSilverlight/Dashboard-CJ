import zlib from "zlib";

function encode6bit(b) {
  if (b < 10) return String.fromCharCode(48 + b);
  b -= 10;
  if (b < 26) return String.fromCharCode(65 + b);
  b -= 26;
  if (b < 26) return String.fromCharCode(97 + b);
  b -= 26;
  if (b === 0) return "-";
  if (b === 1) return "_";
  return "?";
}

function append3bytes(b1, b2, b3) {
  const c1 = b1 >> 2;
  const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
  const c3 = ((b2 & 0xf) << 2) | (b3 >> 6);
  const c4 = b3 & 0x3f;
  return encode6bit(c1) + encode6bit(c2) + encode6bit(c3) + encode6bit(c4);
}

/** PlantUML text encoding for plantuml.com / server */
export function encodePlantUML(text) {
  const zip = zlib.deflateRawSync(Buffer.from(text, "utf8"));
  let encoded = "";
  for (let i = 0; i < zip.length; i += 3) {
    const b1 = zip[i];
    const b2 = i + 1 < zip.length ? zip[i + 1] : 0;
    const b3 = i + 2 < zip.length ? zip[i + 2] : 0;
    encoded += append3bytes(b1, b2, b3);
  }
  return encoded;
}
