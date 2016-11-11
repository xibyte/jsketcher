import {parse as ParseASCII} from './stl-ascii-reader'
import {parse as ParseBinary} from './stl-binary-reader'

export function ParseStl(buf) {
  if(typeof buf === 'string') {
    return ParseASCII(buf);
  }

  //var triangleCount = buf.readUInt32LE(80);
  //var expectedSize = 80 + 4 + triangleCount * ((4 * 3) * 4 + 2);
  //
  //if(expectedSize === buf.length) {
  //  return parseBinary(buf);
  //}

  return ParseASCII(buf);
}
