const fs = require("fs");
const path = require("path");
const vm = require("vm");

const appJsPath = path.resolve(__dirname, "../app/frontend/app.js");
const frontendSampleDataAssetPath = path.resolve(__dirname, "../app/frontend/prototype-sample-data.js");
const frontendCatalogAssetPath = path.resolve(__dirname, "../app/frontend/prototype-rule-catalog.js");
const frontendRuntimeAdapterAssetPath = path.resolve(__dirname, "../app/frontend/rule-runtime-adapter.js");
const catalogPath = path.resolve(__dirname, "../runtime/import/prototype_question_catalog.json");
const frontendSampleDataAsset = fs.readFileSync(frontendSampleDataAssetPath, "utf8");
const frontendCatalogAsset = fs.readFileSync(frontendCatalogAssetPath, "utf8");
const frontendRuntimeAdapterAsset = fs.readFileSync(frontendRuntimeAdapterAssetPath, "utf8");
const source = fs.readFileSync(appJsPath, "utf8");
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

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

const runtimeQuestions = context.__KASAN_PROTOTYPE_RULE_CATALOG__.questions;

function setMode(mode) {
  vm.runInContext(`
    state.dataSource.questions = ${JSON.stringify(mode)};
    state.ruleCatalog.questions = ${mode === "api" ? JSON.stringify(runtimeQuestions) : "[]"};
  `, context);
}

function runScenario(script) {
  return vm.runInContext(`
    (() => {
      ${script}
    })()
  `, context);
}

const scenarios = [
  {
    name: "sample mode question definitions are normalized to runtime shape",
    expected: {
      count: 11,
      actionVisibilityMode: "answer_rules",
      actionOptionCount: 8,
      serviceUseStartMonthSingleCandidateOnly: true,
      actionUsesLegacyFunctions: false,
    },
    run: `
      const questions = getActiveQuestionDefinitions();
      const actionType = questions.find((question) => question.key === "actionType");
      const serviceUseStartMonth = questions.find((question) => question.key === "serviceUseStartMonth");
      return {
        count: questions.length,
        actionVisibilityMode: actionType ? actionType.visibilityMode : "",
        actionOptionCount: Array.isArray(actionType?.options) ? actionType.options.length : 0,
        serviceUseStartMonthSingleCandidateOnly: Boolean(serviceUseStartMonth?.visibilityConfig?.singleCandidateOnly),
        actionUsesLegacyFunctions: typeof actionType?.visibleWhen === "function" || typeof actionType?.getOptions === "function",
      };
    `,
  },
  {
    name: "placeType 未回答では actionType は表示されない",
    run: `
      state.judgement.clientId = "1002";
      state.judgement.organizationId = "11";
      state.judgement.serviceId = "203";
      state.judgement.staffId = "502";
      state.judgement.targetMonth = "2026-03";
      state.judgement.historyRecords = getSampleJudgementHistoryRecords("1002", "2026-03");
      state.judgement.answers = { monthType: "それ以外", placeType: "", actionType: "" };
      return getVisibleQuestions().map((question) => question.key);
    `,
  },
  {
    name: "自事業所内では actionType の外出先専用選択肢が出ない",
    run: `
      state.judgement.clientId = "1002";
      state.judgement.organizationId = "11";
      state.judgement.serviceId = "203";
      state.judgement.staffId = "502";
      state.judgement.targetMonth = "2026-03";
      state.judgement.historyRecords = getSampleJudgementHistoryRecords("1002", "2026-03");
      state.judgement.answers = { monthType: "それ以外", placeType: "自事業所内", actionType: "" };
      const question = getVisibleQuestions().find((item) => item.key === "actionType");
      return getQuestionDisplayOptions(question).map((option) => option.value);
    `,
  },
  {
    name: "外出先では actionType の訪問系選択肢が出る",
    run: `
      state.judgement.clientId = "1001";
      state.judgement.organizationId = "21";
      state.judgement.serviceId = "301";
      state.judgement.staffId = "501";
      state.judgement.targetMonth = "2026-03";
      state.judgement.historyRecords = getSampleJudgementHistoryRecords("1001", "2026-03");
      state.judgement.answers = { monthType: "モニタリング月", placeType: "外出先", actionType: "" };
      const question = getVisibleQuestions().find((item) => item.key === "actionType");
      return getQuestionDisplayOptions(question).map((option) => option.value);
    `,
  },
  {
    name: "退院退所で利用開始月質問の表示条件が一致する",
    run: `
      state.judgement.clientId = "1001";
      state.judgement.organizationId = "21";
      state.judgement.serviceId = "301";
      state.judgement.staffId = "501";
      state.judgement.targetMonth = "2026-02";
      state.judgement.historyRecords = getSampleJudgementHistoryRecords("1001", "2026-02");
      state.judgement.answers = {
        monthType: "それ以外",
        placeType: "外出先",
        actionType: "面談",
        requiredInfoReceived: "受けた",
      };
      return getVisibleQuestions().map((question) => question.key);
    `,
  },
];

let failures = 0;

for (const scenario of scenarios) {
  setMode("sample");
  const sampleResult = runScenario(scenario.run);
  const sampleSerialized = JSON.stringify(sampleResult);

  if (scenario.expected) {
    const expectedSerialized = JSON.stringify(scenario.expected);
    if (sampleSerialized !== expectedSerialized) {
      failures += 1;
      console.error(`[fail] ${scenario.name}`);
      console.error(`  expected: ${expectedSerialized}`);
      console.error(`  actual:   ${sampleSerialized}`);
    } else {
      console.log(`[pass] ${scenario.name}`);
    }
    continue;
  }

  setMode("api");
  const apiResult = runScenario(scenario.run);
  const apiSerialized = JSON.stringify(apiResult);
  if (sampleSerialized !== apiSerialized) {
    failures += 1;
    console.error(`[fail] ${scenario.name}`);
    console.error(`  sample: ${sampleSerialized}`);
    console.error(`  api:    ${apiSerialized}`);
  } else {
    console.log(`[pass] ${scenario.name}`);
  }
}

if (failures > 0) {
  process.exit(1);
}

console.log(`question-catalog-runtime: ok (${scenarios.length}/${scenarios.length})`);
