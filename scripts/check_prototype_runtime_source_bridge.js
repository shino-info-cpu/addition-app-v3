const fs = require("fs");
const path = require("path");
const vm = require("vm");

const appJsPath = path.resolve(__dirname, "../app/frontend/app.js");
const frontendSourceAssetPath = path.resolve(__dirname, "../runtime/prototype/prototype-rule-source.js");
const frontendSampleDataAssetPath = path.resolve(__dirname, "../app/frontend/prototype-sample-data.js");
const frontendCatalogAssetPath = path.resolve(__dirname, "../app/frontend/prototype-rule-catalog.js");
const frontendRuntimeAdapterAssetPath = path.resolve(__dirname, "../app/frontend/rule-runtime-adapter.js");
const frontendSourceAsset = fs.readFileSync(frontendSourceAssetPath, "utf8");
const frontendSampleDataAsset = fs.readFileSync(frontendSampleDataAssetPath, "utf8");
const frontendCatalogAsset = fs.readFileSync(frontendCatalogAssetPath, "utf8");
const frontendRuntimeAdapterAsset = fs.readFileSync(frontendRuntimeAdapterAssetPath, "utf8");
const source = fs.readFileSync(appJsPath, "utf8");

function createElement() {
  return {
    value: "",
    textContent: "",
    innerHTML: "",
    title: "",
    disabled: false,
    dataset: {},
    className: "",
    style: {},
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {},
    querySelector() { return createElement(); },
    querySelectorAll() { return []; },
    appendChild() {},
    setAttribute() {},
  };
}

const context = {
  console,
  document: {
    querySelector() { return createElement(); },
    querySelectorAll() { return []; },
  },
  window: { confirm: () => true },
  localStorage: { getItem() { return null; }, setItem() {} },
  fetch: async () => ({ ok: false, status: 503, json: async () => ({ ok: false }), text: async () => "" }),
  setTimeout,
  clearTimeout,
  Date,
  JSON,
  Array,
  Object,
  String,
  Number,
  Boolean,
  RegExp,
  Math,
  Promise,
  URL,
};

vm.createContext(context);
vm.runInContext(frontendSourceAsset, context);
vm.runInContext(frontendSampleDataAsset, context);
vm.runInContext(frontendCatalogAsset, context);
vm.runInContext(frontendRuntimeAdapterAsset, context);
vm.runInContext(source, context);

const result = vm.runInContext(`
  (() => {
    const catalog = getPrototypeCatalog();
    const questions = getPrototypeCatalogQuestions();
    const additions = getPrototypeCatalogAdditions();
    const prototypeData = getPrototypeDataSource();
    return {
      questionCount: Array.isArray(catalog.questions) ? catalog.questions.length : -1,
      additionCount: Array.isArray(catalog.additions) ? catalog.additions.length : -1,
      sameQuestionArray: questions === catalog.questions,
      sameAdditionArray: additions === catalog.additions,
      samePrototypeData: __KASAN_PROTOTYPE_SAMPLE_DATA__.data === prototypeData,
      firstQuestionKey: catalog.questions?.[0]?.key ?? "",
      firstAdditionCode: catalog.additions?.[0]?.additionCode ?? "",
    };
  })()
`, context);

const expected = {
  questionCount: 11,
  additionCount: 26,
  sameQuestionArray: true,
  sameAdditionArray: true,
  samePrototypeData: true,
  firstQuestionKey: "monthType",
  firstAdditionCode: "mededu_tsuuin",
};

if (JSON.stringify(result) !== JSON.stringify(expected)) {
  console.error("[fail] prototype runtime source bridge");
  console.error(`  expected: ${JSON.stringify(expected)}`);
  console.error(`  actual:   ${JSON.stringify(result)}`);
  process.exit(1);
}

console.log("prototype-runtime-source-bridge: ok");
