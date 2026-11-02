# Dimension cancellation and face-selection checks

These isolated browser regressions cover the safe adaptation of NetzerRosenfeld's
jSketcher PR #204 and the existing xia0hj PR #209 selection fix. They use a real
embedded CAD build, the test-only `webosTest.bundle.js`, captured production
CSP, and a separate loopback Chromium DevTools endpoint. They create their own
browser context and do not test physical touch or host account Files.

Prepare a disposable build with `CODI_EMBED_NUMERIC=1`, build the matching test
helper using `test/webos/webpack.config.cjs`, and serve both on loopback with
the CSP header embedded in the tests. Do not publish the helper. Make
`puppeteer-core` available through the local installation, `NODE_PATH`, or
`PUPPETEER_CORE_PATH`. For example:

```sh
JSKETCHER_TEST_URL=http://127.0.0.1:19731/ CODI_TEST_CDP=http://127.0.0.1:19255 \
  node test/webos/dimension-cancel-browser.test.cjs
JSKETCHER_TEST_URL=http://127.0.0.1:19731/ CODI_TEST_CDP=http://127.0.0.1:19255 \
  node test/webos/multiple-face-selection-browser.test.cjs
```

The first test uses real tool handlers and a trusted Escape key, checking all
three distance tools, selection preservation, and completed geometry. The
second creates a real box and drives its selection service through multi-face,
exclusive and marking-session changes. It does not simulate mouse picking.
Stop the test server and Chromium separately.
