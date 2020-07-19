
export class TestEnv {

  constructor(startingPage, navigate, callback) {
    this.currentPage = startingPage;
    this.navigateImpl = navigate;
    this.callback = callback;
    this.failed = false;
    this.finished = false;
    this.error = undefined;
    this.took = performance.now()
  }

  navigate(page) {
    this.currentPage = page;
    return this.navigateImpl(page);
  }

  done() {
    if (this.finished) {
      return;
    }
    this.finished = true;
    this.took = performance.now() - this.took;
    this.callback(this);
  }

  test(testBlock) {
    testBlock.apply(this, arguments);
  }

}

