export default function camelCaseSplit(str) {
  function isUpperCase(str) {
    return str.toUpperCase() === str;
  }

  const words = [];
  let word = '';

  for (let i = 0; i < str.length; i++) {
    const c = str.charAt(i);
    if (c === '_' || c === '-') {
      continue;
    }
    const dot = c === '.';
    if ((dot || isUpperCase(c)) && word.length !== 0) {
      words.push(word);
      word = '';
    }
    if (!dot) word += c;
  }
  if (word.length !== 0){
    words.push(word);
  }
  return words;
}
