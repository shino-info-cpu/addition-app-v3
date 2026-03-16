const fs = require("fs");
const path = require("path");
const vm = require("vm");

const appJsPath = path.resolve(__dirname, "../app/frontend/app.js");
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
vm.runInContext(source, context);

const cases = vm.runInContext(`
(() => {
  function setBase() {
    state.judgement.clientId = "1002";
    state.judgement.organizationId = "11";
    state.judgement.serviceId = "203";
    state.judgement.staffId = "502";
    state.judgement.targetMonth = "2026-03";
    state.judgement.historyRecords = getSampleJudgementHistoryRecords("1002", "2026-03");
  }

  setBase();
  state.judgement.answers = { monthType: "それ以外", placeType: "", actionType: "" };
  const monthOnly = buildJudgementSnapshot();

  setBase();
  state.judgement.answers = { monthType: "それ以外", placeType: "外出先", actionType: "" };
  const placeOnly = buildJudgementSnapshot();

  setBase();
  state.judgement.answers = { monthType: "それ以外", placeType: "外出先", actionType: "訪問" };
  const fullyAnswered = buildJudgementSnapshot();

  return [
    {
      name: "single candidate still asks placeType when unanswered",
      actual: monthOnly.currentQuestion ? monthOnly.currentQuestion.key : "",
      expected: "placeType",
    },
    {
      name: "single candidate still blocks save before placeType",
      actual: monthOnly.saveSummary,
      expected: "未完了: 対応した場所はどこですか",
    },
    {
      name: "single candidate still asks actionType after placeType",
      actual: placeOnly.currentQuestion ? placeOnly.currentQuestion.key : "",
      expected: "actionType",
    },
    {
      name: "post-check starts only after all visible questions answered",
      actual: fullyAnswered.saveSummary,
      expected: "自動確定で保存",
    },
  ];
})()
`, context);

const failures = cases.filter((testCase) => testCase.actual !== testCase.expected);

cases.forEach((testCase) => {
  const status = testCase.actual === testCase.expected ? "PASS" : "FAIL";
  console.log(`${status}: ${testCase.name}`);
});

if (failures.length > 0) {
  console.error(`\n${failures.length} prototype question-flow checks failed.`);
  process.exit(1);
}

console.log(`\nAll ${cases.length} prototype question-flow checks passed.`);
