# Spline history browser regression

`spline-history-browser.test.cjs` exercises interpolation and control-vertex
spline drawing, strict undo/redo and snapshot restoration under the captured
production CSP. Desktop also tests dragging a point on each spline. The
optional emulated-phone run uses touchscreen taps; it does not test physical
phone hardware or touch dragging. Snapshot restoration is not an account Files
or server-persistence test.

Prepare a disposable loopback-served build of this checkout with
`CODI_EMBED_NUMERIC=1`, and build the matching test-only
`static/webosTest.bundle.js` using `test/webos/webpack.config.cjs`. Do not
publish the helper. Serve the captured CSP header shown in the test and start
a separate Chromium instance with a loopback DevTools endpoint. Make
`puppeteer-core` resolvable using an installation, `NODE_PATH`, or the
`PUPPETEER_CORE_PATH` environment variable.

```sh
JSKETCHER_TEST_URL=http://127.0.0.1:19730/ CODI_TEST_CDP=http://127.0.0.1:19255 \
  node test/webos/spline-history-browser.test.cjs
CODI_PHONE=1 JSKETCHER_TEST_URL=http://127.0.0.1:19730/ CODI_TEST_CDP=http://127.0.0.1:19255 \
  node test/webos/spline-history-browser.test.cjs
```

The test creates and closes its own browser context; stop the server and
Chromium separately. Update the exact policy deliberately if production CSP
changes.
