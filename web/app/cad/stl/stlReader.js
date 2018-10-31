import {parse as ParseASCII} from './stl-ascii-reader'
import {parse as ParseBinary} from './stl-binary-reader'

export function ParseStl(buf) {
  if(typeof buf === 'string') {
    return ParseASCII(buf);
  }
  
  // The other way is to check if file starts with 'solid' then it's ascii
  // WIKI: A binary STL file has an 80-character header (which is generally ignored, but should never begin with "solid" 
  // because that will lead most software to assume that this is an ASCII STL file

  const dataView = new DataView(buf);
  const triangleCount = dataView.getUint32(80, true);
  const expectedSize = 80 + 4 + triangleCount * ((4 * 3) * 4 + 2);
  
  if(expectedSize === buf.byteLength) {
    return [ParseBinary(dataView)];
  }

  return ParseASCII(buf);
}
