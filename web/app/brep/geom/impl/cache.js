export default function cache(id, keys, obj, op) {
  id = '__cache__:' + id + ':' + keys.join('/');
  if (!obj[id]) {
    obj[id] = op();
  }
  return obj[id];
}
