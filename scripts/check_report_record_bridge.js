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

const scenarios = [
  {
    name: "API report record keeps candidate aggregate values",
    item: {
      evaluation_case_id: 101,
      target_month: "2026-03",
      client_id: 1001,
      client_name: "てすと太郎",
      target_type: "児",
      organization_id: 21,
      organization_name: "尚寿会病院",
      service_definition_id: 301,
      service_name: "児童発達",
      staff_id: 501,
      staff_name: "堀野 美姫",
      action_type: "情報共有",
      addition_id: 1,
      addition_branch_id: 101,
      addition_code: "mededu_info",
      addition_family_code: "mededu",
      addition_family_name: "医療・保育・教育機関等連携加算",
      result_storage_mode: "branch",
      candidate_storage_mode: "db",
      addition_name: "医療・保育・教育機関等連携加算（情報共有）",
      candidate_count: 3,
      candidate_names_summary: "医療・保育・教育機関等連携加算（情報共有） / 入院時情報連携加算 I / モニタリング加算",
      candidate_details_json: JSON.stringify([
        {
          addition_code: "mededu_info",
          addition_name: "医療・保育・教育機関等連携加算（情報共有）",
          candidate_status: "matched",
          matched_group_count: 2,
          display_order: 10,
        },
        {
          addition_code: "hospital_admission_i",
          addition_name: "入院時情報連携加算 I",
          candidate_status: "matched",
          matched_group_count: 1,
          display_order: 20,
        },
      ]),
      final_status: "要確認",
      post_check_status: "review",
      post_check: "同月1回まで。",
      evaluated_at: "2026-03-26 09:00",
      message: "候補比較あり",
      final_note_text: "保存文",
    },
    assert(result) {
      const identity = context.formatReportIdentity(result);
      return result.candidateCount === 3
        && result.candidateNamesSummary.includes("入院時情報連携加算 I")
        && result.additionBranchId === 101
        && result.additionFamilyCode === "mededu"
        && result.resultStorageMode === "branch"
        && result.candidateStorageMode === "db"
        && identity.includes("family: 医療・保育・教育機関等連携加算 (mededu)")
        && identity.includes("branch: mededu_info (#101)")
        && Array.isArray(result.candidateDetails)
        && result.candidateDetails.length === 2
        && result.candidateDetails[0].matchedGroupCount === 2;
    },
  },
  {
    name: "Legacy-like report record falls back to single candidate",
    item: {
      evaluation_case_id: 102,
      target_month: "2026-03",
      client_id: 1002,
      client_name: "一戸 美智子",
      target_type: "者",
      organization_id: 11,
      organization_name: "あまねく狭山中央",
      service_definition_id: 202,
      service_name: "生活サポート",
      staff_id: 502,
      staff_name: "岩村 清江",
      action_type: "面談",
      addition_id: 2,
      addition_branch_id: 205,
      addition_code: "mededu_interview",
      addition_family_code: "mededu",
      addition_family_name: "医療・保育・教育機関等連携加算",
      addition_name: "医療・保育・教育機関等連携加算（面談）",
      final_status: "自動確定",
      post_check_status: "ok",
      post_check: "同月1回まで。",
      evaluated_at: "2026-03-26 10:00",
      message: "単独候補",
      final_note_text: "保存文",
    },
    assert(result) {
      const identity = context.formatReportIdentity(result);
      return result.candidateCount === 1
        && result.candidateNamesSummary === "医療・保育・教育機関等連携加算（面談）"
        && result.additionFamilyName === "医療・保育・教育機関等連携加算"
        && result.resultStorageMode === "branch"
        && result.candidateStorageMode === "fallback"
        && identity.includes("結果: branch保存")
        && identity.includes("候補: 候補fallback")
        && Array.isArray(result.candidateDetails)
        && result.candidateDetails.length === 0;
    },
  },
  {
    name: "Family-code legacy report record resolves family metadata from catalog",
    item: {
      evaluation_case_id: 103,
      target_month: "2026-03",
      client_id: 1003,
      client_name: "三ツ木 佐知",
      target_type: "者",
      organization_id: 13,
      organization_name: "あまねく狭山中央",
      service_definition_id: 30,
      service_name: "生活サポート",
      staff_id: 503,
      staff_name: "岡村 清江",
      action_type: "情報共有",
      addition_id: 2,
      addition_code: "intensive",
      final_status: "要確認",
      post_check_status: "review",
      post_check: "確認待ち",
      evaluated_at: "2026-03-26 11:00",
      message: "legacy family only",
      final_note_text: "保存文",
    },
    assert(result) {
      const identity = context.formatReportIdentity(result);
      return result.candidateCount === 1
        && result.additionCode === "intensive"
        && result.additionFamilyCode === "intensive"
        && result.additionFamilyName === "集中支援加算"
        && result.additionName === "集中支援加算"
        && result.resultStorageMode === "family"
        && identity.includes("family: 集中支援加算 (intensive)")
        && identity.includes("結果: family保存");
    },
  },
];

let failures = 0;

for (const scenario of scenarios) {
  const result = context.normalizeApiReportRecord(scenario.item);
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

console.log(`report-record-bridge: ok (${scenarios.length}/${scenarios.length})`);
