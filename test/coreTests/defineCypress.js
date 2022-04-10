import {camelCaseSplitToStr} from "gems/camelCaseSplit";
import {TestEnv} from "./test";
import {ModesConfig} from "./modes";

export function defineCypressTests(groupName, module) {

  if (!module.TEST_MODE) {
    throw 'modules should have a mode defined';
  }

  let hasOnly = false;
  const tests = Object.keys(module).filter(key => key.startsWith('test')).map(key => {
    const func = module[key];
    if (func.only) {
      hasOnly = true;
    }
    return {
      name: camelCaseSplitToStr(key.substring("test".length)),
      funcName: key,
      func,
      ...ModesConfig[module.TEST_MODE],
    };
  });

  if (!hasOnly) {
    hasOnly = !!module.only;
  }


  (hasOnly ? describe.only : describe)(groupName, () => {

    for (let test of tests) {
      (test.func.only ? it.only : it)(test.name, () => {
        cy.log("Core Test: " + test.funcName);
        cy.visit(test.startPage);

        cy.window().then(win => {
          return new Promise((resolve, reject) => {
            const subject = test.testSubject(win);

            const onDone = () => {
              cy.log("took: " + durationFormat(testEnv.took));
              resolve();
            };

            const navigate = url => {
              return new Promise((resolve) => {
                cy.visit(url, {
                  onLoad: (contentWindow) => {
                    resolve(contentWindow);
                  }
                });
              });
            };

            const testEnv = new TestEnv(test.startPage, navigate, onDone);

            test.loadStream(win).attach(ready => {
              if (ready) {
                test.func(testEnv, subject)
                  .then(onDone)
                  .catch(reject);
              }
            });
          });
        })
      });
    }
  })
}

function durationFormat(millis){
  function fixed(v) {
    return v.toFixed(2);
  }
  if (millis < 1000) {
    return fixed(millis) + "ms";
  } else {
    return fixed(millis / 1000) + "s";
  }
}

