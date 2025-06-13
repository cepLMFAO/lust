import fs from "fs-extra";

function toInt(blob) {
  const encodeBlob = (blob) =>
    blob.reduce(
      (output, elem) => output + elem.toString(16).padStart(2, "0"),
      ""
    );

  const splitIntoChunks = (str, size) => {
    const chunks = [];
    for (let i = 0; i < str.length; i += size) {
      chunks.push(str.slice(i, i + size));
    }
    return chunks;
  };

  const revertChunks = (str) => splitIntoChunks(str, 2).reverse().join("");

  return parseInt(revertChunks(encodeBlob(blob)), 16);
}

export default async function (input, output) {
  let pos = 0;
  const buffer = await fs.readFile(input);

  const ok = () => true;
  const seek = (newPos) => (pos = newPos) || true;
  const readInt = (size) => {
    let retval = toInt(buffer.subarray(pos, pos + size));
    pos = pos + size;
    return retval;
  };

  let flag, peOffset;
  const isValid =
    0x5a4d === readInt(2) &&
    seek(60) &&
    (peOffset = readInt(4)) &&
    peOffset < buffer.byteLength &&
    seek(peOffset) &&
    0x4550 === readInt(4) &&
    seek(peOffset + 20) &&
    0xf0 === (0x10 | readInt(2)) &&
    ok(readInt(2)) &&
    0x30b === (0x300 | readInt(2)) &&
    seek((flag = peOffset + (24 + 68))) &&
    3 === readInt(2) &&
    seek(flag);

  if (isValid) {
    buffer[pos] = 2;

    await fs.writeFile(output, buffer);

    return true;
  }
}
