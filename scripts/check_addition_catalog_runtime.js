const fs = require("fs");
const path = require("path");
const vm = require("vm");

const appJsPath = path.resolve(__dirname, "../app/frontend/app.js");
const frontendSampleDataAssetPath = path.resolve(__dirname, "../app/frontend/prototype-sample-data.js");
const frontendCatalogAssetPath = path.resolve(__dirname, "../app/frontend/prototype-rule-catalog.js");
const frontendRuntimeAdapterAssetPath = path.resolve(__dirname, "../app/frontend/rule-runtime-adapter.js");
const additionCatalogPath = path.resolve(__dirname, "../runtime/import/prototype_addition_catalog.json");
const branchRuleCatalogPath = path.resolve(__dirname, "../runtime/import/prototype_branch_rule_catalog.json");
const frontendSampleDataAsset = fs.readFileSync(frontendSampleDataAssetPath, "utf8");
const frontendCatalogAsset = fs.readFileSync(frontendCatalogAssetPath, "utf8");
const frontendRuntimeAdapterAsset = fs.readFileSync(frontendRuntimeAdapterAssetPath, "utf8");
const source = fs.readFileSync(appJsPath, "utf8");
const additionCatalog = JSON.parse(fs.readFileSync(additionCatalogPath, "utf8"));
const branchRuleCatalog = JSON.parse(fs.readFileSync(branchRuleCatalogPath, "utf8"));

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

const runtimeAdditions = context.__KASAN_PROTOTYPE_RULE_CATALOG__.additions;

function setMode(mode) {
  vm.runInContext(`
    state.dataSource.additions = ${JSON.stringify(mode)};
    state.ruleCatalog.additions = ${mode === "api" ? JSON.stringify(runtimeAdditions) : "[]"};
    state.dataSource.questions = "sample";
    state.ruleCatalog.questions = [];
  `, context);
}

function runScenario(script) {
  return vm.runInContext(`
    (() => {
      const baseAnswers = {
        monthType: "",
        placeType: "",
        actionType: "",
        hospitalAdmissionContext: "",
        requiredInfoReceived: "",
        dischargeFacilityStaffOnlyInfo: "",
        dischargeInpatientPeriodCount: "",
        initialAdditionPlanned: "",
        careManagerStart: "",
        employmentStart: "",
        serviceUseStartMonth: "",
      };
      ${script}
    })()
  `, context);
}

