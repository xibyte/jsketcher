# Sketch history browser regression

`sketch-history-browser.test.cjs` tests an isolated, already-built embedded CAD
runtime under the captured production CSP. It creates a real segment, tests
strict serialization and undo/redo, injects one incomplete load to check
rollback, and checks the active-tool guard with Chromium keyboard events. It
uses test helpers to start and complete a line; it does not test a physical
phone, host Files, account persistence, or every possible reconstruction error.

Use a disposable local build of this checkout, with its matching
`static/webosTest.bundle.js` built from `test/webos/webpack.config.cjs` and the
numeric CSP-safe precompile enabled (`CODI_EMBED_NUMERIC=1`). The helper is
only for testing and must not be published as an app asset. Serve the build
on loopback with the captured CSP header; the test compares the complete
header and fails if it differs. Start a separate test-only Chromium instance
with a loopback DevTools endpoint. Install `puppeteer-core` in the test
execution environment, set `NODE_PATH` to a directory containing it, or set
`PUPPETEER_CORE_PATH` to its module path.

For example, after preparing those prerequisites:

```sh
JSKETCHER_TEST_URL=http://127.0.0.1:19729/ \
CODI_TEST_CDP=http://127.0.0.1:19255 \
node test/webos/sketch-history-browser.test.cjs
```

Both endpoints are required to be loopback. The test closes its own browser
context, but does not stop the server or Chromium. The saved reference policy
can diverge from the actual deployed policy, so refresh it deliberately when
production CSP changes.
