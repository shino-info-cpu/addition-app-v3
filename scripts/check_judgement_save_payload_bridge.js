const fs = require("fs");
const path = require("path");
const vm = require("vm");

const appJsPath = path.resolve(__dirname, "../app/frontend/app.js");
const frontendSampleDataAssetPath = path.resolve(__dirname, "../app/frontend/prototype-sample-data.js");
const frontendCatalogAssetPath = path.resolve(__dirname, "../app/frontend/prototype-rule-catalog.js");
const frontendReportStateBridgeAssetPath = path.resolve(__dirname, "../app/frontend/report-state-bridge.js");
const frontendRuntimeAdapterAssetPath = path.resolve(__dirname, "../app/frontend/rule-runtime-adapter.js");
const frontendMasterDataBridgeAssetPath = path.resolve(__dirname, "../app/frontend/master-data-bridge.js");
const frontendJudgementEngineBridgeAssetPath = path.resolve(__dirname, "../app/frontend/judgement-engine-bridge.js");
const frontendApiRuntimeAdapterAssetPath = path.resolve(__dirname, "../app/frontend/api-runtime-adapter.js");
const frontendJudgementReportBridgeAssetPath = path.resolve(__dirname, "../app/frontend/judgement-report-bridge.js");
const frontendJudgementSessionBridgeAssetPath = path.resolve(__dirname, "../app/frontend/judgement-session-bridge.js");
const additionCatalogPath = path.resolve(__dirname, "../runtime/import/prototype_addition_catalog.json");
const branchRuleCatalogPath = path.resolve(__dirname, "../runtime/import/prototype_branch_rule_catalog.json");
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
vm.runInContext(frontendReportStateBridgeAsset, context);
vm.runInContext(frontendRuntimeAdapterAsset, context);
vm.runInContext(frontendMasterDataBridgeAsset, context);
vm.runInContext(frontendJudgementEngineBridgeAsset, context);
vm.runInContext(frontendApiRuntimeAdapterAsset, context);
vm.runInContext(frontendJudgementReportBridgeAsset, context);
vm.runInContext(frontendJudgementSessionBridgeAsset, context);
vm.runInContext(source, context);

const runtimeAdditions = context.__KASAN_PROTOTYPE_RULE_CATALOG__.additions.map((candidate) => (
  candidate.additionCode === "mededu_info"
    ? { ...candidate, promptTemplate: "この加算では事実関係を先に書いてください。" }
    : candidate
));

vm.runInContext(`
  state.dataSource.additions = "api";
  state.ruleCatalog.additions = ${JSON.stringify(runtimeAdditions)};
  state.dataSource.questions = "sample";
  state.ruleCatalog.questions = [];
`, context);

