const fs = require("fs");
const path = require("path");
const vm = require("vm");

const appJsPath = path.resolve(__dirname, "../app/frontend/app.js");
const frontendSampleDataAssetPath = path.resolve(__dirname, "../app/frontend/prototype-sample-data.js");
const frontendCatalogAssetPath = path.resolve(__dirname, "../app/frontend/prototype-rule-catalog.js");
const frontendRuntimeAdapterAssetPath = path.resolve(__dirname, "../app/frontend/rule-runtime-adapter.js");
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
vm.runInContext(frontendSampleDataAsset, context);
vm.runInContext(frontendCatalogAsset, context);
vm.runInContext(frontendRuntimeAdapterAsset, context);
vm.runInContext(source, context);

const scenarios = [
  {
    name: "prototype fallback label is shown when both catalogs are sample",
    script: `
      state.dataSource.apiBaseUrl = "";
      state.dataSource.configReady = false;
      state.dataSource.note = "";
      state.dataSource.questions = "sample";
      state.dataSource.additions = "sample";
      updateRuleRuntimeStatusPill();
      return { text: dom.ruleRuntimeStatus.textContent, title: dom.ruleRuntimeStatus.title };
    `,
    assert(result) {
      return result.text === "判定catalog: prototype";
    },
  },
  {
    name: "DB label is shown when both catalogs are api",
    script: `
      state.dataSource.apiBaseUrl = "https://example.test/api";
      state.dataSource.configReady = true;
      state.dataSource.note = "";
      state.dataSource.questions = "api";
      state.dataSource.additions = "api";
      state.ruleCatalog.questions = [{ key: "monthType" }];
      state.ruleCatalog.additions = [{ additionCode: "mededu_info" }];
      updateRuleRuntimeStatusPill();
      return { text: dom.ruleRuntimeStatus.textContent, title: dom.ruleRuntimeStatus.title };
    `,
    assert(result) {
      return result.text === "判定catalog: DB正本"
        && result.title.includes("設問=DB正本")
        && result.title.includes("加算=DB正本");
    },
  },
  {
    name: "mixed label is shown when only one catalog is api",
    script: `
      state.dataSource.apiBaseUrl = "https://example.test/api";
      state.dataSource.configReady = true;
      state.dataSource.note = "設問catalog未投入";
      state.dataSource.questions = "sample";
      state.dataSource.additions = "api";
      state.ruleCatalog.questions = [];
      state.ruleCatalog.additions = [{ additionCode: "mededu_info" }];
      updateRuleRuntimeStatusPill();
      return { text: dom.ruleRuntimeStatus.textContent, title: dom.ruleRuntimeStatus.title };
    `,
    assert(result) {
      return result.text === "判定catalog: 一部DB / 一部prototype"
        && result.title.includes("設問=prototype")
        && result.title.includes("加算=DB正本")
        && result.title.includes("設問catalog未投入");
    },
  },
  {
    name: "api flag only without catalog items falls back to prototype label",
    script: `
      state.dataSource.apiBaseUrl = "https://example.test/api";
      state.dataSource.configReady = true;
      state.dataSource.note = "";
      state.dataSource.questions = "api";
      state.dataSource.additions = "api";
      state.ruleCatalog.questions = [];
      state.ruleCatalog.additions = [];
      updateRuleRuntimeStatusPill();
      return { text: dom.ruleRuntimeStatus.textContent, title: dom.ruleRuntimeStatus.title };
    `,
    assert(result) {
      return result.text === "判定catalog: prototype fallback"
        && result.title.includes("設問=prototype")
        && result.title.includes("加算=prototype");
    },
  },
];

let failures = 0;

for (const scenario of scenarios) {
  const result = vm.runInContext(`(() => { ${scenario.script} })()`, context);
  if (!scenario.assert(result)) {
    failures += 1;
    console.error(`[fail] ${scenario.name}`);
    console.error(JSON.stringify(result, null, 2));
  } else {
    console.log(`[pass] ${scenario.name}`);
  }
}

if (failures > 0) {
  process.exit(1);
}

console.log(`rule-runtime-status: ok (${scenarios.length}/${scenarios.length})`);
