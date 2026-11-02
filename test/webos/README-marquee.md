# Area selection checks

The Select area sketch tool adapts the marquee concept from XanthiaJo's
upstream jSketcher PR #220 without changing the existing pan tools. Drag left
to right for objects whose bounds are fully contained; drag right to left for
objects whose bounds intersect. Shift adds to the current selection. Bounds
for arcs, ellipses, Béziers and B-splines are conservative: a box can include
space outside the actual curve. Unsupported items, ground objects and read-only
objects are not included. Pointer cancellation leaves the tool ready to retry;
Escape returns to the default tool.

Run the bounds unit check with `node test/coreTests/run-marquee-bounds.cjs`.
For `marquee-browser.test.cjs`, prepare a disposable build with
`CODI_EMBED_NUMERIC=1`, build its matching test-only `static/webosTest.bundle.js`
using `test/webos/webpack.config.cjs`, and serve the captured CSP on loopback.
Do not publish the helper. Start an isolated Chromium DevTools endpoint and make
`puppeteer-core` available via local install, `NODE_PATH` or
`PUPPETEER_CORE_PATH`.

```sh
JSKETCHER_TEST_URL=http://127.0.0.1:19734/ CODI_TEST_CDP=http://127.0.0.1:19255 \
  node test/webos/marquee-browser.test.cjs
CODI_PHONE=1 JSKETCHER_TEST_URL=http://127.0.0.1:19734/ CODI_TEST_CDP=http://127.0.0.1:19255 \
  node test/webos/marquee-browser.test.cjs
```

The browser checks actual embedded sketch mode, normal pan event delegation,
selection, cancellation and teardown. Phone testing uses emulated touch, not
physical hardware. Stop the server and test Chromium separately.