const result = vm.runInContext(`
  (() => {
    state.judgement.clientId = "1001";
    state.judgement.organizationId = "21";
    state.judgement.serviceId = "301";
    state.judgement.staffId = "501";
    state.judgement.targetMonth = "2026-03";
    state.judgement.performedAt = "2026-03-14T09:05";
    state.judgement.historyRecords = getSampleJudgementHistoryRecords("1001", "2026-03");
    state.judgement.answers = {
      monthType: "計画作成月",
      placeType: "自事業所内",
      actionType: "情報共有",
      hospitalAdmissionContext: "入院に当たっていない",
      requiredInfoReceived: "",
      dischargeFacilityStaffOnlyInfo: "",
      dischargeInpatientPeriodCount: "",
      initialAdditionPlanned: "",
      careManagerStart: "",
      employmentStart: "",
      serviceUseStartMonth: "",
    };
    state.judgement.noteMode = "ai";
    state.judgement.noteText = "AI下書きを少し修正した保存文";
    state.judgement.notePromptText = "prompt text";
    state.judgement.noteAiDraftText = "ai draft text";

    const snapshot = buildJudgementSnapshot();
    const noteDraftPayload = buildJudgementNoteDraftPayload(snapshot);
    const payload = buildJudgementSavePayload(snapshot);
    const savedRecord = saveJudgementEvaluationToSample(snapshot);

    return {
      canSave: snapshot.canSave,
      currentQuestion: snapshot.currentQuestion ? snapshot.currentQuestion.key : "",
      topCandidateCode: snapshot.topCandidate ? snapshot.topCandidate.additionCode : "",
      payloadResultAdditionId: payload.result.addition_id,
      payloadResultAdditionBranchId: payload.result.addition_branch_id,
      payloadPrimaryAdditionCode: payload.result.primary_addition_code,
      payloadPrimaryAdditionName: payload.result.primary_addition_name,
      payloadRequestCandidateNames: payload.request.candidate_names,
      payloadResultCandidateNames: payload.result.candidate_names,
      payloadCandidateCount: payload.candidates.length,
      payloadPromptText: payload.prompt_text,
      payloadAiDraftText: payload.ai_draft_text,
      payloadFinalNoteText: payload.final_note_text,
      noteDraftPayloadPromptTemplate: noteDraftPayload.addition_prompt_template,
      snapshotDefaultNoteText: snapshot.defaultNoteText,
      snapshotNoteText: snapshot.noteText,
      snapshotAdditionPromptTemplate: snapshot.additionPromptTemplate,
      payloadCandidateStatuses: payload.candidates.map((candidate) => candidate.candidate_status),
      payloadCandidateBranchIds: payload.candidates.map((candidate) => candidate.addition_branch_id),
      payloadMatchedGroupCounts: payload.candidates.map((candidate) => candidate.matched_group_count),
      payloadCandidateDetailCodes: payload.candidates.map((candidate) => candidate.detail_json?.addition_code ?? ""),
      sampleSavedAdditionBranchId: savedRecord.additionBranchId,
      sampleSavedAdditionId: savedRecord.additionId,
      sampleCandidateCount: savedRecord.candidateCount,
      sampleCandidateNamesSummary: savedRecord.candidateNamesSummary,
      sampleCandidateDetailCodes: Array.isArray(savedRecord.candidateDetails)
        ? savedRecord.candidateDetails.map((candidate) => candidate.additionCode)
        : [],
    };
  })()
`, context);

const failures = [];

if (result.canSave !== true) {
  failures.push(`canSave expected true but got ${JSON.stringify(result.canSave)}`);
}

if (result.currentQuestion !== "") {
  failures.push(`currentQuestion expected empty but got ${JSON.stringify(result.currentQuestion)}`);
}

if (result.topCandidateCode !== "mededu_info") {
  failures.push(`topCandidateCode expected mededu_info but got ${JSON.stringify(result.topCandidateCode)}`);
}

if (!(Number.isInteger(result.payloadResultAdditionId) && result.payloadResultAdditionId > 0)) {
  failures.push(`payload.result.addition_id expected positive integer but got ${JSON.stringify(result.payloadResultAdditionId)}`);
}

if (!(Number.isInteger(result.payloadResultAdditionBranchId) && result.payloadResultAdditionBranchId > 0)) {
  failures.push(`payload.result.addition_branch_id expected positive integer but got ${JSON.stringify(result.payloadResultAdditionBranchId)}`);
}

if (result.payloadPrimaryAdditionCode !== "mededu") {
  failures.push(`payload.result.primary_addition_code expected mededu but got ${JSON.stringify(result.payloadPrimaryAdditionCode)}`);
}

if (result.payloadPrimaryAdditionName !== "医療・保育・教育機関等連携加算") {
  failures.push(`payload.result.primary_addition_name expected 医療・保育・教育機関等連携加算 but got ${JSON.stringify(result.payloadPrimaryAdditionName)}`);
}

if (!(Number.isInteger(result.payloadCandidateCount) && result.payloadCandidateCount >= 1)) {
  failures.push(`payload.candidates expected at least 1 row but got ${JSON.stringify(result.payloadCandidateCount)}`);
}

if (result.payloadPromptText !== "prompt text") {
  failures.push(`payload.prompt_text expected prompt text but got ${JSON.stringify(result.payloadPromptText)}`);
}

if (result.payloadAiDraftText !== "ai draft text") {
  failures.push(`payload.ai_draft_text expected ai draft text but got ${JSON.stringify(result.payloadAiDraftText)}`);
}

if (result.payloadFinalNoteText !== "AI下書きを少し修正した保存文") {
  failures.push(`payload.final_note_text expected edited note text but got ${JSON.stringify(result.payloadFinalNoteText)}`);
}

