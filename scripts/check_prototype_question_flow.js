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
  state.judgement.answers = { monthType: "", placeType: "", actionType: "" };
  const beforeAnswers = buildJudgementSnapshot();

  setBase();
  state.judgement.answers = { monthType: "それ以外", placeType: "", actionType: "" };
  const monthOnly = buildJudgementSnapshot();

  setBase();
  state.judgement.answers = { monthType: "それ以外", placeType: "外出先", actionType: "" };
  const placeOnly = buildJudgementSnapshot();

  setBase();
  state.judgement.answers = { monthType: "それ以外", placeType: "外出先", actionType: "訪問" };
  const fullyAnswered = buildJudgementSnapshot();
  setBase();
  state.judgement.answers = { monthType: "それ以外", placeType: "自事業所内", actionType: "担当者会議開催" };
  const intensiveMeetingHostAnswered = buildJudgementSnapshot();
  setBase();
  state.judgement.answers = { monthType: "それ以外", placeType: "自事業所内", actionType: "情報共有" };
  const intensiveInfoAnswered = buildJudgementSnapshot();
  setBase();
  state.judgement.answers = { monthType: "それ以外", placeType: "自事業所内", actionType: "会議" };
  const intensiveMeetingAnswered = buildJudgementSnapshot();

  state.judgement.clientId = "1001";
  state.judgement.organizationId = "21";
  state.judgement.serviceId = "301";
  state.judgement.staffId = "501";
  state.judgement.targetMonth = "2026-03";
  state.judgement.historyRecords = getSampleJudgementHistoryRecords("1001", "2026-03");
  state.judgement.answers = { monthType: "モニタリング月", placeType: "外出先", actionType: "" };
  const hospitalActionQuestion = getVisibleQuestions().find((question) => question.key === "actionType");
  const hospitalActionOptions = getQuestionDisplayOptions(hospitalActionQuestion).map((item) => item.value);
  state.judgement.answers.actionType = "情報共有";
  const hospitalAdmissionQuestion = buildJudgementSnapshot();
  state.judgement.answers.hospitalAdmissionContext = "入院に当たっている";
  const hospitalAnswered = buildJudgementSnapshot();
  state.judgement.answers.hospitalAdmissionContext = "入院に当たっていない";
  const hospitalAdmissionNo = buildJudgementSnapshot();
  state.judgement.serviceId = "202";
  state.judgement.answers = { monthType: "計画作成月", placeType: "外出先", actionType: "情報共有" };
  const hospitalWelfareAdmissionQuestion = buildJudgementSnapshot();
  state.judgement.answers.hospitalAdmissionContext = "入院に当たっている";
  const hospitalWelfareAnswered = buildJudgementSnapshot();
  state.judgement.serviceId = "301";
  state.judgement.answers = { monthType: "それ以外", placeType: "自事業所内", actionType: "情報共有" };
  const hospitalIntensiveAdmissionQuestion = buildJudgementSnapshot();
  state.judgement.answers.hospitalAdmissionContext = "入院に当たっていない";
  const hospitalIntensiveNo = buildJudgementSnapshot();
  state.judgement.answers.hospitalAdmissionContext = "入院に当たっている";
  const hospitalIntensiveYes = buildJudgementSnapshot();
  state.masters.organizations = [
    { organizationId: "24", organizationName: "しののめ薬局", organizationType: "薬局", organizationGroup: "病院・訪看・薬局グループ", serviceIds: ["303"] },
  ];
  state.masters.services = [
    { serviceId: "303", serviceName: "薬局連携", serviceCategory: "医療", targetScope: "児者", groupName: "薬局群" },
  ];
  state.dataSource.clients = "api";
  state.dataSource.organizations = "api";
  state.dataSource.services = "api";
  state.judgement.organizationId = "24";
  state.judgement.serviceId = "303";
  state.judgement.answers = { monthType: "それ以外", placeType: "自事業所内", actionType: "情報共有" };
  const pharmacyIntensiveInfo = buildJudgementSnapshot();
  state.masters.organizations = getPrototypeDataSource().organizations;
  state.masters.services = getPrototypeDataSource().services;
  state.judgement.organizationId = "21";
  state.judgement.serviceId = "301";
  state.judgement.answers = { monthType: "それ以外", placeType: "外出先", actionType: "通院同行" };
  const hospitalIntensiveTsuuinAnswered = buildJudgementSnapshot();
  state.judgement.answers = { monthType: "モニタリング月", placeType: "外出先", actionType: "通院同行" };
  const hospitalTsuuinAnswered = buildJudgementSnapshot();

  state.masters.clients = [
    { clientId: "c-mededu", clientName: "医保教確認", clientNameKana: "いほきょうかくにん", targetType: "児" },
  ];
  state.masters.organizations = [
    { organizationId: "o-mededu", organizationName: "しののめ福祉連携先", organizationType: "福祉サービス提供機関", organizationGroup: "福祉サービス等提供機関", serviceIds: ["s-mededu"] },
  ];
  state.masters.services = [
    { serviceId: "s-mededu", serviceName: "福祉連携", serviceCategory: "福祉", targetScope: "児者", groupName: "福祉群" },
  ];
  state.dataSource.clients = "api";
  state.dataSource.organizations = "api";
  state.dataSource.services = "api";
  state.judgement.clientId = "c-mededu";
  state.judgement.organizationId = "o-mededu";
  state.judgement.serviceId = "s-mededu";
  state.judgement.staffId = "501";
  state.judgement.targetMonth = "2026-02";
  state.judgement.historyRecords = [];
  state.judgement.answers = { monthType: "計画作成月", placeType: "外出先", actionType: "面談" };
  const mededuInfoQuestion = buildJudgementSnapshot();
  state.judgement.answers.requiredInfoReceived = "受けた";
  const mededuFacilityQuestion = buildJudgementSnapshot();
  state.judgement.answers.dischargeFacilityStaffOnlyInfo = "施設職員以外も含む";
  const mededuInitialQuestion = buildJudgementSnapshot();
  state.judgement.answers.initialAdditionPlanned = "初回加算なし";
  const mededuInitialNo = buildJudgementSnapshot();
  state.judgement.answers.initialAdditionPlanned = "初回加算あり";
  const mededuInitialYes = buildJudgementSnapshot();
  state.judgement.answers = {
    monthType: "計画作成月",
    placeType: "外出先",
    actionType: "面談",
    requiredInfoReceived: "受けた",
    dischargeFacilityStaffOnlyInfo: "施設職員のみ",
    initialAdditionPlanned: "初回加算なし",
  };
  const mededuFacilityOnly = buildJudgementSnapshot();
  state.masters.organizations = [
    { organizationId: "o-consult-mededu", organizationName: "しののめ相談支援室", organizationType: "相談支援事業所", organizationGroup: "福祉サービス等提供機関", serviceIds: ["s-consult-mededu"] },
  ];
  state.masters.services = [
    { serviceId: "s-consult-mededu", serviceName: "計画相談", serviceCategory: "相談支援", targetScope: "児者", groupName: "初回群" },
  ];
  state.judgement.organizationId = "o-consult-mededu";
  state.judgement.serviceId = "s-consult-mededu";
  state.judgement.answers = { monthType: "計画作成月", placeType: "外出先", actionType: "面談" };
  const mededuInterviewConsultationContext = buildJudgementSnapshot();
  state.judgement.answers = { monthType: "計画作成月", placeType: "自事業所内", actionType: "会議" };
  const mededuMeetingConsultationContext = buildJudgementSnapshot();

  state.masters.organizations = [
    { organizationId: "o-mededu", organizationName: "しののめ福祉連携先", organizationType: "福祉サービス提供機関", organizationGroup: "福祉サービス等提供機関", serviceIds: ["s-mededu"] },
  ];
  state.masters.services = [
    { serviceId: "s-mededu", serviceName: "福祉連携", serviceCategory: "福祉", targetScope: "児者", groupName: "福祉群" },
  ];
  state.judgement.organizationId = "o-mededu";
  state.judgement.serviceId = "s-mededu";
  state.judgement.targetMonth = "2026-03";
  state.judgement.historyRecords = [
    { recordId: "hm1", clientId: "c-mededu", targetMonth: "2026-03", organizationId: "o-mededu", serviceId: "s-mededu", additionCode: "mededu_interview", additionName: "医療・保育・教育機関等連携加算（面談）", actionType: "面談" },
  ];
  state.judgement.answers = {
    monthType: "計画作成月",
    placeType: "外出先",
    actionType: "面談",
    requiredInfoReceived: "受けた",
    dischargeFacilityStaffOnlyInfo: "施設職員以外も含む",
    initialAdditionPlanned: "初回加算なし",
  };
  const mededuInterviewSameServiceLimit = buildJudgementSnapshot();
  state.judgement.historyRecords = [
    { recordId: "hm1", clientId: "c-mededu", targetMonth: "2026-03", organizationId: "o-mededu", serviceId: "s-other", additionCode: "mededu_interview", additionName: "医療・保育・教育機関等連携加算（面談）", actionType: "面談" },
  ];
  const mededuInterviewOtherServiceLimit = buildJudgementSnapshot();

  state.judgement.clientId = "1001";
  state.judgement.organizationId = "21";
  state.judgement.serviceId = "301";
  state.judgement.staffId = "501";
  state.judgement.targetMonth = "2026-02";
  state.judgement.historyRecords = getSampleJudgementHistoryRecords("1001", "2026-02");
  state.judgement.answers = { monthType: "それ以外", placeType: "外出先", actionType: "面談" };
  const dischargeInfoQuestion = buildJudgementSnapshot();
  state.judgement.answers.requiredInfoReceived = "受けた";
  const dischargeStartMonthQuestion = buildJudgementSnapshot();
  state.judgement.answers.serviceUseStartMonth = "開始月である";
  const dischargePeriodCountQuestion = buildJudgementSnapshot();
  state.judgement.answers.dischargeInpatientPeriodCount = "2回目";
  const dischargePeriodCountOk = buildJudgementSnapshot();
  state.judgement.answers.initialAdditionPlanned = "初回加算なし";
  const dischargeReadyToSave = buildJudgementSnapshot();
  state.judgement.serviceId = "201";
  state.judgement.answers = { monthType: "それ以外", placeType: "外出先", actionType: "面談" };
  const dischargeConsultationDropped = buildJudgementSnapshot();
  state.judgement.serviceId = "301";
  state.judgement.answers = { monthType: "それ以外", placeType: "外出先", actionType: "面談", serviceUseStartMonth: "開始月ではない" };
  const dischargeStartMonthNo = buildJudgementSnapshot();

  state.dataSource.clients = "sample";
  state.dataSource.organizations = "sample";
  state.dataSource.services = "sample";
  state.judgement.clientId = "1003";
  state.judgement.organizationId = "10";
  state.judgement.serviceId = "201";
  const consultationOnlyOrganizations = getSelectableOrganizationsForJudgement("1003").map((item) => item.organizationId);
  const consultationOnlyServices = getSelectableServicesForJudgement("1003", "10").map((item) => item.serviceId);
  const consultationOnlySnapshot = buildJudgementSnapshot();

  state.masters.clients = [
    { clientId: "c-filter", clientName: "判定対象確認", clientNameKana: "はんていたいしょうかくにん", targetType: "児" },
  ];
  state.masters.organizations = [
    { organizationId: "o-consult", organizationName: "しののめ相談支援室", organizationType: "相談支援事業所", organizationGroup: "福祉サービス等提供機関" },
    { organizationId: "o-school-filter", organizationName: "しののめ小学校", organizationType: "学校", organizationGroup: "福祉サービス等提供機関" },
  ];
  state.masters.services = [
    { serviceId: "s-consult", serviceName: "計画相談", serviceCategory: "相談支援", targetScope: "児者", groupName: "初回群" },
    { serviceId: "s-school-filter", serviceName: "学校連携", serviceCategory: "福祉", targetScope: "児者", groupName: "学校群" },
  ];
  state.relations.organizationServicesByOrganizationId = {
    "o-consult": [],
    "o-school-filter": [],
  };
  state.dataSource.clients = "api";
  state.dataSource.organizations = "api";
  state.dataSource.services = "api";
  const filteredOrganizationsWithoutRelations = getSelectableOrganizationsForJudgement("c-filter").map((item) => item.organizationId);

  state.masters.clients = [
    { clientId: "c-school", clientName: "児童A", clientNameKana: "じどうえー", targetType: "児" },
  ];
  state.masters.organizations = [
    { organizationId: "o-school", organizationName: "しののめ小学校", organizationType: "学校", organizationGroup: "福祉サービス等提供機関", serviceIds: ["s-school"] },
  ];
  state.masters.services = [
    { serviceId: "s-school", serviceName: "学校連携", serviceCategory: "福祉", targetScope: "児者", groupName: "学校群" },
  ];
  state.dataSource.clients = "api";
  state.dataSource.organizations = "api";
  state.dataSource.services = "api";
  state.judgement.clientId = "c-school";
  state.judgement.organizationId = "o-school";
  state.judgement.serviceId = "s-school";
  state.judgement.staffId = "501";
  state.judgement.targetMonth = "2026-03";
  state.judgement.historyRecords = [];
  state.judgement.answers = { monthType: "それ以外", placeType: "外出先", actionType: "面談" };
  const schoolInterviewAnswered = buildJudgementSnapshot();
  state.judgement.answers = { monthType: "それ以外", placeType: "自事業所内", actionType: "会議" };
  const schoolMeetingAnswered = buildJudgementSnapshot();
  state.masters.organizations = [
    { organizationId: "o-school", organizationName: "しののめ小学校", organizationType: "学校", organizationGroup: "福祉サービス等提供機関", serviceIds: ["s-school"] },
    { organizationId: "o-edu-work", organizationName: "しののめ企業", organizationType: "企業", organizationGroup: "福祉サービス等提供機関", serviceIds: ["s-school"] },
  ];
  state.judgement.organizationId = "o-edu-work";
  state.judgement.answers = { monthType: "計画作成月", placeType: "自事業所内", actionType: "情報共有" };
  const eduWorkInfoNeedsEmploymentStart = buildJudgementSnapshot();
  state.judgement.answers.employmentStart = "新規雇用あり";
  const eduWorkInfoStartYes = buildJudgementSnapshot();
  state.judgement.answers.employmentStart = "新規雇用なし";
  const eduWorkInfoStartNo = buildJudgementSnapshot();

  state.masters.clients = [
    { clientId: "c-care", clientName: "利用者B", clientNameKana: "りようしゃびー", targetType: "者" },
  ];
  state.masters.organizations = [
    { organizationId: "o-care", organizationName: "しののめケアマネ事業所", organizationType: "ケアマネ事業所", organizationGroup: "福祉サービス等提供機関", serviceIds: ["s-care"] },
  ];
  state.masters.services = [
    { serviceId: "s-care", serviceName: "ケアマネ連携", serviceCategory: "福祉", targetScope: "児者", groupName: "居宅群" },
  ];
  state.judgement.clientId = "c-care";
  state.judgement.organizationId = "o-care";
  state.judgement.serviceId = "s-care";
  state.judgement.staffId = "501";
  state.judgement.targetMonth = "2026-03";
  state.judgement.historyRecords = [];
  state.judgement.answers = { monthType: "それ以外", placeType: "外出先", actionType: "面談" };
  const careVisitAnswered = buildJudgementSnapshot();
  state.judgement.answers = { monthType: "それ以外", placeType: "自事業所内", actionType: "会議" };
  const careMeetingAnswered = buildJudgementSnapshot();
  state.judgement.answers = { monthType: "それ以外", placeType: "自事業所内", actionType: "情報共有" };
  const careInfoNeedsStart = buildJudgementSnapshot();
  state.judgement.answers.careManagerStart = "利用開始あり";
  const careInfoStartYes = buildJudgementSnapshot();
  state.judgement.answers.careManagerStart = "利用開始なし";
  const careInfoStartNo = buildJudgementSnapshot();

  state.masters.clients = [
    { clientId: "c-work", clientName: "利用者C", clientNameKana: "りようしゃしー", targetType: "者" },
  ];
  state.masters.organizations = [
    { organizationId: "o-work", organizationName: "しののめ企業", organizationType: "企業", organizationGroup: "福祉サービス等提供機関", serviceIds: ["s-work"] },
  ];
  state.masters.services = [
    { serviceId: "s-work", serviceName: "就労連携", serviceCategory: "福祉", targetScope: "児者", groupName: "就労群" },
  ];
  state.judgement.clientId = "c-work";
  state.judgement.organizationId = "o-work";
  state.judgement.serviceId = "s-work";
  state.judgement.staffId = "501";
  state.judgement.targetMonth = "2026-03";
  state.judgement.historyRecords = [];
  state.judgement.answers = { monthType: "それ以外", placeType: "外出先", actionType: "面談" };
  const homeWorkVisitAnswered = buildJudgementSnapshot();
  state.judgement.answers = { monthType: "それ以外", placeType: "自事業所内", actionType: "会議" };
  const homeWorkMeetingAnswered = buildJudgementSnapshot();
  state.judgement.answers = { monthType: "計画作成月", placeType: "自事業所内", actionType: "情報共有" };
  const homeWorkInfoNeedsStart = buildJudgementSnapshot();
  state.judgement.answers.employmentStart = "新規雇用あり";
  const homeWorkInfoStartYes = buildJudgementSnapshot();
  state.judgement.answers.employmentStart = "新規雇用なし";
  const homeWorkInfoStartNo = buildJudgementSnapshot();

  return [
    {
      name: "monitoring remains before month answer in welfare-service context",
      actual: beforeAnswers.candidates.some((item) => item.additionCode === "monitoring"),
      expected: true,
    },
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
    {
      name: "intensive meeting host remains reachable after choosing welfare host-meeting facts",
      actual: intensiveMeetingHostAnswered.candidates.some((item) => item.additionCode === "intensive_meeting_host"),
      expected: true,
    },
    {
      name: "intensive meeting host can auto-save when no extra post-check is required",
      actual: intensiveMeetingHostAnswered.saveSummary,
      expected: "自動確定で保存",
    },
    {
      name: "intensive info remains reachable after choosing welfare info-sharing facts",
      actual: intensiveInfoAnswered.candidates.some((item) => item.additionCode === "intensive_info"),
      expected: true,
    },
    {
      name: "intensive meeting join remains reachable after choosing welfare meeting facts",
      actual: intensiveMeetingAnswered.candidates.some((item) => item.additionCode === "intensive_meeting_join"),
      expected: true,
    },
    {
      name: "intensive meeting join can auto-save when no extra post-check is required",
      actual: intensiveMeetingAnswered.saveSummary,
      expected: "自動確定で保存",
    },
    {
      name: "intensive tsuuin remains reachable after choosing hospital companion facts in それ以外 month",
      actual: hospitalIntensiveTsuuinAnswered.candidates.some((item) => item.additionCode === "intensive_tsuuin"),
      expected: true,
    },
    {
      name: "outside action options include 情報共有 for hospital info path",
      actual: hospitalActionOptions.includes("情報共有"),
      expected: true,
    },
    {
      name: "outside action options include 通院同行 for mededu tsuuin path",
      actual: hospitalActionOptions.includes("通院同行"),
      expected: true,
    },
    {
      name: "hospital info asks admission-context question before save",
      actual: hospitalAdmissionQuestion.currentQuestion ? hospitalAdmissionQuestion.currentQuestion.key : "",
      expected: "hospitalAdmissionContext",
    },
    {
      name: "hospital info I remains reachable when admission context is confirmed",
      actual: hospitalAnswered.candidates.some((item) => item.additionCode === "hospital_info_i"),
      expected: true,
    },
    {
      name: "hospital info still asks admission-context question in welfare-service context",
      actual: hospitalWelfareAdmissionQuestion.currentQuestion ? hospitalWelfareAdmissionQuestion.currentQuestion.key : "",
      expected: "hospitalAdmissionContext",
    },
    {
      name: "hospital info I remains reachable in welfare-service context when admission context is confirmed",
      actual: hospitalWelfareAnswered.candidates.some((item) => item.additionCode === "hospital_info_i"),
      expected: true,
    },
    {
      name: "hospital info drops when information sharing is not tied to admission",
      actual: hospitalAdmissionNo.candidates.some((item) => item.additionCode === "hospital_info_i"),
      expected: false,
    },
    {
      name: "hospital intensive info asks admission-context question before save",
      actual: hospitalIntensiveAdmissionQuestion.currentQuestion ? hospitalIntensiveAdmissionQuestion.currentQuestion.key : "",
      expected: "hospitalAdmissionContext",
    },
    {
      name: "hospital intensive info remains when information sharing is not tied to admission",
      actual: hospitalIntensiveNo.candidates.some((item) => item.additionCode === "intensive_info_medical"),
      expected: true,
    },
    {
      name: "hospital intensive info drops when information sharing is tied to admission",
      actual: hospitalIntensiveYes.candidates.some((item) => item.additionCode === "intensive_info_medical"),
      expected: false,
    },
    {
      name: "pharmacy intensive info remains without admission-context question",
      actual: pharmacyIntensiveInfo.candidates.some((item) => item.additionCode === "intensive_info_pharmacy"),
      expected: true,
    },
    {
      name: "pharmacy intensive info does not ask admission-context question",
      actual: pharmacyIntensiveInfo.currentQuestion ? pharmacyIntensiveInfo.currentQuestion.key : "",
      expected: "",
    },
    {
      name: "mededu tsuuin remains reachable after choosing 通院同行",
      actual: hospitalTsuuinAnswered.candidates.some((item) => item.additionCode === "mededu_tsuuin"),
      expected: true,
    },
    {
      name: "mededu interview asks required-info question before save",
      actual: mededuInfoQuestion.currentQuestion ? mededuInfoQuestion.currentQuestion.key : "",
      expected: "requiredInfoReceived",
    },
    {
      name: "mededu interview asks discharge-facility-source question after required info is confirmed",
      actual: mededuFacilityQuestion.currentQuestion ? mededuFacilityQuestion.currentQuestion.key : "",
      expected: "dischargeFacilityStaffOnlyInfo",
    },
    {
      name: "mededu interview then asks initial-addition question after source is cleared",
      actual: mededuInitialQuestion.currentQuestion ? mededuInitialQuestion.currentQuestion.key : "",
      expected: "initialAdditionPlanned",
    },
    {
      name: "mededu interview blocks save until initial-addition answer is given",
      actual: mededuInitialQuestion.saveSummary,
      expected: "未完了: この月に初回加算も算定しますか",
    },
    {
      name: "mededu interview can auto-save when initial addition is not planned",
      actual: mededuInitialNo.saveSummary,
      expected: "自動確定で保存",
    },
    {
      name: "mededu interview becomes review when initial addition is planned",
      actual: mededuInitialYes.saveSummary,
      expected: "要確認で保存 (後段チェック要確認)",
    },
    {
      name: "mededu interview becomes review when info is only from discharge facility staff",
      actual: mededuFacilityOnly.saveSummary,
      expected: "要確認で保存 (後段チェック要確認)",
    },
    {
      name: "mededu interview does not remain for consultation-service context in question flow",
      actual: mededuInterviewConsultationContext.candidates.some((item) => item.additionCode === "mededu_interview"),
      expected: false,
    },
    {
      name: "mededu meeting does not remain for consultation-service context in question flow",
      actual: mededuMeetingConsultationContext.candidates.some((item) => item.additionCode === "mededu_meeting"),
      expected: false,
    },
    {
      name: "mededu interview becomes review when same-service monthly history already exists",
      actual: mededuInterviewSameServiceLimit.saveSummary,
      expected: "要確認で保存 (後段チェック要確認)",
    },
    {
      name: "mededu interview can auto-save when only other-service monthly history exists",
      actual: mededuInterviewOtherServiceLimit.saveSummary,
      expected: "自動確定で保存",
    },
    {
      name: "discharge asks required-info question first",
      actual: dischargeInfoQuestion.currentQuestion ? dischargeInfoQuestion.currentQuestion.key : "",
      expected: "requiredInfoReceived",
    },
    {
      name: "discharge then asks service-start-month question as the last candidate fact",
      actual: dischargeStartMonthQuestion.currentQuestion ? dischargeStartMonthQuestion.currentQuestion.key : "",
      expected: "serviceUseStartMonth",
    },
    {
      name: "discharge then asks inpatient-period count question when start month is confirmed",
      actual: dischargePeriodCountQuestion.currentQuestion ? dischargePeriodCountQuestion.currentQuestion.key : "",
      expected: "dischargeInpatientPeriodCount",
    },
    {
      name: "discharge then asks initial-addition question when inpatient-period count is confirmed",
      actual: dischargePeriodCountOk.currentQuestion ? dischargePeriodCountOk.currentQuestion.key : "",
      expected: "initialAdditionPlanned",
    },
    {
      name: "discharge can auto-save after start month confirmed and initial addition not planned",
      actual: dischargeReadyToSave.saveSummary,
      expected: "自動確定で保存",
    },
    {
      name: "discharge drops in consultation context",
      actual: dischargeConsultationDropped.candidates.some((item) => item.additionCode === "discharge"),
      expected: false,
    },
    {
      name: "discharge drops when it is not the service-start month",
      actual: dischargeStartMonthNo.candidates.some((item) => item.additionCode === "discharge"),
      expected: false,
    },
    {
      name: "consultation-only enrollment is hidden from judgement organization choices",
      actual: consultationOnlyOrganizations.length,
      expected: 0,
    },
    {
      name: "consultation-only enrollment is hidden from judgement service choices",
      actual: consultationOnlyServices.length,
      expected: 0,
    },
    {
      name: "consultation-only judgement context becomes no-scope state",
      actual: consultationOnlySnapshot.saveSummary,
      expected: "判定対象なし",
    },
    {
      name: "consultation office without registered judgement services is hidden from fallback organization choices",
      actual: filteredOrganizationsWithoutRelations.includes("o-consult"),
      expected: false,
    },
    {
      name: "edu visit remains reachable after choosing school interview facts",
      actual: schoolInterviewAnswered.candidates.some((item) => item.additionCode === "edu_visit"),
      expected: true,
    },
    {
      name: "edu meeting remains reachable after choosing school meeting facts",
      actual: schoolMeetingAnswered.candidates.some((item) => item.additionCode === "edu_meeting"),
      expected: true,
    },
    {
      name: "edu info asks employment-start question before save for child company context",
      actual: eduWorkInfoNeedsEmploymentStart.currentQuestion ? eduWorkInfoNeedsEmploymentStart.currentQuestion.key : "",
      expected: "employmentStart",
    },
    {
      name: "edu info remains when child company employment start is confirmed",
      actual: eduWorkInfoStartYes.candidates.some((item) => item.additionCode === "edu_info"),
      expected: true,
    },
    {
      name: "edu info drops when child company employment start is denied",
      actual: eduWorkInfoStartNo.candidates.some((item) => item.additionCode === "edu_info"),
      expected: false,
    },
    {
      name: "home visit remains reachable after choosing care-manager interview facts",
      actual: careVisitAnswered.candidates.some((item) => item.additionCode === "home_visit"),
      expected: true,
    },
    {
      name: "home info asks care-manager start question before save",
      actual: careInfoNeedsStart.currentQuestion ? careInfoNeedsStart.currentQuestion.key : "",
      expected: "careManagerStart",
    },
    {
      name: "home info remains when care-manager start is confirmed",
      actual: careInfoStartYes.candidates.some((item) => item.additionCode === "home_info"),
      expected: true,
    },
    {
      name: "home info drops when care-manager start is denied",
      actual: careInfoStartNo.candidates.some((item) => item.additionCode === "home_info"),
      expected: false,
    },
    {
      name: "home meeting remains reachable after choosing care-manager meeting facts",
      actual: careMeetingAnswered.candidates.some((item) => item.additionCode === "home_meeting"),
      expected: true,
    },
    {
      name: "home work visit remains reachable after choosing company interview facts",
      actual: homeWorkVisitAnswered.candidates.some((item) => item.additionCode === "home_work_visit"),
      expected: true,
    },
    {
      name: "home work info asks employment-start question before save",
      actual: homeWorkInfoNeedsStart.currentQuestion ? homeWorkInfoNeedsStart.currentQuestion.key : "",
      expected: "employmentStart",
    },
    {
      name: "home work info remains when employment start is confirmed",
      actual: homeWorkInfoStartYes.candidates.some((item) => item.additionCode === "home_work_info"),
      expected: true,
    },
    {
      name: "home work info drops when employment start is denied",
      actual: homeWorkInfoStartNo.candidates.some((item) => item.additionCode === "home_work_info"),
      expected: false,
    },
    {
      name: "home work meeting remains reachable after choosing company meeting facts",
      actual: homeWorkMeetingAnswered.candidates.some((item) => item.additionCode === "home_work_meeting"),
      expected: true,
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

