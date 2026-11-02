// Exercise the browser-resolved SAX -> stream -> emitter path.
const sax = require('sax');
const {parseString} = require('browser-xml2js');
const events = [];
const stream = sax.createStream(true);
function dropped() { throw new Error('removed listener fired'); }
stream.on('opentag', dropped);
stream.removeListener('opentag', dropped);
stream.once('opentag', node => events.push('once:' + node.name));
stream.on('opentag', node => events.push('open:' + node.name));
stream.on('text', text => events.push('text:' + text));
stream.on('closetag', name => events.push('close:' + name));
stream.on('end', () => events.push('end'));
stream.write('<root><item>ok</item>');
stream.end('</root>');
const expected = ['once:root', 'open:root', 'open:item', 'text:ok', 'close:item', 'close:root', 'end'];
if (JSON.stringify(events) !== JSON.stringify(expected)) throw Error('SAX stream events differ: ' + JSON.stringify(events));
let parsed;
parseString('<Document><Object name="Part">ok</Object></Document>', (error, value) => {
  if (error) throw error;
  parsed = value;
});
if (parsed?.Document?.Object?.[0]?._ !== 'ok' || parsed.Document.Object[0].$.name !== 'Part') throw Error('XML parser result differs');
