# Object explorer browser regression

This standalone harness mounts the real SketchObjectExplorer with mock in-memory streams and exercises scrolling, selection, accessibility and DOM bounds without requiring an OCC engine. From the repository root, with npm dependencies installed:

```sh
OBJECT_EXPLORER_TEST_OUT=/tmp/jsketcher-explorer-test npx webpack --config test/coreTests/object-explorer-window/webpack.config.cjs
cp test/coreTests/object-explorer-window/index.html /tmp/jsketcher-explorer-test/
python3 -m http.server 19772 --bind 127.0.0.1 --directory /tmp/jsketcher-explorer-test &
PUPPETEER_CORE_PATH=/path/to/puppeteer-core node test/coreTests/object-explorer-window/browser.test.cjs
```

The browser test connects to a running Chromium CDP endpoint at 127.0.0.1:19255; override `CODI_TEST_CDP` and `OBJECT_EXPLORER_TEST_URL` as needed. `puppeteer-core` is a test runner dependency and is not bundled into the app. The harness uses mock object streams; separately test a real sketch for engine integration and performance.
