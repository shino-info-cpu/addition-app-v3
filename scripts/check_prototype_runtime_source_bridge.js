const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { canonicalSourcePath } = require("./lib/rule_master_source");

const appJsPath = path.resolve(__dirname, "../app/frontend/app.js");
const frontendSourceAssetPath = canonicalSourcePath;
const frontendSampleDataAssetPath = path.resolve(__dirname, "../app/frontend/prototype-sample-data.js");
const frontendCatalogAssetPath = path.resolve(__dirname, "../app/frontend/prototype-rule-catalog.js");
const frontendReportStateBridgeAssetPath = path.resolve(__dirname, "../app/frontend/report-state-bridge.js");
const frontendRuntimeAdapterAssetPath = path.resolve(__dirname, "../app/frontend/rule-runtime-adapter.js");
const frontendMasterDataBridgeAssetPath = path.resolve(__dirname, "../app/frontend/master-data-bridge.js");
const frontendJudgementEngineBridgeAssetPath = path.resolve(__dirname, "../app/frontend/judgement-engine-bridge.js");
const frontendApiRuntimeAdapterAssetPath = path.resolve(__dirname, "../app/frontend/api-runtime-adapter.js");
const frontendJudgementReportBridgeAssetPath = path.resolve(__dirname, "../app/frontend/judgement-report-bridge.js");
const frontendJudgementSessionBridgeAssetPath = path.resolve(__dirname, "../app/frontend/judgement-session-bridge.js");
const frontendSourceAsset = fs.readFileSync(frontendSourceAssetPath, "utf8");
const frontendSampleDataAsset = fs.readFileSync(frontendSampleDataAssetPath, "utf8");
const frontendCatalogAsset = fs.readFileSync(frontendCatalogAssetPath, "utf8");
const frontendReportStateBridgeAsset = fs.readFileSync(frontendReportStateBridgeAssetPath, "utf8");
const frontendRuntimeAdapterAsset = fs.readFileSync(frontendRuntimeAdapterAssetPath, "utf8");
const frontendMasterDataBridgeAsset = fs.readFileSync(frontendMasterDataBridgeAssetPath, "utf8");
const frontendJudgementEngineBridgeAsset = fs.readFileSync(frontendJudgementEngineBridgeAssetPath, "utf8");
const frontendApiRuntimeAdapterAsset = fs.readFileSync(frontendApiRuntimeAdapterAssetPath, "utf8");
const frontendJudgementReportBridgeAsset = fs.readFileSync(frontendJudgementReportBridgeAssetPath, "utf8");
const frontendJudgementSessionBridgeAsset = fs.readFileSync(frontendJudgementSessionBridgeAssetPath, "utf8");
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
vm.runInContext(frontendReportStateBridgeAsset, context);
vm.runInContext(frontendRuntimeAdapterAsset, context);
vm.runInContext(frontendMasterDataBridgeAsset, context);
vm.runInContext(frontendJudgementEngineBridgeAsset, context);
vm.runInContext(frontendApiRuntimeAdapterAsset, context);
vm.runInContext(frontendJudgementReportBridgeAsset, context);
vm.runInContext(frontendJudgementSessionBridgeAsset, context);
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