if (result.noteDraftPayloadPromptTemplate !== "この加算では事実関係を先に書いてください。") {
  failures.push(`noteDraftPayload.addition_prompt_template expected configured prompt template but got ${JSON.stringify(result.noteDraftPayloadPromptTemplate)}`);
}

if (result.snapshotNoteText !== "AI下書きを少し修正した保存文") {
  failures.push(`snapshot.noteText expected edited note text but got ${JSON.stringify(result.snapshotNoteText)}`);
}

if (result.snapshotAdditionPromptTemplate !== "この加算では事実関係を先に書いてください。") {
  failures.push(`snapshot.additionPromptTemplate expected configured prompt template but got ${JSON.stringify(result.snapshotAdditionPromptTemplate)}`);
}

if (typeof result.snapshotDefaultNoteText !== "string" || result.snapshotDefaultNoteText.length === 0) {
  failures.push(`snapshot.defaultNoteText expected non-empty default note but got ${JSON.stringify(result.snapshotDefaultNoteText)}`);
}

if (!Array.isArray(result.payloadRequestCandidateNames) || result.payloadRequestCandidateNames.length !== result.payloadCandidateCount) {
  failures.push(`payload.request.candidate_names expected ${result.payloadCandidateCount} items but got ${JSON.stringify(result.payloadRequestCandidateNames)}`);
}

if (!Array.isArray(result.payloadResultCandidateNames) || result.payloadResultCandidateNames.length !== result.payloadCandidateCount) {
  failures.push(`payload.result.candidate_names expected ${result.payloadCandidateCount} items but got ${JSON.stringify(result.payloadResultCandidateNames)}`);
}

if (!Array.isArray(result.payloadCandidateStatuses) || result.payloadCandidateStatuses[0] !== "selected") {
  failures.push(`first candidate status expected selected but got ${JSON.stringify(result.payloadCandidateStatuses)}`);
}

if (!Array.isArray(result.payloadCandidateBranchIds) || result.payloadCandidateBranchIds.some((value) => !(Number.isInteger(value) && value > 0))) {
  failures.push(`payload candidate branch ids expected all positive integers but got ${JSON.stringify(result.payloadCandidateBranchIds)}`);
}

if (!Array.isArray(result.payloadMatchedGroupCounts) || result.payloadMatchedGroupCounts.some((value) => !(Number.isInteger(value) && value >= 1))) {
  failures.push(`payload matched_group_count expected all >= 1 but got ${JSON.stringify(result.payloadMatchedGroupCounts)}`);
}

if (!Array.isArray(result.payloadCandidateDetailCodes) || result.payloadCandidateDetailCodes.some((value) => !value)) {
  failures.push(`payload candidate detail_json addition_code expected non-empty values but got ${JSON.stringify(result.payloadCandidateDetailCodes)}`);
}

if (result.sampleSavedAdditionBranchId !== result.payloadResultAdditionBranchId) {
  failures.push(`sample saved additionBranchId expected ${result.payloadResultAdditionBranchId} but got ${JSON.stringify(result.sampleSavedAdditionBranchId)}`);
}

if (result.sampleSavedAdditionId !== result.payloadResultAdditionId) {
  failures.push(`sample saved additionId expected ${result.payloadResultAdditionId} but got ${JSON.stringify(result.sampleSavedAdditionId)}`);
}

if (result.sampleCandidateCount !== result.payloadCandidateCount) {
  failures.push(`sample candidateCount expected ${result.payloadCandidateCount} but got ${JSON.stringify(result.sampleCandidateCount)}`);
}

if (typeof result.sampleCandidateNamesSummary !== "string" || !result.sampleCandidateNamesSummary.includes("医療・保育・教育機関等連携加算（情報共有）")) {
  failures.push(`sample candidateNamesSummary expected mededu info label but got ${JSON.stringify(result.sampleCandidateNamesSummary)}`);
}

if (!Array.isArray(result.sampleCandidateDetailCodes) || result.sampleCandidateDetailCodes.length !== result.payloadCandidateCount) {
  failures.push(`sample candidateDetails expected ${result.payloadCandidateCount} rows but got ${JSON.stringify(result.sampleCandidateDetailCodes)}`);
}

if (failures.length > 0) {
  failures.forEach((message) => console.error(`[fail] ${message}`));
  process.exit(1);
}

console.log("judgement-save-payload-bridge: ok");
