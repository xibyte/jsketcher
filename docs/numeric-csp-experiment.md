# Experimental numeric.js precompilation for embedded builds

The checked-in jSketcher dependency `numeric@1.2.6` generates functions and
runs `eval` at module initialization. This fails under the desktop's CSP, which
allows WebAssembly compilation but does not allow JavaScript `unsafe-eval`.
The default build remains unchanged. An explicit `CODI_EMBED_NUMERIC=1` build
can use an experimental generated numeric module:

```
node build/precompile-numeric.cjs
CODI_EMBED_NUMERIC=1 npm run build
CODI_EMBED_NUMERIC=1 ./node_modules/.bin/webpack --config test/webos/webpack.config.cjs
node test/webos/numeric-precompile.test.cjs
```

The generator accepts optional input and output paths and rejects any source
whose SHA-256 differs from
`5dcaba2016fd237091e3a17b0dc272fb21f0e2b15d7628f95a0ad0cd4cdf4020`.
It runs this trusted pinned source in a build-time Node VM, records its 308
initialization-time function-constructor signatures, evaluates finite-status
checks for its 19 fixed operators, and emits ordinary static JavaScript into
ignored `node_modules/.cache/codi-numeric/precompiled.js`. The source and
constructor lookup are deterministic for the tested Node version. No model,
user input, or browser data is supplied to that build. Runtime calls to a
factory with an unrecorded signature throw an explicit error; arbitrary code
strings are never compiled in the browser. This is therefore not a full
replacement for numeric.js's public dynamic factory API.

Node tests compare dense and sparse arithmetic, solve, inverse, determinant,
SVD, complex multiplication, gradient, tensor, reducers and mutation against
the pinned original, under `--disallow-code-generation-from-strings`. They
also verify modified source rejection, an unsupported factory error, and that
the alias is absent unless explicitly enabled. These cases do not prove
numerical equivalence for every solver, matrix shape, architecture, or CAD
operation. The generated module should not be used for unqualified engineering
or manufacturing work.

A local Chromium test applied the live website CSP to the jSketcher iframe and
used the experimental build to draw a rectangle, extrude it, save to a **mock**
account mirror, reopen in another temporary window, and reject malformed and
hostile expression inputs without a script side effect. Desktop and emulated
phone viewports passed. The iframe is same-origin and is not a security
boundary; these tests do not qualify all code paths, browser APIs, physical
touch, real login, server synchronization, or arbitrary hostile projects.

Numeric's packaged README says it is MIT licensed and refers to `license.txt`,
which is absent from the installed package. The source includes a David Bau
BSD notice and refers to `resources/LICENSE.quadprog`, which is also absent.
Obtain and independently verify the complete applicable source and dependency
license texts before distribution. This experiment does not clear those
obligations, OpenCascade provenance, or release authorization.
