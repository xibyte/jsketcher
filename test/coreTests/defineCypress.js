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
      ...ModesConfig[module.TEST_MODE]
    };
  });


  (hasOnly ? describe.only : describe)(groupName, () => {

    for (let test of tests) {
      (test.func.only ? it.only : it)(test.name, () => {
        cy.visit(test.startPage);

        cy.window().then(win => {
          cy.log("Core Test: " + test.funcName);
          return new Promise((resolve, reject) => {
            const subject = test.testSubject(win);
            const testEnv = new TestEnv(() => {
              cy.log("took: " + durationFormat(testEnv.took));
              resolve();
            });
            test.func(testEnv, subject);
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

