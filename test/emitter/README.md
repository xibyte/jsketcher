The production webpack configuration aliases `emitter-component` to pinned
`component-emitter@1.1.3`. Its code is byte-identical to the old 1.1.1 package,
but the replacement is a separate upstream distribution with its MIT notice.
The old transitive package remains installed for `stream@0.0.2`; its metadata
must not be mistaken for the browser bundle's resolved dependency. This does
not establish legal clearance for other components.

After `npm ci --ignore-scripts`, prepare numeric and Manifold inputs as for the
normal local-only build, run `npm run build` with `CODI_EMBED_NUMERIC=1` and
`CODI_EMBED_MANIFOLD=1`, then run `node test/emitter/run-browser-regression.cjs`.
The test verifies both byte hashes and the replacement license, checks the
actual production bundle module names, and builds a temporary browser-target
SAX/XML test using the same resolver. It tests event listeners and XML parsing.