const scenarios = [
  {
    name: "sample mode candidate definitions are normalized to catalog-like shape",
    expected: {
      count: 26,
      allHaveConditionGroups: true,
      familyCode: "mededu",
      familyName: "医療・保育・教育機関等連携加算",
    },
    run: `
      const definitions = getActiveCandidateDefinitions();
      const mededuInfo = definitions.find((candidate) => candidate.additionCode === "mededu_info");
      return {
        count: definitions.length,
        allHaveConditionGroups: definitions.every((candidate) => Array.isArray(candidate.conditionGroups) && candidate.conditionGroups.length > 0),
        familyCode: mededuInfo ? mededuInfo.additionFamilyCode : "",
        familyName: mededuInfo ? mededuInfo.additionFamilyName : "",
      };
    `,
  },
  {
    name: "医保教（情報共有）の候補と後段結果が一致する",
    run: `
      state.judgement.clientId = "1001";
      state.judgement.organizationId = "21";
      state.judgement.serviceId = "301";
      state.judgement.staffId = "501";
      state.judgement.targetMonth = "2026-03";
      state.judgement.historyRecords = getSampleJudgementHistoryRecords("1001", "2026-03");
      state.judgement.answers = {
        ...baseAnswers,
        monthType: "計画作成月",
        placeType: "自事業所内",
        actionType: "情報共有",
      };
      const snapshot = buildJudgementSnapshot();
      return {
        candidates: snapshot.candidates.map((candidate) => candidate.additionCode),
        currentQuestion: snapshot.currentQuestion ? snapshot.currentQuestion.key : "",
        postCheckStatus: snapshot.postCheckStatus,
        postCheckSummary: snapshot.postCheckSummary,
        topRuleStatus: snapshot.topCandidate ? snapshot.topCandidate.ruleStatus : "",
        topConfirmedRules: snapshot.topCandidate ? snapshot.topCandidate.confirmedRules : [],
        topProvisionalRules: snapshot.topCandidate ? snapshot.topCandidate.provisionalRules : [],
      };
    `,
  },
  {
    name: "医保教（面談）で必要情報質問の出方が一致する",
    run: `
      state.judgement.clientId = "1001";
      state.judgement.organizationId = "11";
      state.judgement.serviceId = "202";
      state.judgement.staffId = "503";
      state.judgement.targetMonth = "2026-03";
      state.judgement.historyRecords = getSampleJudgementHistoryRecords("1001", "2026-03");
      state.judgement.answers = {
        ...baseAnswers,
        monthType: "モニタリング月",
        placeType: "外出先",
        actionType: "面談",
      };
      const snapshot = buildJudgementSnapshot();
      return {
        candidates: snapshot.candidates.map((candidate) => candidate.additionCode),
        currentQuestion: snapshot.currentQuestion ? snapshot.currentQuestion.key : "",
        saveSummary: snapshot.saveSummary,
        topRuleStatus: snapshot.topCandidate ? snapshot.topCandidate.ruleStatus : "",
        topConfirmedRules: snapshot.topCandidate ? snapshot.topCandidate.confirmedRules : [],
        topProvisionalRules: snapshot.topCandidate ? snapshot.topCandidate.provisionalRules : [],
      };
    `,
  },
  {
    name: "退院・退所で利用開始月質問の出方が一致する",
    run: `
      state.judgement.clientId = "1001";
      state.judgement.organizationId = "21";
      state.judgement.serviceId = "301";
      state.judgement.staffId = "501";
      state.judgement.targetMonth = "2026-02";
      state.judgement.historyRecords = getSampleJudgementHistoryRecords("1001", "2026-02");
      state.judgement.answers = {
        ...baseAnswers,
        monthType: "それ以外",
        placeType: "自事業所内",
        actionType: "面談",
        requiredInfoReceived: "受けた",
      };
      const snapshot = buildJudgementSnapshot();
      return {
        candidates: snapshot.candidates.map((candidate) => candidate.additionCode),
        currentQuestion: snapshot.currentQuestion ? snapshot.currentQuestion.key : "",
        topRuleStatus: snapshot.topCandidate ? snapshot.topCandidate.ruleStatus : "",
        topConfirmedRules: snapshot.topCandidate ? snapshot.topCandidate.confirmedRules : [],
        topProvisionalRules: snapshot.topCandidate ? snapshot.topCandidate.provisionalRules : [],
      };
    `,
  },
  {
    name: "集中支援（病院情報共有）で入院文脈分岐が一致する",
    run: `
      state.judgement.clientId = "1003";
      state.judgement.organizationId = "21";
      state.judgement.serviceId = "301";
      state.judgement.staffId = "501";
      state.judgement.targetMonth = "2026-01";
      state.judgement.historyRecords = getSampleJudgementHistoryRecords("1003", "2026-01");
      state.judgement.answers = {
        ...baseAnswers,
        monthType: "それ以外",
        placeType: "自事業所内",
        actionType: "情報共有",
        hospitalAdmissionContext: "入院に当たっていない",
      };
      const snapshot = buildJudgementSnapshot();
      return {
        candidates: snapshot.candidates.map((candidate) => candidate.additionCode),
        currentQuestion: snapshot.currentQuestion ? snapshot.currentQuestion.key : "",
        topRuleStatus: snapshot.topCandidate ? snapshot.topCandidate.ruleStatus : "",
        topConfirmedRules: snapshot.topCandidate ? snapshot.topCandidate.confirmedRules : [],
        topProvisionalRules: snapshot.topCandidate ? snapshot.topCandidate.provisionalRules : [],
      };
    `,
  },
  {
    name: "保・教支援（情報共有）が障害福祉サービス文脈では残らないことが一致する",
    run: `
      const candidate = getActiveCandidateDefinitions().find((item) => item.additionCode === "edu_info");
      return {
        matches: candidateMatches(candidate, {
          targetType: "児",
          organizationGroup: "福祉サービス等提供機関",
          organizationType: "学校",
          serviceDecisionCategories: ["障害福祉サービス"],
          answers: { ...baseAnswers },
          monthType: "計画作成月",
          placeType: "自事業所内",
          actionType: "情報共有",
        }),
      };
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

console.log(`addition-catalog-runtime: ok (${scenarios.length}/${scenarios.length})`);
