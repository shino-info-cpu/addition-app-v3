const data = {
  staff: [
    { staffId: "501", staffName: "相談 花子", email: "hanako@example.jp" },
    { staffId: "502", staffName: "支援 次郎", email: "jiro@example.jp" },
    { staffId: "503", staffName: "調整 三郎", email: "saburo@example.jp" },
  ],
  clients: [
    { clientId: "1001", clientName: "山田 太郎", clientNameKana: "やまだ たろう", targetType: "児" },
    { clientId: "1002", clientName: "佐藤 花子", clientNameKana: "さとう はなこ", targetType: "者" },
    { clientId: "1003", clientName: "高橋 一郎", clientNameKana: "たかはし いちろう", targetType: "者" },
  ],
  organizations: [
    { organizationId: "10", organizationName: "しののめ相談支援", organizationType: "相談支援事業所", organizationGroup: "福祉サービス等提供機関", serviceIds: ["201", "202"] },
    { organizationId: "11", organizationName: "あおぞら支援室", organizationType: "相談支援事業所", organizationGroup: "福祉サービス等提供機関", serviceIds: ["202", "203"] },
    { organizationId: "21", organizationName: "東雲総合病院", organizationType: "病院", organizationGroup: "病院・訪看・薬局グループ", serviceIds: ["301"] },
    { organizationId: "22", organizationName: "みらい訪問看護", organizationType: "訪問看護", organizationGroup: "病院・訪看・薬局グループ", serviceIds: ["302"] },
  ],
  services: [
    { serviceId: "201", serviceName: "計画相談", serviceCategory: "相談支援", targetScope: "児者", groupName: "初回群" },
    { serviceId: "202", serviceName: "障害児相談", serviceCategory: "福祉", targetScope: "児", groupName: "モニタ群" },
    { serviceId: "203", serviceName: "生活介護", serviceCategory: "障害福祉サービス", targetScope: "者", groupName: "地域支援群" },
    { serviceId: "301", serviceName: "医療連携", serviceCategory: "医療", targetScope: "児者", groupName: "病院群" },
    { serviceId: "302", serviceName: "訪看連携", serviceCategory: "医療", targetScope: "児者", groupName: "訪看群" },
  ],
  enrollments: [
    { enrollmentId: "e1001-10-201", clientId: "1001", organizationId: "10", serviceId: "201" },
    { enrollmentId: "e1001-21-301", clientId: "1001", organizationId: "21", serviceId: "301" },
    { enrollmentId: "e1002-11-203", clientId: "1002", organizationId: "11", serviceId: "203" },
    { enrollmentId: "e1002-22-302", clientId: "1002", organizationId: "22", serviceId: "302" },
    { enrollmentId: "e1003-10-201", clientId: "1003", organizationId: "10", serviceId: "201" },
  ],
  // Prototype branch set used while the decision tree is still being verified.
  // Confirmed rules come from conversation-verified制度要件.
  // Provisional rules are intentionally left visible here so we do not mistake
  // temporary trial settings for finalized制度定義.
  additions: [
    {
      additionCode: "mededu",
      additionName: "医療・保育・教育機関等連携加算",
      ruleStatus: "一部確定",
      confirmedRules: [
        "モニタリング月または計画作成月で候補に残す",
        "障害福祉サービスは除外する",
      ],
      provisionalRules: [
        "機関グループの範囲は仮置き",
        "行為を情報共有・会議・面談の3区分で足りるかは未確定",
      ],
      priority: 10,
      targetTypes: ["共通", "児", "者"],
      monthTypes: ["モニタリング月", "計画作成月"],
      organizationGroups: ["病院・訪看・薬局グループ", "福祉サービス等提供機関"],
      serviceDecisionInclude: ["医療関連", "障害福祉以外の福祉サービス", "相談支援"],
      serviceDecisionExclude: ["障害福祉サービス"],
      placeTypes: ["自事業所内", "外出先"],
      actionTypes: ["情報共有", "会議", "面談"],
      postCheckRules: [
        { code: "monthly_limit_per_client", limit: 1, label: "同月1回まで" },
      ],
      postCheck: "月1回まで。記録文に情報共有先を残す。",
    },
    {
      additionCode: "intensive",
      additionName: "集中支援加算",
      ruleStatus: "一部確定",
      confirmedRules: [
        "それ以外月で候補に残す",
      ],
      provisionalRules: [
        "機関グループの範囲は仮置き",
        "訪問とサービス提供場面確認のみで十分かは未確定",
      ],
      priority: 20,
      targetTypes: ["共通", "児", "者"],
      monthTypes: ["それ以外"],
      organizationGroups: ["福祉サービス等提供機関"],
      serviceDecisionInclude: ["障害福祉サービス", "障害福祉以外の福祉サービス", "相談支援"],
      placeTypes: ["外出先"],
      actionTypes: ["訪問", "サービス提供場面確認"],
      postCheckRules: [
        {
          code: "monthly_action_count_min",
          minimum: 2,
          actionTypes: ["訪問"],
          label: "同月2回以上の訪問が必要",
        },
        { code: "monthly_distinct_organization_limit_per_client", limit: 3, label: "同一機関を除き月3回まで" },
      ],
      postCheck: "同一機関を除き月3回まで。訪問枝は同月2回以上の訪問を後段で確認する。",
    },
    {
      additionCode: "monitoring",
      additionName: "モニタリング加算",
      ruleStatus: "一部確定",
      confirmedRules: [
        "提供現場の訪問確認で候補に残す",
        "モニタリング月に限定しない",
        "同月1回まで",
      ],
      provisionalRules: [
        "現行UIでは「提供現場訪問」を「サービス提供場面確認」に寄せている",
        "対象機関と対象サービスの制度境界はまだ仮置き",
      ],
      priority: 25,
      targetTypes: ["共通", "児", "者"],
      monthTypes: ["モニタリング月", "計画作成月", "それ以外"],
      organizationGroups: ["福祉サービス等提供機関"],
      serviceDecisionInclude: ["障害福祉サービス", "障害福祉以外の福祉サービス"],
      placeTypes: ["外出先"],
      actionTypes: ["サービス提供場面確認"],
      postCheckRules: [
        { code: "monthly_limit_per_client", limit: 1, label: "同月1回まで" },
      ],
      postCheck: "提供現場の訪問確認内容と確認結果を記録する。月1回まで。",
    },
    {
      additionCode: "conference",
      additionName: "担当者会議加算",
      ruleStatus: "確定条件あり",
      confirmedRules: [
        "モニタリング月のみ",
        "担当者会議開催のみ",
      ],
      provisionalRules: [
        "対象機関グループの細かい制度境界は未確定",
      ],
      priority: 30,
      targetTypes: ["共通", "児", "者"],
      monthTypes: ["モニタリング月"],
      organizationGroups: ["病院・訪看・薬局グループ", "福祉サービス等提供機関"],
      serviceDecisionInclude: ["医療関連", "障害福祉サービス", "障害福祉以外の福祉サービス", "相談支援"],
      placeTypes: ["自事業所内", "外出先"],
      actionTypes: ["担当者会議開催"],
      postCheckRules: [],
      postCheck: "モニタリングに当たって開催した担当者会議の参加者と開催内容を記録する。",
    },
    {
      additionCode: "discharge",
      additionName: "退院・退所加算",
      ruleStatus: "仮置き多め",
      confirmedRules: [
        "病院系の外出先対応で、退院前面談を要件にする",
      ],
      provisionalRules: [
        "対象月の扱いは仮置き",
        "病院・訪看・薬局を同一枝で扱うかは未確定",
      ],
      priority: 40,
      targetTypes: ["共通", "児", "者"],
      monthTypes: ["計画作成月", "それ以外"],
      organizationGroups: ["病院・訪看・薬局グループ"],
      serviceDecisionInclude: ["医療関連"],
      placeTypes: ["外出先"],
      actionTypes: ["退院前面談"],
      postCheckRules: [],
      postCheck: "退院前後の場面確認が必要。面談先の記録を残す。",
    },
    {
      additionCode: "hospital_info_i",
      additionName: "入院時情報連携加算 I",
      ruleStatus: "一部確定",
      confirmedRules: [
        "病院へ訪問して必要情報を提供した場合に候補に残す",
        "同月1回まで",
        "IIとの併算定不可",
      ],
      provisionalRules: [
        "現行UIでは「訪問情報提供」を「外出先 + 情報共有」に寄せている",
        "病院以外の医療機関をどこまで含めるかはまだ仮置き",
      ],
      priority: 35,
      targetTypes: ["共通", "児", "者"],
      monthTypes: ["モニタリング月", "計画作成月", "それ以外"],
      organizationGroups: ["病院・訪看・薬局グループ"],
      organizationTypes: ["病院"],
      serviceDecisionInclude: ["医療関連"],
      placeTypes: ["外出先"],
      actionTypes: ["情報共有"],
      postCheckRules: [
        { code: "monthly_limit_per_client", limit: 1, label: "同月1回まで" },
        { code: "exclusive_with_addition_codes", additionCodes: ["hospital_info_ii"], label: "IIとの併算定不可" },
      ],
      postCheck: "病院訪問による情報提供内容を記録する。",
    },
    {
      additionCode: "hospital_info_ii",
      additionName: "入院時情報連携加算 II",
      ruleStatus: "一部確定",
      confirmedRules: [
        "病院へ訪問以外の方法で必要情報を提供した場合に候補に残す",
        "同月1回まで",
        "Iとの併算定不可",
      ],
      provisionalRules: [
        "現行UIでは「訪問以外情報提供」を「自事業所内 + 情報共有」に寄せている",
        "病院以外の医療機関をどこまで含めるかはまだ仮置き",
      ],
      priority: 36,
      targetTypes: ["共通", "児", "者"],
      monthTypes: ["モニタリング月", "計画作成月", "それ以外"],
      organizationGroups: ["病院・訪看・薬局グループ"],
      organizationTypes: ["病院"],
      serviceDecisionInclude: ["医療関連"],
      placeTypes: ["自事業所内"],
      actionTypes: ["情報共有"],
      postCheckRules: [
        { code: "monthly_limit_per_client", limit: 1, label: "同月1回まで" },
        { code: "exclusive_with_addition_codes", additionCodes: ["hospital_info_i"], label: "Iとの併算定不可" },
      ],
      postCheck: "訪問以外で提供した情報内容と提供方法を記録する。",
    },
    {
      additionCode: "edu_support",
      additionName: "保・教支援",
      ruleStatus: "一部確定",
      confirmedRules: [
        "児対象のみ",
        "学校・保育・企業・就業生活支援センター等への情報共有で候補に残す",
      ],
      provisionalRules: [
        "訪問面接枝と会議参加枝はまだ未実装",
        "集団生活施設など、学校・保育以外の対象境界はまだ仮置き",
      ],
      priority: 50,
      targetTypes: ["児"],
      monthTypes: ["モニタリング月", "計画作成月", "それ以外"],
      organizationGroups: ["福祉サービス等提供機関"],
      organizationTypes: ["学校", "保育", "企業", "障害者就業・生活支援センター"],
      serviceDecisionInclude: ["障害福祉以外の福祉サービス"],
      placeTypes: ["自事業所内", "外出先"],
      actionTypes: ["情報共有"],
      postCheckRules: [],
      postCheck: "情報共有先と支援内容の検討協力内容を記録する。",
    },
    {
      additionCode: "home_collab",
      additionName: "居宅連携",
      ruleStatus: "一部確定",
      confirmedRules: [
        "者対象のみ",
        "ケアマネ事業所への情報共有で候補に残す",
        "同月2回まで",
      ],
      provisionalRules: [
        "訪問面接枝と会議参加枝はまだ未実装",
        "ケアマネ利用開始の事実確認はまだ別設問化していない",
      ],
      priority: 60,
      targetTypes: ["者"],
      monthTypes: ["モニタリング月", "計画作成月", "それ以外"],
      organizationGroups: ["福祉サービス等提供機関"],
      organizationTypes: ["ケアマネ事業所"],
      placeTypes: ["自事業所内", "外出先"],
      actionTypes: ["情報共有"],
      postCheckRules: [
        { code: "monthly_limit_per_client", limit: 2, label: "同月2回まで" },
      ],
      postCheck: "ケアマネへ提供した情報と協力内容を記録する。月2回まで。",
    },
    {
      additionCode: "home_work_collab",
      additionName: "居宅連携（就労）",
      ruleStatus: "一部確定",
      confirmedRules: [
        "者対象のみ",
        "企業または障害者就業・生活支援センター等への情報共有で候補に残す",
        "同月2回まで",
      ],
      provisionalRules: [
        "訪問面接枝と会議参加枝はまだ未実装",
        "新規雇用開始の事実確認はまだ別設問化していない",
      ],
      priority: 70,
      targetTypes: ["者"],
      monthTypes: ["モニタリング月", "計画作成月", "それ以外"],
      organizationGroups: ["福祉サービス等提供機関"],
      organizationTypes: ["企業", "障害者就業・生活支援センター"],
      placeTypes: ["自事業所内", "外出先"],
      actionTypes: ["情報共有"],
      postCheckRules: [
        { code: "monthly_limit_per_client", limit: 2, label: "同月2回まで" },
      ],
      postCheck: "就労先や就業生活支援センター等へ提供した情報を記録する。月2回まで。",
    },
  ],
  reportRecords: [
    { recordId: "r1", targetMonth: "2026-03", performedAt: "2026-03-14 09:05", clientId: "1001", organizationId: "21", serviceId: "301", staffId: "501", additionCode: "mededu", actionType: "情報共有", finalStatus: "自動確定", postCheckStatus: "ok", postCheckSummary: "同月1回まで。今月既存0件で範囲内です。", evaluatedAt: "2026-03-14 09:20", rationale: "病院グループ / 計画作成月 / 自事業所内 / 情報共有", savedNote: "病院と支援方針を共有し、今後の通院支援計画を確認した。" },
    { recordId: "r2", targetMonth: "2026-03", performedAt: "2026-03-14 09:50", clientId: "1002", organizationId: "11", serviceId: "203", staffId: "502", additionCode: "intensive", actionType: "訪問", finalStatus: "要確認", postCheckStatus: "review", postCheckSummary: "同月2回以上の訪問が必要。今回を含めて1回です。 / 同一機関を除き月3回まで。今回を含めて1機関です。", evaluatedAt: "2026-03-14 10:05", rationale: "福祉サービス等提供機関 / それ以外 / 外出先 / 訪問", savedNote: "生活介護の現場を訪問し、利用状況と支援上の課題を確認した。" },
    { recordId: "r3", targetMonth: "2026-03", performedAt: "2026-03-14 11:10", clientId: "1003", organizationId: "10", serviceId: "201", staffId: "501", additionCode: "conference", actionType: "担当者会議開催", finalStatus: "自動確定", postCheckStatus: "ok", postCheckSummary: "モニタリングに当たって開催した担当者会議の参加者と開催内容を記録する。", evaluatedAt: "2026-03-14 11:42", rationale: "福祉サービス等提供機関 / モニタリング月 / 自事業所内 / 担当者会議開催", savedNote: "モニタリングに当たり担当者会議を開催し、関係機関で支援方針を共有した。" },
    { recordId: "r4", targetMonth: "2026-02", performedAt: "2026-02-28 15:30", clientId: "1001", organizationId: "21", serviceId: "301", staffId: "501", additionCode: "discharge", actionType: "退院前面談", finalStatus: "自動確定", postCheckStatus: "ok", postCheckSummary: "退院前後の場面確認が必要。面談先の記録を残す。", evaluatedAt: "2026-02-28 16:18", rationale: "病院グループ / それ以外 / 外出先 / 退院前面談", savedNote: "退院前面談に参加し、退院後支援体制を調整した。" },
    { recordId: "r5", targetMonth: "2026-03", performedAt: "2026-03-13 13:25", clientId: "1002", organizationId: "22", serviceId: "302", staffId: "503", additionCode: "mededu", actionType: "面談", finalStatus: "自動確定", postCheckStatus: "ok", postCheckSummary: "同月1回まで。今月既存0件で範囲内です。", evaluatedAt: "2026-03-13 14:00", rationale: "病院・訪看・薬局グループ / モニタリング月 / 外出先 / 面談", savedNote: "訪看と面談し、モニタリング結果を共有した。" },
    { recordId: "r6", targetMonth: "2026-01", performedAt: "2026-01-21 10:15", clientId: "1003", organizationId: "21", serviceId: "301", staffId: "501", additionCode: "hospital_info_i", actionType: "情報共有", finalStatus: "自動確定", postCheckStatus: "ok", postCheckSummary: "同月1回まで。今月既存0件で範囲内です。 / IIとの併算定不可。今月の併算定不可記録は見つかっていません。", evaluatedAt: "2026-01-21 10:40", rationale: "病院グループ / 外出先 / 情報共有", savedNote: "入院に当たり病院を訪問し、生活状況と支援上の留意点を情報提供した。" },
  ],
};

const baseReportViews = {
  monthly_claim: {
    name: "月次請求用",
    columns: ["targetMonth", "clientName", "additionName", "organizationName", "finalStatus", "evaluatedAt"],
    savedFilters: { targetMonth: "2026-03", client: "", addition: "", status: "", postCheckStatus: "", organization: "", staff: "" },
  },
  audit_lookup: {
    name: "監査確認用",
    columns: ["performedAt", "evaluatedAt", "clientName", "organizationName", "staffName", "additionName", "postCheckSummary", "rationale", "savedNote"],
    savedFilters: { targetMonth: "", client: "", addition: "", status: "", postCheckStatus: "", organization: "", staff: "" },
  },
  review_queue: {
    name: "要確認中心",
    columns: ["targetMonth", "clientName", "organizationName", "additionName", "finalStatus", "postCheckSummary", "savedNote"],
    savedFilters: { targetMonth: "2026-03", client: "", addition: "", status: "要確認", postCheckStatus: "review", organization: "", staff: "" },
  },
};

const apiConfig = {
  baseCandidates: ["./api", "../backend/public/api"],
  reportLimit: 500,
};

const storageKeys = {
  reportViews: "kasan-v3-report-views",
  activeView: "kasan-v3-active-report-view",
};

const columnCatalog = {
  targetMonth: { label: "対象月", getValue: (record) => record.targetMonth },
  performedAt: { label: "対応日時", getValue: (record) => record.performedAt || "-" },
  clientName: { label: "利用者名", getValue: (record) => record.clientName },
  organizationName: { label: "機関名", getValue: (record) => record.organizationName },
  staffName: { label: "相談員", getValue: (record) => record.staffName },
  additionName: { label: "加算名", getValue: (record) => record.additionName },
  finalStatus: { label: "判定状態", getValue: (record) => record.finalStatus },
  postCheckStatus: { label: "後段状態", getValue: (record) => formatPostCheckStatusLabel(record.postCheckStatus) },
  postCheckSummary: { label: "後段チェック", getValue: (record) => record.postCheckSummary || "-" },
  evaluatedAt: { label: "保存日時", getValue: (record) => record.evaluatedAt },
  rationale: { label: "判定根拠", getValue: (record) => record.rationale },
  savedNote: { label: "保存文", getValue: (record) => record.savedNote },
};

const questionDefinitions = [
  {
    key: "monthType",
    label: "対応した時期はどれですか",
    helper: "利用者の対象区分と機関・サービス条件は、選択済みの文脈から自動で候補に反映します。",
    options: [
      { value: "モニタリング月", note: "モニタリング実施月に該当する場合" },
      { value: "計画作成月", note: "計画作成や更新の対象月に該当する場合" },
      { value: "それ以外", note: "通常月の支援や集中支援など" },
    ],
  },
  {
    key: "placeType",
    label: "対応した場所はどこですか",
    helper: "ここでは制度用語より先に、実際にどこで対応したかだけを聞きます。",
    options: [
      { value: "自事業所内", note: "電話、自事業所内の会議、面談など" },
      { value: "外出先", note: "訪問、同行、外部会議、現地確認など" },
    ],
  },
  {
    key: "actionType",
    label: "その場で何をしましたか",
    helper: "相談員が迷いやすい用語は、あとで管理者説明を載せられる前提です。",
    getOptions(answers) {
      if (answers.placeType === "自事業所内") {
        return [
          { value: "情報共有", note: "電話や文書、短時間面談で情報をやり取りした" },
          { value: "会議", note: "担当者会議以外の打合せや連絡会を行った" },
          { value: "担当者会議開催", note: "モニタリングに当たりサービス担当者会議を開催した" },
          { value: "面談", note: "個別に面談して状況や支援を確認した" },
        ];
      }

      return [
        { value: "訪問", note: "現地へ行って支援状況や本人の様子を確認した" },
        { value: "情報共有", note: "外部機関を訪ねるなどして必要な情報を伝えた" },
        { value: "会議", note: "担当者会議以外の外部会議や打合せに参加した" },
        { value: "担当者会議開催", note: "外部会場などでサービス担当者会議を開催した" },
        { value: "面談", note: "外部で関係者や本人と面談した" },
        { value: "サービス提供場面確認", note: "サービス提供の実際の場面を確認した" },
        { value: "退院前面談", note: "退院・退所前の面談や調整を行った" },
      ];
    },
  },
];

const state = {
  activeSection: "judgement",
  quickSearch: "",
  dataSource: {
    apiBaseUrl: "",
    configReady: false,
    clients: "sample",
    organizations: "sample",
    services: "sample",
    staffs: "sample",
    judgement: "sample",
    report: "sample",
    relations: "sample",
    note: "",
  },
  masters: {
    clients: [],
    organizations: [],
    services: [],
    staffs: [],
  },
  judgement: {
    clientId: "1001",
    staffId: "501",
    targetMonth: "2026-03",
    performedAt: "",
    organizationId: "",
    serviceId: "",
    enrollments: [],
    contextClientId: "",
    loadingContext: false,
    requestToken: 0,
    historyRecords: [],
    historyLoading: false,
    historyRequestToken: 0,
    historyError: "",
    answers: { monthType: "", placeType: "", actionType: "" },
    history: [],
    saveStatus: "未保存",
    saveSummary: "保存待ち",
    saving: false,
    lastSavedRecordId: "",
  },
  report: {
    activeViewCode: loadActiveViewCode(),
    views: loadReportViews(),
    filters: { ...baseReportViews[loadActiveViewCode()].savedFilters },
    selectedRecordId: "r1",
    selectedColumnKey: "",
    records: [],
    loading: false,
    requestToken: 0,
  },
  relations: {
    selectedClientId: "1001",
    selectedOrganizationId: "10",
    organizationServicesByOrganizationId: {},
    clientEnrollmentsByClientId: {},
    loadingOrganizationServicesForId: "",
    loadingClientEnrollmentsForId: "",
    organizationServicesRequestToken: 0,
    clientEnrollmentsRequestToken: 0,
    organizationServiceDefinitionId: "",
    organizationServiceStatus: "未保存",
    savingOrganizationService: false,
    deactivatingOrganizationServiceId: "",
    clientOrganizationId: "10",
    clientOrganizationServiceId: "",
    clientEnrollmentGroupName: "",
    clientEnrollmentStatus: "未保存",
    savingClientEnrollment: false,
    deactivatingClientEnrollmentId: "",
  },
};

state.report.records = buildSampleReportRecords();

const dom = {
  navButtons: document.querySelectorAll(".nav-button"),
  panels: document.querySelectorAll("[data-section-panel]"),
  quickSearchInput: document.querySelector("#quick-search-input"),
  quickSearchStatus: document.querySelector("#quick-search-status"),
  apiDataStatus: document.querySelector("#api-data-status"),
  judgement: {
    status: document.querySelector("#judgement-status"),
    client: document.querySelector("#judgement-client"),
    clientTarget: document.querySelector("#judgement-client-target"),
    targetMonth: document.querySelector("#judgement-target-month"),
    performedAt: document.querySelector("#judgement-performed-at"),
    staff: document.querySelector("#judgement-staff"),
    staffHome: document.querySelector("#judgement-staff-home"),
    organization: document.querySelector("#judgement-organization"),
    organizationGroup: document.querySelector("#judgement-organization-group"),
    service: document.querySelector("#judgement-service"),
    serviceCategory: document.querySelector("#judgement-service-category"),
    questionLabel: document.querySelector("#judgement-question-label"),
    questionMeta: document.querySelector("#judgement-question-meta"),
    questionHelper: document.querySelector("#judgement-question-helper"),
    options: document.querySelector("#judgement-options"),
    candidates: document.querySelector("#judgement-candidates"),
    answers: document.querySelector("#judgement-answers"),
    prevButton: document.querySelector("#judgement-prev-button"),
    resetButton: document.querySelector("#judgement-reset-button"),
    resultMain: document.querySelector("#judgement-result-main"),
    resultCheck: document.querySelector("#judgement-result-check"),
    resultNext: document.querySelector("#judgement-result-next"),
    saveSummary: document.querySelector("#judgement-save-summary"),
    saveNote: document.querySelector("#judgement-save-note"),
    saveStatus: document.querySelector("#judgement-save-status"),
    saveButton: document.querySelector("#judgement-save-button"),
  },
  report: {
    activeViewLabel: document.querySelector("#report-active-view-label"),
    viewButtons: document.querySelector("#report-view-buttons"),
    selectedColumn: document.querySelector("#report-selected-column"),
    columnLeft: document.querySelector("#report-column-left"),
    columnRight: document.querySelector("#report-column-right"),
    filterMonth: document.querySelector("#report-filter-month"),
    filterClient: document.querySelector("#report-filter-client"),
    filterAddition: document.querySelector("#report-filter-addition"),
    filterStatus: document.querySelector("#report-filter-status"),
    filterPostCheckStatus: document.querySelector("#report-filter-post-check-status"),
    filterOrganization: document.querySelector("#report-filter-organization"),
    filterStaff: document.querySelector("#report-filter-staff"),
    applyFilters: document.querySelector("#report-apply-filters"),
    saveFilters: document.querySelector("#report-save-filters"),
    resetFilters: document.querySelector("#report-reset-filters"),
    resultCount: document.querySelector("#report-result-count"),
    tableHead: document.querySelector("#report-table-head"),
    tableBody: document.querySelector("#report-table-body"),
    detailClient: document.querySelector("#report-detail-client"),
    detailPerformedAt: document.querySelector("#report-detail-performed-at"),
    detailAddition: document.querySelector("#report-detail-addition"),
    detailEvaluatedAt: document.querySelector("#report-detail-evaluated-at"),
    detailPostCheck: document.querySelector("#report-detail-post-check"),
    detailRationale: document.querySelector("#report-detail-rationale"),
    detailNote: document.querySelector("#report-detail-note"),
    viewSummary: document.querySelector("#report-view-summary"),
  },
  masters: {
    clientsCount: document.querySelector("#clients-count"),
    clientsBody: document.querySelector("#clients-table-body"),
    clientSelected: document.querySelector("#client-enrollment-selected-client"),
    clientSelectedTarget: document.querySelector("#client-enrollment-selected-target"),
    clientEnrollmentOrganization: document.querySelector("#client-enrollment-organization"),
    clientEnrollmentOrganizationService: document.querySelector("#client-enrollment-organization-service"),
    clientEnrollmentOrganizationServiceHelp: document.querySelector("#client-enrollment-organization-service-help"),
    clientEnrollmentGroupName: document.querySelector("#client-enrollment-group-name"),
    clientEnrollmentStatus: document.querySelector("#client-enrollment-status"),
    clientEnrollmentSave: document.querySelector("#client-enrollment-save"),
    clientEnrollmentList: document.querySelector("#client-enrollment-list"),
    organizationsCount: document.querySelector("#organizations-count"),
    organizationsBody: document.querySelector("#organizations-table-body"),
    organizationSelected: document.querySelector("#organization-service-selected-organization"),
    organizationSelectedGroup: document.querySelector("#organization-service-selected-group"),
    organizationServiceDefinition: document.querySelector("#organization-service-service-definition"),
    organizationServiceStatus: document.querySelector("#organization-service-status"),
    organizationServiceSave: document.querySelector("#organization-service-save"),
    organizationServiceList: document.querySelector("#organization-service-list"),
    servicesCount: document.querySelector("#services-count"),
    servicesBody: document.querySelector("#services-table-body"),
  },
};

initialize();

function initialize() {
  initializeJudgementDefaults();
  initializeReportFilters();
  initializeRelationDefaults();
  bindNavigation();
  bindQuickSearch();
  bindJudgementControls();
  bindReportControls();
  bindMasterControls();
  updateApiDataStatusPill();
  renderApp();
  void initializeApiData();
}

async function initializeApiData() {
  const detection = await detectApiBaseUrl();
  if (!detection) {
    state.dataSource.note = "API未接続";
    updateApiDataStatusPill();
    return;
  }

  state.dataSource.apiBaseUrl = detection.baseUrl;
  state.dataSource.configReady = Boolean(detection.health?.checks?.config);
  state.dataSource.note = state.dataSource.configReady ? "" : "API設定待ち";
  updateApiDataStatusPill();

  if (!state.dataSource.configReady) {
    return;
  }

  await loadMastersFromApi();
  ensureRelationSelections();
  await Promise.all([
    loadOrganizationServices(state.relations.selectedOrganizationId),
    loadClientEnrollments(state.relations.selectedClientId),
  ]);
  if (canUseApiJudgementContext()) {
    await loadJudgementContextFromApi(state.judgement.clientId);
  }
  await loadReportRecordsFromApi();
  await loadJudgementHistoryRecords(state.judgement.clientId, state.judgement.targetMonth);
}

async function detectApiBaseUrl() {
  for (const baseUrl of apiConfig.baseCandidates) {
    try {
      const response = await fetchApiJson(`${baseUrl}/health.php`);
      return { baseUrl, health: response };
    } catch (error) {
      continue;
    }
  }
  return null;
}

async function loadMastersFromApi() {
  const endpoints = [
    { key: "clients", path: "clients.php", normalize: normalizeApiClient },
    { key: "organizations", path: "organizations.php", normalize: normalizeApiOrganization },
    { key: "services", path: "services.php", normalize: normalizeApiService },
    { key: "staffs", path: "staffs.php", normalize: normalizeApiStaff },
  ];

  const results = await Promise.allSettled(endpoints.map(async ({ key, path, normalize }) => {
    const response = await fetchApiJson(buildApiUrl(path));
    return { key, items: (response.items ?? []).map(normalize) };
  }));

  results.forEach((result, index) => {
    const { key } = endpoints[index];
    if (result.status === "fulfilled") {
      state.masters[key] = result.value.items;
      state.dataSource[key] = "api";
      return;
    }

    state.masters[key] = [];
    state.dataSource[key] = "sample";
    state.dataSource.note = result.reason?.message ?? "一部API未接続";
  });

  if (results.every((result) => result.status === "fulfilled") && state.dataSource.report === "api") {
    state.dataSource.note = "";
  }

  updateApiDataStatusPill();
  syncJudgementStaffSelection();
  ensureRelationSelections();
  renderMasters();
  renderJudgement();
  renderQuickSearchStatus();
}

async function loadOrganizationServices(organizationId, { force = false } = {}) {
  const normalizedOrganizationId = String(organizationId ?? "");
  if (!normalizedOrganizationId) {
    return;
  }

  if (!canUseApiRelations()) {
    state.dataSource.relations = "sample";
    state.relations.organizationServicesByOrganizationId[normalizedOrganizationId] = buildSampleOrganizationServices(normalizedOrganizationId);
    syncRelationFormSelections();
    renderMasters();
    renderJudgement();
    return;
  }

  if (!force && state.relations.organizationServicesByOrganizationId[normalizedOrganizationId]) {
    syncRelationFormSelections();
    renderMasters();
    renderJudgement();
    return;
  }

  const requestToken = ++state.relations.organizationServicesRequestToken;
  state.relations.loadingOrganizationServicesForId = normalizedOrganizationId;
  renderMasters();

  try {
    const response = await fetchApiJson(buildApiUrl("organization-services.php", { organization_id: normalizedOrganizationId }));
    if (requestToken !== state.relations.organizationServicesRequestToken) {
      return;
    }

    state.relations.organizationServicesByOrganizationId[normalizedOrganizationId] = (response.items ?? []).map(normalizeApiOrganizationService);
    state.dataSource.relations = "api";
    state.dataSource.note = "";
    syncRelationFormSelections();
  } catch (error) {
    if (requestToken !== state.relations.organizationServicesRequestToken) {
      return;
    }

    state.relations.organizationServicesByOrganizationId[normalizedOrganizationId] = [];
    state.dataSource.relations = "sample";
    state.dataSource.note = error.message;
    syncRelationFormSelections();
  } finally {
    if (requestToken !== state.relations.organizationServicesRequestToken) {
      return;
    }

    state.relations.loadingOrganizationServicesForId = "";
    updateApiDataStatusPill();
    renderMasters();
    renderJudgement();
  }
}

async function loadClientEnrollments(clientId, { force = false } = {}) {
  const normalizedClientId = String(clientId ?? "");
  if (!normalizedClientId) {
    return;
  }

  if (!canUseApiRelations()) {
    state.dataSource.relations = "sample";
    state.relations.clientEnrollmentsByClientId[normalizedClientId] = buildSampleClientEnrollments(normalizedClientId);
    renderMasters();
    return;
  }

  if (!force && state.relations.clientEnrollmentsByClientId[normalizedClientId]) {
    renderMasters();
    return;
  }

  const requestToken = ++state.relations.clientEnrollmentsRequestToken;
  state.relations.loadingClientEnrollmentsForId = normalizedClientId;
  renderMasters();

  try {
    const response = await fetchApiJson(buildApiUrl("client-enrollments.php", { client_id: normalizedClientId }));
    if (requestToken !== state.relations.clientEnrollmentsRequestToken) {
      return;
    }

    state.relations.clientEnrollmentsByClientId[normalizedClientId] = (response.items ?? []).map(normalizeApiClientEnrollment);
    state.dataSource.relations = "api";
    state.dataSource.note = "";
  } catch (error) {
    if (requestToken !== state.relations.clientEnrollmentsRequestToken) {
      return;
    }

    state.relations.clientEnrollmentsByClientId[normalizedClientId] = [];
    state.dataSource.relations = "sample";
    state.dataSource.note = error.message;
  } finally {
    if (requestToken !== state.relations.clientEnrollmentsRequestToken) {
      return;
    }

    state.relations.loadingClientEnrollmentsForId = "";
    updateApiDataStatusPill();
    renderMasters();
  }
}

async function loadJudgementContextFromApi(clientId) {
  if (!canUseApiJudgementContext() || !clientId) {
    state.dataSource.judgement = "sample";
    state.judgement.contextClientId = "";
    state.judgement.enrollments = [];
    renderJudgement();
    renderQuickSearchStatus();
    updateApiDataStatusPill();
    return;
  }

  const requestToken = ++state.judgement.requestToken;
  state.judgement.loadingContext = true;
  state.judgement.contextClientId = String(clientId);
  state.judgement.enrollments = [];
  state.dataSource.judgement = "sample";
  renderJudgement();
  updateApiDataStatusPill();

  try {
    const response = await fetchApiJson(buildApiUrl("judgement-context.php", { client_id: String(clientId) }));
    if (requestToken !== state.judgement.requestToken) {
      return;
    }
    state.judgement.enrollments = (response.enrollments ?? []).map(normalizeApiJudgementEnrollment);
    state.dataSource.judgement = "api";
    state.dataSource.note = "";
    syncJudgementStaffSelection();
    syncEnrollmentSelection();
  } catch (error) {
    if (requestToken !== state.judgement.requestToken) {
      return;
    }
    state.judgement.enrollments = [];
    state.dataSource.judgement = "sample";
    state.dataSource.note = error.message;
    syncJudgementStaffSelection();
    syncEnrollmentSelection();
  } finally {
    if (requestToken !== state.judgement.requestToken) {
      return;
    }
    state.judgement.loadingContext = false;
    updateApiDataStatusPill();
    renderJudgement();
    if (state.judgement.enrollments.length === 0 && state.judgement.organizationId) {
      void loadOrganizationServices(state.judgement.organizationId);
    }
    renderQuickSearchStatus();
  }
}

async function loadReportRecordsFromApi() {
  if (!state.dataSource.apiBaseUrl || !state.dataSource.configReady) {
    state.dataSource.report = "sample";
    state.report.records = buildSampleReportRecords();
    updateApiDataStatusPill();
    renderReport();
    renderQuickSearchStatus();
    return;
  }

  const requestToken = ++state.report.requestToken;
  state.report.loading = true;
  renderReport();

  try {
    const response = await fetchApiJson(buildApiUrl("report-records.php", buildReportApiParams()));
    if (requestToken !== state.report.requestToken) {
      return;
    }

    state.report.records = (response.items ?? []).map(normalizeApiReportRecord);
    state.dataSource.report = "api";
    state.dataSource.note = "";
  } catch (error) {
    if (requestToken !== state.report.requestToken) {
      return;
    }

    state.report.records = buildSampleReportRecords();
    state.dataSource.report = "sample";
    state.dataSource.note = error.message;
  } finally {
    if (requestToken !== state.report.requestToken) {
      return;
    }

    state.report.loading = false;
    updateApiDataStatusPill();
    renderReport();
    renderQuickSearchStatus();
  }
}

async function loadJudgementHistoryRecords(clientId, targetMonth) {
  const normalizedClientId = String(clientId ?? "");
  const normalizedTargetMonth = String(targetMonth ?? "");

  if (!normalizedClientId || !normalizedTargetMonth) {
    state.judgement.historyRecords = [];
    state.judgement.historyError = "";
    state.judgement.historyLoading = false;
    renderJudgement();
    return;
  }

  if (!canUseApiReport()) {
    state.judgement.historyRecords = getSampleJudgementHistoryRecords(normalizedClientId, normalizedTargetMonth);
    state.judgement.historyError = "";
    state.judgement.historyLoading = false;
    renderJudgement();
    return;
  }

  const requestToken = ++state.judgement.historyRequestToken;
  state.judgement.historyLoading = true;
  state.judgement.historyError = "";
  renderJudgement();

  try {
    const response = await fetchApiJson(buildApiUrl("report-records.php", {
      client_id: normalizedClientId,
      target_month: normalizedTargetMonth,
      limit: "500",
    }));

    if (requestToken !== state.judgement.historyRequestToken) {
      return;
    }

    state.judgement.historyRecords = (response.items ?? []).map(normalizeApiReportRecord);
    state.judgement.historyError = "";
  } catch (error) {
    if (requestToken !== state.judgement.historyRequestToken) {
      return;
    }

    state.judgement.historyRecords = [];
    state.judgement.historyError = error.message;
  } finally {
    if (requestToken !== state.judgement.historyRequestToken) {
      return;
    }

    state.judgement.historyLoading = false;
    renderJudgement();
  }
}

function initializeJudgementDefaults() {
  const enrollment = data.enrollments.find((item) => item.clientId === state.judgement.clientId);
  if (enrollment) {
    state.judgement.organizationId = enrollment.organizationId;
    state.judgement.serviceId = enrollment.serviceId;
  }
  state.judgement.staffId = data.staff[0]?.staffId ?? "";
}

function initializeReportFilters() {
  state.report.filters = { ...state.report.views[state.report.activeViewCode].savedFilters };
}

function initializeRelationDefaults() {
  state.relations.selectedClientId = data.clients[0]?.clientId ?? "";
  state.relations.selectedOrganizationId = data.organizations[0]?.organizationId ?? "";
  state.relations.clientOrganizationId = state.relations.selectedOrganizationId;
}

function bindNavigation() {
  for (const button of dom.navButtons) {
    button.addEventListener("click", () => {
      state.activeSection = button.dataset.section;
      renderNavigation();
      renderQuickSearchStatus();
      renderActiveSection();
    });
  }
}

function bindQuickSearch() {
  dom.quickSearchInput.addEventListener("input", (event) => {
    state.quickSearch = event.target.value.trim();
    renderActiveSection();
    renderQuickSearchStatus();
  });
}

function bindJudgementControls() {
  dom.judgement.client.addEventListener("change", (event) => {
    state.judgement.clientId = event.target.value;
    markJudgementDirty();
    resetJudgementAnswers();
    syncJudgementStaffSelection();
    syncEnrollmentSelection();
    renderJudgement();
    renderQuickSearchStatus();
    void loadJudgementHistoryRecords(state.judgement.clientId, state.judgement.targetMonth);
    if (canUseApiJudgementContext()) {
      void loadJudgementContextFromApi(state.judgement.clientId);
    }
  });

  dom.judgement.targetMonth.addEventListener("change", (event) => {
    state.judgement.targetMonth = event.target.value;
    markJudgementDirty();
    renderJudgement();
    void loadJudgementHistoryRecords(state.judgement.clientId, state.judgement.targetMonth);
  });

  dom.judgement.performedAt.addEventListener("change", (event) => {
    state.judgement.performedAt = event.target.value;
    markJudgementDirty();
    renderJudgement();
  });

  dom.judgement.staff.addEventListener("change", (event) => {
    state.judgement.staffId = event.target.value;
    markJudgementDirty();
    renderJudgement();
  });

  dom.judgement.organization.addEventListener("change", (event) => {
    state.judgement.organizationId = event.target.value;
    markJudgementDirty();
    syncServiceSelection();
    resetJudgementAnswers();
    renderJudgement();
    void loadOrganizationServices(state.judgement.organizationId);
  });

  dom.judgement.service.addEventListener("change", (event) => {
    state.judgement.serviceId = event.target.value;
    markJudgementDirty();
    resetJudgementAnswers();
    renderJudgement();
  });

  dom.judgement.prevButton.addEventListener("click", () => {
    const previousKey = state.judgement.history.pop();
    if (!previousKey) {
      return;
    }

    markJudgementDirty();
    state.judgement.answers[previousKey] = "";
    renderJudgement();
  });

  dom.judgement.resetButton.addEventListener("click", () => {
    markJudgementDirty();
    resetJudgementAnswers();
    renderJudgement();
  });

  dom.judgement.saveButton.addEventListener("click", () => {
    void saveJudgementEvaluation();
  });
}

function bindReportControls() {
  const reportInputs = [
    dom.report.filterMonth,
    dom.report.filterClient,
    dom.report.filterAddition,
    dom.report.filterStatus,
    dom.report.filterPostCheckStatus,
    dom.report.filterOrganization,
    dom.report.filterStaff,
  ];

  for (const input of reportInputs) {
    input.addEventListener("input", syncReportFiltersFromInputs);
    input.addEventListener("change", syncReportFiltersFromInputs);
  }

  dom.report.applyFilters.addEventListener("click", () => {
    syncReportFiltersFromInputs();
    if (canUseApiReport()) {
      void loadReportRecordsFromApi();
      return;
    }
    renderReport();
    renderQuickSearchStatus();
  });

  dom.report.saveFilters.addEventListener("click", () => {
    syncReportFiltersFromInputs();
    state.report.views[state.report.activeViewCode].savedFilters = { ...state.report.filters };
    persistReportViews();
    if (canUseApiReport()) {
      void loadReportRecordsFromApi();
      return;
    }
    renderReport();
  });

  dom.report.resetFilters.addEventListener("click", () => {
    state.report.filters = { ...state.report.views[state.report.activeViewCode].savedFilters };
    writeReportFiltersToInputs();
    if (canUseApiReport()) {
      void loadReportRecordsFromApi();
      return;
    }
    renderReport();
    renderQuickSearchStatus();
  });

  dom.report.columnLeft.addEventListener("click", () => moveSelectedColumn(-1));
  dom.report.columnRight.addEventListener("click", () => moveSelectedColumn(1));
}

function bindMasterControls() {
  dom.masters.organizationServiceDefinition.addEventListener("change", (event) => {
    state.relations.organizationServiceDefinitionId = event.target.value;
  });

  dom.masters.organizationServiceSave.addEventListener("click", () => {
    void saveOrganizationService();
  });

  dom.masters.clientEnrollmentOrganization.addEventListener("change", (event) => {
    state.relations.clientOrganizationId = event.target.value;
    state.relations.clientOrganizationServiceId = "";
    state.relations.clientEnrollmentStatus = "未保存";
    renderMasters();
    void loadOrganizationServices(state.relations.clientOrganizationId);
  });

  dom.masters.clientEnrollmentOrganizationService.addEventListener("change", (event) => {
    state.relations.clientOrganizationServiceId = event.target.value;
  });

  dom.masters.clientEnrollmentGroupName.addEventListener("input", (event) => {
    state.relations.clientEnrollmentGroupName = event.target.value;
  });

  dom.masters.clientEnrollmentSave.addEventListener("click", () => {
    void saveClientEnrollment();
  });
}

async function saveOrganizationService() {
  const organizationId = state.relations.selectedOrganizationId;
  const serviceDefinitionId = state.relations.organizationServiceDefinitionId;

  if (!organizationId || !serviceDefinitionId) {
    state.relations.organizationServiceStatus = "機関とサービスを選んでください";
    renderMasters();
    return;
  }

  if (!canUseApiRelations()) {
    state.relations.organizationServiceStatus = "API接続後に登録できます";
    renderMasters();
    return;
  }

  state.relations.savingOrganizationService = true;
  state.relations.organizationServiceStatus = "登録中";
  renderMasters();

  try {
    await fetchApiJson(buildApiUrl("organization-services.php"), {
      method: "POST",
      body: JSON.stringify({
        organization_id: Number(organizationId),
        service_definition_id: Number(serviceDefinitionId),
      }),
    });

    state.relations.organizationServiceStatus = "登録しました";
    await loadMastersFromApi();
    await loadOrganizationServices(organizationId, { force: true });

    if (state.relations.clientOrganizationId === organizationId) {
      await loadOrganizationServices(organizationId, { force: true });
    }
  } catch (error) {
    state.relations.organizationServiceStatus = error.message;
  } finally {
    state.relations.savingOrganizationService = false;
    renderMasters();
  }
}

async function saveClientEnrollment() {
  const clientId = state.relations.selectedClientId;
  const organizationServiceId = state.relations.clientOrganizationServiceId;

  if (!clientId || !organizationServiceId) {
    state.relations.clientEnrollmentStatus = "利用者と機関サービスを選んでください";
    renderMasters();
    return;
  }

  if (!canUseApiRelations()) {
    state.relations.clientEnrollmentStatus = "API接続後に登録できます";
    renderMasters();
    return;
  }

  state.relations.savingClientEnrollment = true;
  state.relations.clientEnrollmentStatus = "登録中";
  renderMasters();

  try {
    await fetchApiJson(buildApiUrl("client-enrollments.php"), {
      method: "POST",
      body: JSON.stringify({
        client_id: Number(clientId),
        organization_service_id: Number(organizationServiceId),
        group_name: state.relations.clientEnrollmentGroupName.trim(),
      }),
    });

    state.relations.clientEnrollmentStatus = "登録しました";
    state.relations.clientEnrollmentGroupName = "";
    await loadClientEnrollments(clientId, { force: true });

    if (state.judgement.clientId === clientId && canUseApiJudgementContext()) {
      await loadJudgementContextFromApi(clientId);
    } else {
      renderJudgement();
    }
  } catch (error) {
    state.relations.clientEnrollmentStatus = error.message;
  } finally {
    state.relations.savingClientEnrollment = false;
    renderMasters();
  }
}

function markJudgementDirty() {
  state.judgement.saveStatus = "未保存";
  state.judgement.saveSummary = "保存待ち";
  state.judgement.lastSavedRecordId = "";
}

async function saveJudgementEvaluation() {
  const snapshot = buildJudgementSnapshot();
  if (!snapshot.canSave) {
    state.judgement.saveStatus = snapshot.blockReason;
    renderJudgement();
    return;
  }

  state.judgement.saving = true;
  state.judgement.saveStatus = "保存中";
  renderJudgement();

  try {
    if (canUseApiJudgementSave()) {
      const response = await fetchApiJson(buildApiUrl("evaluation-cases.php"), {
        method: "POST",
        body: JSON.stringify(buildJudgementSavePayload(snapshot)),
      });

      state.judgement.lastSavedRecordId = String(response.item?.evaluation_case_id ?? "");
      state.judgement.saveStatus = state.judgement.lastSavedRecordId
        ? `保存しました (#${state.judgement.lastSavedRecordId})`
        : "保存しました";
      state.report.selectedRecordId = state.judgement.lastSavedRecordId || state.report.selectedRecordId;
      await loadReportRecordsFromApi();
      await loadJudgementHistoryRecords(state.judgement.clientId, state.judgement.targetMonth);
    } else {
      const savedRecord = saveJudgementEvaluationToSample(snapshot);
      state.judgement.lastSavedRecordId = savedRecord.recordId;
      state.judgement.saveStatus = `保存しました (${savedRecord.recordId})`;
      state.report.selectedRecordId = savedRecord.recordId;
      state.judgement.historyRecords = getSampleJudgementHistoryRecords(state.judgement.clientId, state.judgement.targetMonth);
      renderReport();
      renderQuickSearchStatus();
    }
  } catch (error) {
    state.judgement.saveStatus = error.message;
  } finally {
    state.judgement.saving = false;
    renderJudgement();
  }
}

function buildJudgementSavePayload(snapshot) {
  return {
    client_enrollment_id: snapshot.clientEnrollmentId,
    client_id: Number(snapshot.client.clientId),
    organization_id: Number(snapshot.organization.organizationId),
    service_definition_id: Number(snapshot.service.serviceId),
    service_group_id: snapshot.serviceGroupId,
    staff_id: Number(snapshot.staff.staffId),
    target_month: state.judgement.targetMonth,
    performed_at: snapshot.performedAt || null,
    final_status: snapshot.finalStatus,
    addition_name: snapshot.displayAdditionName,
    message: snapshot.rationale,
    final_note_text: snapshot.noteText,
    answers: { ...state.judgement.answers },
    request: {
      client_id: snapshot.client.clientId,
      client_name: snapshot.client.clientName,
      organization_id: snapshot.organization.organizationId,
      organization_name: snapshot.organization.organizationName,
      organization_type: deriveResolvedOrganizationType(snapshot.organization, snapshot.service),
      organization_group: snapshot.organizationGroup,
      service_definition_id: snapshot.service.serviceId,
      service_name: snapshot.service.serviceName,
      service_category: snapshot.service.serviceCategory,
      staff_id: snapshot.staff.staffId,
      staff_name: snapshot.staff.staffName,
      target_month: state.judgement.targetMonth,
      performed_at: snapshot.performedAt || "",
      answers: { ...state.judgement.answers },
      candidate_names: snapshot.candidates.map((candidate) => candidate.additionName),
      candidate_count: snapshot.candidates.length,
    },
    result: {
      addition_code: snapshot.topCandidate?.additionCode ?? "",
      addition_name: snapshot.displayAdditionName,
      primary_addition_name: snapshot.topCandidate?.additionName ?? "",
      candidate_count: snapshot.candidates.length,
      candidate_names: snapshot.candidates.map((candidate) => candidate.additionName),
      post_check: snapshot.postCheckSummary,
      post_check_status: snapshot.postCheckStatus,
      reason: snapshot.rationale,
      final_note_text: snapshot.noteText,
    },
  };
}

function buildJudgementSnapshot() {
  const client = getClientById(state.judgement.clientId);
  const organization = getOrganizationById(state.judgement.organizationId);
  const service = getServiceById(state.judgement.serviceId);
  const staff = getStaffById(state.judgement.staffId);
  const candidates = getJudgementCandidates();
  const currentQuestion = getVisibleQuestions().find((question) => !state.judgement.answers[question.key]);
  const topCandidate = candidates[0] ?? null;
  const matchedEnrollment = findMatchedJudgementEnrollment();
  const hasBlockingQuestion = Boolean(currentQuestion);
  const hasAnyCandidate = candidates.length > 0;
  const canSave = Boolean(
    !state.judgement.loadingContext
    && client
    && organization
    && service
    && staff
    && hasAnyCandidate
    && !hasBlockingQuestion
  );

  let saveSummary = "保存待ち";
  let blockReason = "";
  const organizationGroup = getOrganizationGroupLabel(organization, service);
  const performedAt = normalizePerformedAtForStorage(state.judgement.performedAt);
  const postCheckResult = evaluateJudgementPostChecks({
    candidates,
    currentQuestion,
    topCandidate,
    organization,
  });

  if (state.judgement.loadingContext) {
    saveSummary = "利用状況読込中";
    blockReason = "利用状況の読込完了後に保存できます";
  } else if (!client || !organization || !service || !staff) {
    saveSummary = "文脈不足";
    blockReason = "利用者・機関・サービス・相談員を選んでください";
  } else if (!hasAnyCandidate) {
    saveSummary = "候補なし";
    blockReason = "候補がないため保存できません";
  } else if (hasBlockingQuestion) {
    saveSummary = `未完了: ${currentQuestion.label}`;
    blockReason = "未回答の設問が残っています";
  } else if (candidates.length === 1 && postCheckResult.requiresReview) {
    saveSummary = `要確認で保存 (${postCheckResult.saveLabel})`;
  } else if (candidates.length === 1) {
    saveSummary = "自動確定で保存";
  } else {
    saveSummary = `要確認で保存 (${candidates.length}候補)`;
  }

  const finalStatus = candidates.length === 1 && !postCheckResult.requiresReview ? "自動確定" : "要確認";
  const displayAdditionName = topCandidate
    ? (candidates.length === 1 ? topCandidate.additionName : `${topCandidate.additionName} ほか${candidates.length - 1}件`)
    : "";
  const rationale = buildJudgementRationale({
    candidates,
    currentQuestion,
    topCandidate,
    organizationGroup,
    postCheckResult,
  });
  const noteText = buildJudgementSaveNote({
    client,
    organization,
    service,
    staff,
    candidates,
    topCandidate,
    finalStatus,
    postCheckResult,
  });

  return {
    client,
    organization,
    service,
    staff,
    candidates,
    currentQuestion,
    topCandidate,
    matchedEnrollment,
    clientEnrollmentId: normalizeNumericId(matchedEnrollment?.clientEnrollmentId ?? matchedEnrollment?.enrollmentId ?? ""),
    serviceGroupId: normalizeNumericId(matchedEnrollment?.serviceGroupId ?? ""),
    organizationGroup,
    performedAt,
    canSave,
    blockReason,
    saveSummary,
    finalStatus,
    displayAdditionName,
    rationale,
    noteText,
    postCheckSummary: postCheckResult.summary,
    postCheckNextAction: postCheckResult.nextAction,
    postCheckStatus: postCheckResult.status,
  };
}

function buildJudgementRationale({ candidates, currentQuestion, topCandidate, organizationGroup, postCheckResult }) {
  if (candidates.length === 0) {
    return "候補が残らなかったため、条件の見直しが必要です。";
  }

  const sharedFacts = [
    organizationGroup,
    state.judgement.answers.monthType,
    state.judgement.answers.placeType,
    state.judgement.answers.actionType,
  ].filter(Boolean);

  if (candidates.length === 1 && topCandidate && currentQuestion) {
    return `${topCandidate.reason} 次の設問「${currentQuestion.label}」で確定条件を確認します。`;
  }

  if (candidates.length === 1 && topCandidate) {
    const detail = sharedFacts.length > 0 ? `${sharedFacts.join(" / ")}。` : "";
    return `${topCandidate.reason} ${detail}${postCheckResult.summary}`;
  }

  const candidateNames = candidates.slice(0, 3).map((candidate) => candidate.additionName).join(" / ");
  if (currentQuestion) {
    return `候補は ${candidateNames} が残っています。次の設問「${currentQuestion.label}」の回答後に保存できます。`;
  }

  return `候補は ${candidateNames}${candidates.length > 3 ? ` ほか${candidates.length - 3}件` : ""}。制度確認が必要なため要確認で保存します。`;
}

function buildJudgementSaveNote({ client, organization, service, staff, candidates, topCandidate, finalStatus, postCheckResult }) {
  if (!client || !organization || !service || !staff || !topCandidate) {
    return "保存対象の判定結果がまだ整っていません。";
  }

  const actionParts = [
    state.judgement.answers.monthType,
    state.judgement.answers.placeType,
    state.judgement.answers.actionType,
  ].filter(Boolean);
  const actionText = actionParts.length > 0 ? actionParts.join(" / ") : "対応内容未整理";

  if (finalStatus === "自動確定") {
    return `${state.judgement.targetMonth}、${staff.staffName}が${client.clientName}について、${organization.organizationName}の${service.serviceName}に関する${actionText}を実施。${topCandidate.additionName}として記録する。`;
  }

  if (candidates.length === 1) {
    return `${state.judgement.targetMonth}、${staff.staffName}が${client.clientName}について、${organization.organizationName}の${service.serviceName}に関する${actionText}を実施。${topCandidate.additionName}候補だが、${postCheckResult.summary}のため要確認で記録する。`;
  }

  const candidateNames = candidates.slice(0, 3).map((candidate) => candidate.additionName).join(" / ");
  return `${state.judgement.targetMonth}、${staff.staffName}が${client.clientName}について、${organization.organizationName}の${service.serviceName}に関する${actionText}を実施。候補は ${candidateNames}${candidates.length > 3 ? ` ほか${candidates.length - 3}件` : ""} のため要確認で記録する。`;
}

function evaluateJudgementPostChecks({ candidates, currentQuestion, topCandidate, organization }) {
  if (!topCandidate) {
    return {
      status: "none",
      requiresReview: false,
      summary: "前の条件を見直してください。",
      nextAction: "機関・サービス・回答のどこで外れたか確認",
      saveLabel: "候補なし",
    };
  }

  if (currentQuestion) {
    return {
      status: "pending",
      requiresReview: false,
      summary: `まず「${currentQuestion.label}」に回答してください。`,
      nextAction: `次の設問: ${currentQuestion.label}`,
      saveLabel: "設問未完了",
    };
  }

  if (candidates.length > 1) {
    return {
      status: "pending",
      requiresReview: false,
      summary: "候補確定後に回数制限や併算定を確認します。",
      nextAction: currentQuestion ? `まず「${currentQuestion.label}」に回答` : "候補が複数のため制度確認",
      saveLabel: "候補未確定",
    };
  }

  if (state.judgement.historyLoading) {
    return {
      status: "review",
      requiresReview: true,
      summary: "保存済み履歴を確認中です。後段チェックは要確認で扱います。",
      nextAction: "履歴読込完了後に再確認",
      saveLabel: "履歴確認中",
    };
  }

  if (state.judgement.historyError) {
    return {
      status: "review",
      requiresReview: true,
      summary: "保存済み履歴を確認できませんでした。後段チェックは要確認です。",
      nextAction: "集計で同月記録を確認",
      saveLabel: "履歴確認エラー",
    };
  }

  const rules = Array.isArray(topCandidate.postCheckRules)
    ? topCandidate.postCheckRules.filter((rule) => rule && rule.code)
    : [];

  if (rules.length === 0) {
    return {
      status: "ok",
      requiresReview: false,
      summary: topCandidate.postCheck || "追加の後段チェックはありません。",
      nextAction: "保存文を確認して保存",
      saveLabel: "後段チェックなし",
    };
  }

  const evaluations = rules.map((rule) => evaluatePostCheckRule(rule, {
    candidate: topCandidate,
    currentOrganizationId: organization?.organizationId ?? "",
  }));
  const visibleEvaluations = evaluations.filter((item) => item.message);
  const warnings = evaluations.filter((item) => item.level === "review");

  if (warnings.length > 0) {
    return {
      status: "review",
      requiresReview: true,
      summary: warnings.map((item) => item.message).join(" / "),
      nextAction: "集計で同月記録を確認してから請求判断",
      saveLabel: "後段チェック要確認",
    };
  }

  return {
    status: "ok",
    requiresReview: false,
    summary: visibleEvaluations.length > 0
      ? visibleEvaluations.map((item) => item.message).join(" / ")
      : (topCandidate.postCheck || "追加の後段チェックはありません。"),
    nextAction: "保存文を確認して保存",
    saveLabel: "後段チェック済み",
  };
}

function evaluatePostCheckRule(rule, context) {
  if (!rule || !rule.code) {
    return { level: "info", message: "後段チェック定義なし" };
  }

  const candidateHistory = getJudgementHistoryRecordsForCandidate(context.candidate);

  if (rule.code === "monthly_limit_per_client") {
    const existingCount = candidateHistory.length;
    if (existingCount >= Number(rule.limit ?? 0)) {
      return {
        level: "review",
        message: `${rule.label}。今月すでに${existingCount}件あります。`,
      };
    }

    return {
      level: "ok",
      message: `${rule.label}。今月既存${existingCount}件で範囲内です。`,
    };
  }

  if (rule.code === "monthly_action_count_min") {
    const requiredActions = Array.isArray(rule.actionTypes) ? rule.actionTypes.filter(Boolean) : [];
    const currentActionType = String(state.judgement.answers.actionType ?? "").trim();

    if (requiredActions.length > 0 && currentActionType && !requiredActions.includes(currentActionType)) {
      return { level: "skip", message: "" };
    }

    const actionHistory = candidateHistory.filter((record) => (
      requiredActions.length === 0
      || requiredActions.includes(String(record.actionType ?? "").trim())
    ));
    const projectedCount = actionHistory.length + 1;

    if (projectedCount < Number(rule.minimum ?? 0)) {
      return {
        level: "review",
        message: `${rule.label}。今回を含めて${projectedCount}回です。`,
      };
    }

    return {
      level: "ok",
      message: `${rule.label}。今回を含めて${projectedCount}回で条件内です。`,
    };
  }

  if (rule.code === "monthly_distinct_organization_limit_per_client") {
    const organizationIds = new Set(
      candidateHistory
        .map((item) => String(item.organizationId ?? ""))
        .filter(Boolean),
    );
    if (context.currentOrganizationId) {
      organizationIds.add(String(context.currentOrganizationId));
    }

    const projectedCount = organizationIds.size;
    if (projectedCount > Number(rule.limit ?? 0)) {
      return {
        level: "review",
        message: `${rule.label}。今回を含めると${projectedCount}機関になります。`,
      };
    }

    return {
      level: "ok",
      message: `${rule.label}。今回を含めて${projectedCount}機関です。`,
    };
  }

  if (rule.code === "exclusive_with_addition_codes") {
    const exclusiveCodes = Array.isArray(rule.additionCodes)
      ? rule.additionCodes.map((item) => String(item ?? "").trim()).filter(Boolean)
      : [];

    if (exclusiveCodes.length === 0) {
      return { level: "skip", message: "" };
    }

    const conflictingRecords = state.judgement.historyRecords.filter((record) => (
      exclusiveCodes.includes(String(record.additionCode ?? "").trim())
    ));

    if (conflictingRecords.length > 0) {
      const names = Array.from(new Set(
        conflictingRecords.map((record) => String(record.additionName ?? "").trim()).filter(Boolean),
      ));
      const label = names.length > 0 ? names.join(" / ") : exclusiveCodes.join(" / ");
      return {
        level: "review",
        message: `${rule.label}。今月すでに ${label} の記録があります。`,
      };
    }

    return {
      level: "ok",
      message: `${rule.label}。今月の併算定不可記録は見つかっていません。`,
    };
  }

  return {
    level: "info",
    message: rule.label || rule.code,
  };
}

function getJudgementHistoryRecordsForCandidate(candidate) {
  const candidateCode = String(candidate?.additionCode ?? "").trim();
  const candidateName = normalizeText(candidate?.additionName ?? "");

  return state.judgement.historyRecords.filter((record) => {
    const recordCode = String(record.additionCode ?? "").trim();
    if (candidateCode && recordCode) {
      return recordCode === candidateCode;
    }

    return normalizeText(record.additionName ?? "") === candidateName;
  });
}

function renderJudgementSave(snapshot) {
  if (state.judgement.saving) {
    dom.judgement.saveSummary.textContent = "保存中";
  } else if (state.judgement.lastSavedRecordId) {
    dom.judgement.saveSummary.textContent = `保存済み / 最新 #${state.judgement.lastSavedRecordId}`;
  } else {
    dom.judgement.saveSummary.textContent = snapshot.saveSummary;
  }
  dom.judgement.saveNote.textContent = snapshot.noteText;
  dom.judgement.saveStatus.textContent = state.judgement.saveStatus;
  dom.judgement.saveButton.disabled = state.judgement.saving || !snapshot.canSave || Boolean(state.judgement.lastSavedRecordId);
}

function canUseApiJudgementSave() {
  return Boolean(
    state.dataSource.apiBaseUrl
    && state.dataSource.configReady
    && state.dataSource.clients === "api"
    && state.dataSource.organizations === "api"
    && state.dataSource.services === "api"
    && state.dataSource.staffs === "api"
  );
}

function findMatchedJudgementEnrollment() {
  const enrollments = getClientEnrollments(state.judgement.clientId).filter((item) => (
    String(item.organizationId ?? "") === String(state.judgement.organizationId ?? "")
    && String(item.serviceId ?? "") === String(state.judgement.serviceId ?? "")
  ));

  if (enrollments.length === 1) {
    return enrollments[0];
  }

  if (enrollments.length > 1) {
    const groupIds = Array.from(new Set(enrollments.map((item) => String(item.serviceGroupId ?? ""))));
    return groupIds.length === 1 ? enrollments[0] : null;
  }

  return null;
}

function normalizeNumericId(value) {
  const normalized = String(value ?? "").trim();
  if (!/^\d+$/.test(normalized)) {
    return null;
  }
  return Number(normalized);
}

function saveJudgementEvaluationToSample(snapshot) {
  const recordId = `local-${Date.now()}`;
  const record = {
    recordId,
    targetMonth: state.judgement.targetMonth,
    performedAt: snapshot.performedAt || "",
    clientId: snapshot.client.clientId,
    clientName: snapshot.client.clientName,
    targetType: snapshot.client.targetType ?? "-",
    organizationId: snapshot.organization.organizationId,
    organizationName: snapshot.organization.organizationName,
    serviceId: snapshot.service.serviceId,
    serviceName: snapshot.service.serviceName,
    staffId: snapshot.staff.staffId,
    staffName: snapshot.staff.staffName,
    actionType: state.judgement.answers.actionType || "",
    additionCode: snapshot.topCandidate?.additionCode ?? "",
    additionName: snapshot.displayAdditionName,
    finalStatus: snapshot.finalStatus,
    postCheckStatus: snapshot.postCheckStatus,
    postCheckSummary: snapshot.postCheckSummary,
    evaluatedAt: formatCurrentDateTime(),
    rationale: snapshot.rationale,
    savedNote: snapshot.noteText,
  };

  state.report.records = [record, ...state.report.records];
  return record;
}

function formatCurrentDateTime() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function normalizePerformedAtForStorage(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
    return `${normalized.replace("T", " ")}:00`;
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(normalized)) {
    return normalized.length === 16 ? `${normalized}:00` : normalized;
  }

  return "";
}

async function deactivateOrganizationService(organizationServiceId) {
  const normalizedOrganizationServiceId = String(organizationServiceId ?? "");
  if (!normalizedOrganizationServiceId) {
    return;
  }

  const currentItems = getOrganizationServicesForSelectedOrganization();
  const targetItem = currentItems.find((item) => item.organizationServiceId === normalizedOrganizationServiceId);
  const targetLabel = targetItem ? buildServiceDisplayLabel(targetItem) : "この提供サービス";

  if (!window.confirm(`${targetLabel} を登録済み一覧から外します。よろしいですか。`)) {
    return;
  }

  if (!canUseApiRelations()) {
    deactivateSampleOrganizationService(normalizedOrganizationServiceId);
    state.relations.organizationServiceStatus = "登録解除しました";
    renderMasters();
    return;
  }

  state.relations.deactivatingOrganizationServiceId = normalizedOrganizationServiceId;
  state.relations.organizationServiceStatus = "解除中";
  renderMasters();

  try {
    await fetchApiJson(buildApiUrl("organization-services.php"), {
      method: "POST",
      body: JSON.stringify({
        action: "deactivate",
        organization_service_id: Number(normalizedOrganizationServiceId),
      }),
    });

    state.relations.organizationServiceStatus = "登録解除しました";
    await loadMastersFromApi();
    await loadOrganizationServices(state.relations.selectedOrganizationId, { force: true });
  } catch (error) {
    state.relations.organizationServiceStatus = error.message;
  } finally {
    state.relations.deactivatingOrganizationServiceId = "";
    renderMasters();
  }
}

async function deactivateClientEnrollment(clientEnrollmentId) {
  const normalizedClientEnrollmentId = String(clientEnrollmentId ?? "");
  if (!normalizedClientEnrollmentId) {
    return;
  }

  const clientId = state.relations.selectedClientId;
  const currentItems = getClientEnrollmentRelations(clientId);
  const targetItem = currentItems.find((item) => item.clientEnrollmentId === normalizedClientEnrollmentId);
  const targetLabel = targetItem
    ? `${targetItem.organizationName} / ${targetItem.serviceName}`
    : "この利用状況";

  if (!window.confirm(`${targetLabel} を利用状況一覧から外します。よろしいですか。`)) {
    return;
  }

  if (!canUseApiRelations()) {
    deactivateSampleClientEnrollment(normalizedClientEnrollmentId);
    state.relations.clientEnrollmentStatus = "登録解除しました";
    renderMasters();
    if (state.judgement.clientId === clientId) {
      renderJudgement();
    }
    return;
  }

  state.relations.deactivatingClientEnrollmentId = normalizedClientEnrollmentId;
  state.relations.clientEnrollmentStatus = "解除中";
  renderMasters();

  try {
    await fetchApiJson(buildApiUrl("client-enrollments.php"), {
      method: "POST",
      body: JSON.stringify({
        action: "deactivate",
        client_enrollment_id: Number(normalizedClientEnrollmentId),
      }),
    });

    state.relations.clientEnrollmentStatus = "登録解除しました";
    await loadClientEnrollments(clientId, { force: true });

    if (state.judgement.clientId === clientId && canUseApiJudgementContext()) {
      await loadJudgementContextFromApi(clientId);
    } else if (state.judgement.clientId === clientId) {
      renderJudgement();
    }
  } catch (error) {
    state.relations.clientEnrollmentStatus = error.message;
  } finally {
    state.relations.deactivatingClientEnrollmentId = "";
    renderMasters();
  }
}

function ensureRelationSelections() {
  const masterClients = getMasterClients();
  const masterOrganizations = getMasterOrganizations();

  if (!masterClients.some((client) => client.clientId === state.relations.selectedClientId)) {
    state.relations.selectedClientId = masterClients[0]?.clientId ?? "";
  }

  if (!masterOrganizations.some((organization) => organization.organizationId === state.relations.selectedOrganizationId)) {
    state.relations.selectedOrganizationId = masterOrganizations[0]?.organizationId ?? "";
  }

  if (!masterOrganizations.some((organization) => organization.organizationId === state.relations.clientOrganizationId)) {
    state.relations.clientOrganizationId = state.relations.selectedOrganizationId || masterOrganizations[0]?.organizationId || "";
  }

  syncRelationFormSelections();
}

function syncRelationFormSelections() {
  const servicesForOrganization = getOrganizationServicesForSelectedOrganization();
  if (!servicesForOrganization.some((item) => item.serviceId === state.relations.organizationServiceDefinitionId)) {
    const nextService = getAvailableServiceDefinitionsForOrganization(state.relations.selectedOrganizationId)[0];
    state.relations.organizationServiceDefinitionId = nextService?.serviceId ?? "";
  }

  const servicesForEnrollment = getOrganizationServicesForClientForm();
  if (!servicesForEnrollment.some((item) => item.organizationServiceId === state.relations.clientOrganizationServiceId)) {
    state.relations.clientOrganizationServiceId = servicesForEnrollment[0]?.organizationServiceId ?? "";
  }
}

function renderApp() {
  renderNavigation();
  renderActiveSection();
  renderQuickSearchStatus();
}

function renderNavigation() {
  for (const button of dom.navButtons) {
    button.classList.toggle("is-active", button.dataset.section === state.activeSection);
  }

  for (const panel of dom.panels) {
    panel.classList.toggle("is-visible", panel.dataset.sectionPanel === state.activeSection);
  }
}

function renderActiveSection() {
  renderJudgement();
  renderReport();
  renderMasters();
}

function renderJudgement() {
  const visibleClients = getFilteredClientsForJudgement();
  renderSelectOptions(dom.judgement.client, visibleClients, state.judgement.clientId, (item) => ({
    value: item.clientId,
    label: item.clientName,
  }));

  if (!visibleClients.some((item) => item.clientId === state.judgement.clientId)) {
    state.judgement.clientId = visibleClients[0]?.clientId ?? getJudgementClients()[0]?.clientId ?? "";
    syncJudgementStaffSelection();
    syncEnrollmentSelection();
  }

  dom.judgement.targetMonth.value = state.judgement.targetMonth;
  dom.judgement.performedAt.value = state.judgement.performedAt;

  const client = getClientById(state.judgement.clientId);
  const staffs = getJudgementStaffs();
  if (!staffs.some((item) => item.staffId === state.judgement.staffId)) {
    state.judgement.staffId = resolveDefaultJudgementStaffId();
  }

  renderSelectOptions(dom.judgement.staff, staffs, state.judgement.staffId, (item) => ({
    value: item.staffId,
    label: item.staffName,
  }));

  const selectedStaff = getStaffById(state.judgement.staffId);
  const hasEnrollmentContext = hasClientEnrollmentContext(state.judgement.clientId);
  const organizations = getSelectableOrganizationsForJudgement(state.judgement.clientId);

  if (!organizations.some((item) => item.organizationId === state.judgement.organizationId)) {
    state.judgement.organizationId = organizations[0]?.organizationId ?? "";
  }

  renderSelectOptions(dom.judgement.organization, organizations, state.judgement.organizationId, (item) => ({
    value: item.organizationId,
    label: item.organizationName,
  }));

  const services = getSelectableServicesForJudgement(state.judgement.clientId, state.judgement.organizationId);

  if (!services.some((item) => item.serviceId === state.judgement.serviceId)) {
    state.judgement.serviceId = services[0]?.serviceId ?? "";
  }

  renderSelectOptions(dom.judgement.service, services, state.judgement.serviceId, (item) => ({
    value: item.serviceId,
    label: item.serviceName,
  }));

  const organization = getOrganizationById(state.judgement.organizationId);
  const service = getServiceById(state.judgement.serviceId);
  const serviceDecisionCategories = getServiceDecisionCategories(service, organization);
  dom.judgement.clientTarget.textContent = client ? `${client.targetType}対象` : "";
  dom.judgement.staffHome.textContent = selectedStaff
    ? `所属: ${selectedStaff.homeOrganizationName ?? "-"}`
    : "ログイン連携の初期値から選択";
  dom.judgement.organizationGroup.textContent = organization
    ? getOrganizationGroupLabel(organization, service)
    : (hasEnrollmentContext ? "" : "利用状況未登録");
  dom.judgement.serviceCategory.textContent = service
    ? buildServiceMetaLabel(service, serviceDecisionCategories)
    : (hasEnrollmentContext ? "" : "対象に合うサービスから選択");

  if (state.judgement.loadingContext) {
    dom.judgement.status.textContent = "利用状況 読込中";
    dom.judgement.questionLabel.textContent = "利用者の利用状況を読み込み中です";
    dom.judgement.questionMeta.textContent = "APIから利用機関とサービスを確認しています";
    dom.judgement.questionHelper.textContent = "少し待つと、その利用者に紐づく機関・サービスが反映されます。相談員は別に選べます。";
    dom.judgement.options.innerHTML = `<div class="empty-state">利用状況を読み込み中です。</div>`;
    dom.judgement.prevButton.disabled = true;
    renderCandidateList([]);
    renderJudgementAnswerTags(client, organization, service, selectedStaff);
    dom.judgement.resultMain.textContent = "読込中";
    dom.judgement.resultCheck.textContent = "-";
    dom.judgement.resultNext.textContent = "利用状況の反映待ち";
    renderJudgementSave(buildJudgementSnapshot());
    return;
  }

  const candidates = getJudgementCandidates();
  const questions = getVisibleQuestions();
  const currentQuestion = questions.find((question) => !state.judgement.answers[question.key]);
  const initialCandidateCount = getBaseJudgementCandidates().length;
  dom.judgement.status.textContent = hasEnrollmentContext
    ? `候補 ${initialCandidateCount}件 -> ${candidates.length}件`
    : `候補 ${initialCandidateCount}件 -> ${candidates.length}件 / 利用状況未登録`;

  if (candidates.length === 0 || !currentQuestion) {
    dom.judgement.questionLabel.textContent = candidates.length === 0 ? "条件に合う候補がありません" : "必要な設問はここまでです";
    dom.judgement.questionMeta.textContent = "説明表示: 管理者設定";
    dom.judgement.questionHelper.textContent = candidates.length === 0
      ? buildJudgementContextHelp(hasEnrollmentContext, "利用者・機関・サービスの選択か、ひとつ前の回答を見直すと候補が戻る可能性があります。")
      : buildJudgementContextHelp(hasEnrollmentContext, "残った候補に対して、回数制限や併算定不可などの後段チェックへ進みます。");
    dom.judgement.options.innerHTML = `<div class="empty-state">${candidates.length === 0 ? "候補が0件になりました。" : "次は後段チェックです。"}</div>`;
  } else {
    dom.judgement.questionLabel.textContent = currentQuestion.label;
    dom.judgement.questionMeta.textContent = "説明表示: 管理者設定で折りたたみ/非表示";
    dom.judgement.questionHelper.textContent = buildJudgementContextHelp(hasEnrollmentContext, currentQuestion.helper);
    renderJudgementOptions(currentQuestion);
  }

  dom.judgement.prevButton.disabled = state.judgement.history.length === 0;
  renderCandidateList(candidates);
  renderJudgementAnswerTags(client, organization, service, selectedStaff);
  const snapshot = buildJudgementSnapshot();
  renderJudgementResult(snapshot);
  renderJudgementSave(snapshot);
}

function renderJudgementOptions(question) {
  const options = question.getOptions ? question.getOptions(state.judgement.answers) : question.options;
  dom.judgement.options.innerHTML = options.map((option) => `
    <button type="button" class="option-card" data-question-key="${question.key}" data-option-value="${option.value}">
      <span class="option-title">${escapeHtml(option.value)}</span>
      <span class="option-note">${escapeHtml(option.note)}</span>
    </button>
  `).join("");

  for (const button of dom.judgement.options.querySelectorAll(".option-card")) {
    button.addEventListener("click", () => {
      const questionKey = button.dataset.questionKey;
      const optionValue = button.dataset.optionValue;
      markJudgementDirty();
      state.judgement.answers[questionKey] = optionValue;

      if (state.judgement.history[state.judgement.history.length - 1] !== questionKey) {
        state.judgement.history.push(questionKey);
      }

      if (questionKey === "placeType") {
        state.judgement.answers.actionType = "";
        state.judgement.history = state.judgement.history.filter((item) => item !== "actionType");
      }

      renderJudgement();
    });
  }
}

function renderCandidateList(candidates) {
  if (candidates.length === 0) {
    dom.judgement.candidates.innerHTML = `<li><strong>候補なし</strong><span>現在の条件では該当加算が残っていません。</span></li>`;
    return;
  }

  dom.judgement.candidates.innerHTML = candidates.map((candidate) => `
    <li>
      <div class="candidate-title-row">
        <strong>${escapeHtml(candidate.additionName)}</strong>
        ${buildCandidateStatusBadge(candidate)}
      </div>
      <span>${escapeHtml(candidate.reason)}</span>
      ${buildCandidateRuleBlock("確定条件", candidate.confirmedRules)}
      ${buildCandidateRuleBlock("仮置き", candidate.provisionalRules)}
    </li>
  `).join("");
}

function buildCandidateStatusBadge(candidate) {
  if (!candidate.ruleStatus) {
    return "";
  }

  const tone = candidate.ruleStatus.includes("仮置き")
    ? "warning"
    : candidate.ruleStatus.includes("一部")
      ? "caution"
      : "confirmed";

  return `<span class="candidate-badge candidate-badge-${tone}">${escapeHtml(candidate.ruleStatus)}</span>`;
}

function buildCandidateRuleBlock(label, rules) {
  if (!Array.isArray(rules) || rules.length === 0) {
    return "";
  }

  const items = rules.slice(0, 2).map((rule) => `<li>${escapeHtml(rule)}</li>`).join("");
  return `
    <div class="candidate-rule-block">
      <span class="candidate-rule-label">${escapeHtml(label)}</span>
      <ul class="candidate-rule-list">${items}</ul>
    </div>
  `;
}

function renderJudgementAnswerTags(client, organization, service, staff) {
  const tags = [];
  if (client) {
    tags.push(`${client.clientName} / ${client.targetType}`);
  }
  if (staff) {
    tags.push(`相談員: ${staff.staffName}`);
  }
  if (organization) {
    tags.push(getOrganizationGroupLabel(organization, service));
  }
  if (service) {
    tags.push(`${service.serviceName} / ${service.serviceCategory}`);
  }
  for (const key of state.judgement.history) {
    if (state.judgement.answers[key]) {
      tags.push(state.judgement.answers[key]);
    }
  }
  dom.judgement.answers.innerHTML = tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
}

function renderJudgementResult(snapshot) {
  const { candidates, currentQuestion } = snapshot;
  if (candidates.length === 0) {
    dom.judgement.resultMain.textContent = "候補なし";
    dom.judgement.resultCheck.textContent = "前の条件を見直す";
    dom.judgement.resultNext.textContent = "機関・サービス・回答のどこで外れたか確認";
    return;
  }

  const topCandidate = snapshot.topCandidate;
  if (candidates.length === 1 && currentQuestion) {
    dom.judgement.resultMain.textContent = `${topCandidate.additionName} (確認中)`;
    dom.judgement.resultCheck.textContent = `まず「${currentQuestion.label}」に回答してください。`;
    dom.judgement.resultNext.textContent = `次の設問: ${currentQuestion.label}`;
    return;
  }

  if (candidates.length === 1) {
    dom.judgement.resultMain.textContent = topCandidate.additionName;
    dom.judgement.resultCheck.textContent = snapshot.postCheckSummary;
    dom.judgement.resultNext.textContent = snapshot.postCheckNextAction;
    return;
  }

  dom.judgement.resultMain.textContent = `${candidates.length}件の候補が残っています`;
  dom.judgement.resultCheck.textContent = snapshot.postCheckSummary;
  dom.judgement.resultNext.textContent = currentQuestion ? `次の設問: ${currentQuestion.label}` : snapshot.postCheckNextAction;
}

function renderReport() {
  writeReportFiltersToInputs();
  const activeView = state.report.views[state.report.activeViewCode];
  dom.report.activeViewLabel.textContent = `表示設定: ${activeView.name}`;
  dom.report.selectedColumn.textContent = `選択列: ${state.report.selectedColumnKey ? columnCatalog[state.report.selectedColumnKey].label : "なし"}`;
  renderReportViewButtons();
  renderReportViewSummary(activeView);

  const records = getFilteredReportRecords();
  ensureSelectedReportRecord(records);
  renderReportTable(activeView, records);
  renderReportDetails(records);
  dom.report.resultCount.textContent = state.report.loading ? "読込中" : `${records.length}件`;
}

function renderReportViewButtons() {
  dom.report.viewButtons.innerHTML = Object.entries(state.report.views).map(([viewCode, view]) => `
    <button type="button" class="view-button${viewCode === state.report.activeViewCode ? " is-active" : ""}" data-view-code="${viewCode}">
      ${escapeHtml(view.name)}
    </button>
  `).join("");

  for (const button of dom.report.viewButtons.querySelectorAll(".view-button")) {
    button.addEventListener("click", () => {
      state.report.activeViewCode = button.dataset.viewCode;
      localStorage.setItem(storageKeys.activeView, state.report.activeViewCode);
      state.report.selectedColumnKey = "";
      state.report.filters = { ...state.report.views[state.report.activeViewCode].savedFilters };
      writeReportFiltersToInputs();
      if (canUseApiReport()) {
        void loadReportRecordsFromApi();
        return;
      }
      renderReport();
      renderQuickSearchStatus();
    });
  }
}

function renderReportViewSummary(activeView) {
  const filterSummary = Object.entries(activeView.savedFilters)
    .filter(([, value]) => value)
    .map(([key, value]) => `${getFilterLabel(key)}: ${value}`);
  const tags = [activeView.name, `列数 ${activeView.columns.length}`, ...(filterSummary.length > 0 ? filterSummary : ["保存条件なし"])];
  dom.report.viewSummary.innerHTML = tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
}

function renderReportTable(activeView, records) {
  dom.report.tableHead.innerHTML = activeView.columns.map((columnKey) => `
    <th class="${columnKey === state.report.selectedColumnKey ? "is-selected-column" : ""}">
      <button type="button" class="table-head-button" data-column-key="${columnKey}">
        ${escapeHtml(columnCatalog[columnKey].label)}
      </button>
    </th>
  `).join("");

  for (const button of dom.report.tableHead.querySelectorAll(".table-head-button")) {
    button.addEventListener("click", () => {
      state.report.selectedColumnKey = button.dataset.columnKey;
      renderReport();
    });
  }

  if (records.length === 0) {
    dom.report.tableBody.innerHTML = `<tr><td colspan="${activeView.columns.length}"><div class="empty-state">条件に合う記録がありません。</div></td></tr>`;
    return;
  }

  dom.report.tableBody.innerHTML = records.map((record) => `
    <tr class="${record.recordId === state.report.selectedRecordId ? "is-current-row" : ""}" data-record-id="${record.recordId}">
      ${activeView.columns.map((columnKey) => `<td>${escapeHtml(columnCatalog[columnKey].getValue(record))}</td>`).join("")}
    </tr>
  `).join("");

  for (const row of dom.report.tableBody.querySelectorAll("tr[data-record-id]")) {
    row.addEventListener("click", () => {
      state.report.selectedRecordId = row.dataset.recordId;
      renderReport();
    });
  }
}

function renderReportDetails(records) {
  const selectedRecord = records.find((record) => record.recordId === state.report.selectedRecordId);
  if (!selectedRecord) {
    dom.report.detailClient.textContent = "-";
    dom.report.detailPerformedAt.textContent = "-";
    dom.report.detailAddition.textContent = "-";
    dom.report.detailEvaluatedAt.textContent = "-";
    dom.report.detailRationale.textContent = "-";
    dom.report.detailNote.textContent = "-";
    return;
  }

  dom.report.detailClient.textContent = `${selectedRecord.clientName} / ${selectedRecord.targetType}`;
  dom.report.detailPerformedAt.textContent = selectedRecord.performedAt || "-";
  dom.report.detailAddition.textContent = `${selectedRecord.additionName} (${selectedRecord.finalStatus})`;
  dom.report.detailEvaluatedAt.textContent = selectedRecord.evaluatedAt || "-";
  dom.report.detailPostCheck.textContent = selectedRecord.postCheckSummary || "-";
  dom.report.detailRationale.textContent = selectedRecord.rationale;
  dom.report.detailNote.textContent = selectedRecord.savedNote;
}

function renderMasters() {
  ensureRelationSelections();
  renderClientTable();
  renderOrganizationTable();
  renderClientEnrollmentPanel();
  renderOrganizationServicePanel();
  renderServiceTable();
}

function renderClientTable() {
  const rows = getMasterClients().filter((client) => matchesQuickSearch([
    client.clientName,
    client.clientNameKana,
    client.targetType,
  ]));

  if (rows.length === 0) {
    state.relations.selectedClientId = "";
  } else if (!rows.some((client) => client.clientId === state.relations.selectedClientId)) {
    state.relations.selectedClientId = rows[0].clientId;
    state.relations.clientEnrollmentStatus = "未保存";
    void loadClientEnrollments(state.relations.selectedClientId);
  }

  dom.masters.clientsCount.textContent = `${rows.length}件`;
  dom.masters.clientsBody.innerHTML = rows.length === 0
    ? `<tr><td colspan="3"><div class="empty-state">該当する利用者がありません。</div></td></tr>`
    : rows.map((client) => `
      <tr class="${client.clientId === state.relations.selectedClientId ? "is-current-row" : ""}" data-client-id="${escapeHtml(client.clientId)}">
        <td>${escapeHtml(client.clientName)}</td>
        <td>${escapeHtml(client.clientNameKana)}</td>
        <td>${escapeHtml(client.targetType)}</td>
      </tr>
    `).join("");

  for (const row of dom.masters.clientsBody.querySelectorAll("tr[data-client-id]")) {
    row.addEventListener("click", () => {
      state.relations.selectedClientId = row.dataset.clientId;
      state.relations.clientEnrollmentStatus = "未保存";
      renderMasters();
      void loadClientEnrollments(state.relations.selectedClientId);
    });
  }
}

function renderOrganizationTable() {
  const rows = getMasterOrganizations().filter((organization) => matchesQuickSearch([
    organization.organizationName,
    getDisplayOrganizationType(organization),
    getOrganizationGroupLabel(organization),
    getOrganizationServiceSummary(organization),
  ]));

  if (rows.length === 0) {
    state.relations.selectedOrganizationId = "";
  } else if (!rows.some((organization) => organization.organizationId === state.relations.selectedOrganizationId)) {
    state.relations.selectedOrganizationId = rows[0].organizationId;
    state.relations.organizationServiceStatus = "未保存";
    if (!state.relations.clientOrganizationId) {
      state.relations.clientOrganizationId = rows[0].organizationId;
    }
    void loadOrganizationServices(state.relations.selectedOrganizationId);
  }

  dom.masters.organizationsCount.textContent = `${rows.length}件`;
  dom.masters.organizationsBody.innerHTML = rows.length === 0
    ? `<tr><td colspan="4"><div class="empty-state">該当する機関がありません。</div></td></tr>`
    : rows.map((organization) => `
      <tr class="${organization.organizationId === state.relations.selectedOrganizationId ? "is-current-row" : ""}" data-organization-id="${escapeHtml(organization.organizationId)}">
        <td>${escapeHtml(organization.organizationName)}</td>
        <td>${escapeHtml(getDisplayOrganizationType(organization))}</td>
        <td>${escapeHtml(getOrganizationGroupLabel(organization))}</td>
        <td>${escapeHtml(getOrganizationServiceSummary(organization))}</td>
      </tr>
    `).join("");

  for (const row of dom.masters.organizationsBody.querySelectorAll("tr[data-organization-id]")) {
    row.addEventListener("click", () => {
      state.relations.selectedOrganizationId = row.dataset.organizationId;
      state.relations.organizationServiceStatus = "未保存";
      renderMasters();
      void loadOrganizationServices(state.relations.selectedOrganizationId);
    });
  }
}

function renderClientEnrollmentPanel() {
  const client = getClientById(state.relations.selectedClientId);
  const organizations = getMasterOrganizations();
  const clientEnrollments = getClientEnrollmentRelations(state.relations.selectedClientId);
  const organizationServices = getOrganizationServicesForClientForm();

  dom.masters.clientSelected.textContent = client ? `${client.clientName}` : "利用者を選択してください";
  dom.masters.clientSelectedTarget.textContent = client ? `${client.targetType}対象` : "-";

  renderSelectOptions(
    dom.masters.clientEnrollmentOrganization,
    organizations,
    state.relations.clientOrganizationId,
    (organization) => ({
      value: organization.organizationId,
      label: organization.organizationName,
    }),
  );

  renderSelectOptions(
    dom.masters.clientEnrollmentOrganizationService,
    organizationServices,
    state.relations.clientOrganizationServiceId,
    (item) => ({
      value: item.organizationServiceId,
      label: buildServiceDisplayLabel(item),
    }),
  );

  dom.masters.clientEnrollmentGroupName.value = state.relations.clientEnrollmentGroupName;
  dom.masters.clientEnrollmentStatus.textContent = state.relations.clientEnrollmentStatus;
  dom.masters.clientEnrollmentSave.disabled = !state.relations.selectedClientId || !state.relations.clientOrganizationServiceId || state.relations.savingClientEnrollment || Boolean(state.relations.deactivatingClientEnrollmentId);

  if (state.relations.loadingOrganizationServicesForId === state.relations.clientOrganizationId) {
    dom.masters.clientEnrollmentOrganizationServiceHelp.textContent = "機関サービスを読み込み中です。";
  } else if (organizationServices.length === 0) {
    dom.masters.clientEnrollmentOrganizationServiceHelp.textContent = "先に機関画面で、その機関の提供サービスを登録してください。";
  } else {
    dom.masters.clientEnrollmentOrganizationServiceHelp.textContent = "この機関に登録済みのサービスから選びます。";
  }

  dom.masters.clientEnrollmentList.innerHTML = renderRelationItems(
    clientEnrollments,
    (item) => `${item.organizationName} / ${item.serviceName}`,
    (item) => {
      const details = [
        item.groupName && item.groupName !== "-" ? `グループ: ${item.groupName}` : "",
      ].filter(Boolean);
      return details.length > 0 ? details.join(" / ") : "グループ未設定";
    },
    state.relations.loadingClientEnrollmentsForId === state.relations.selectedClientId
      ? "利用状況を読み込み中です。"
      : "この利用者の利用状況はまだありません。",
    {
      actionType: "deactivate-client-enrollment",
      idKey: "clientEnrollmentId",
      getLabel: (item) => state.relations.deactivatingClientEnrollmentId === item.clientEnrollmentId ? "解除中" : "登録解除",
      isDisabled: (item) => state.relations.deactivatingClientEnrollmentId === item.clientEnrollmentId || state.relations.savingClientEnrollment,
    }
  );
  bindRelationActionButtons(dom.masters.clientEnrollmentList);
}

function renderOrganizationServicePanel() {
  const organization = getOrganizationById(state.relations.selectedOrganizationId);
  const organizationServices = getOrganizationServicesForSelectedOrganization();
  const availableServices = getAvailableServiceDefinitionsForOrganization(state.relations.selectedOrganizationId);

  dom.masters.organizationSelected.textContent = organization
    ? organization.organizationName
    : "機関を選択してください";
  dom.masters.organizationSelectedGroup.textContent = organization
    ? `${getDisplayOrganizationType(organization)} / ${getOrganizationGroupLabel(organization)}`
    : "-";

  renderSelectOptions(
    dom.masters.organizationServiceDefinition,
    availableServices,
    state.relations.organizationServiceDefinitionId,
    (service) => ({
      value: service.serviceId,
      label: buildServiceDisplayLabel(service),
    }),
  );

  dom.masters.organizationServiceStatus.textContent = state.relations.organizationServiceStatus;
  dom.masters.organizationServiceSave.disabled = !state.relations.selectedOrganizationId || !state.relations.organizationServiceDefinitionId || state.relations.savingOrganizationService || Boolean(state.relations.deactivatingOrganizationServiceId);

  dom.masters.organizationServiceList.innerHTML = renderRelationItems(
    organizationServices,
    (item) => item.serviceName,
    (item) => {
      const details = [
        item.serviceCategory || "",
        item.targetScope ? `対象範囲: ${item.targetScope}` : "",
        item.groupNames && item.groupNames !== "-" ? `グループ: ${item.groupNames}` : "",
      ].filter(Boolean);
      return details.length > 0 ? details.join(" / ") : "グループ未設定";
    },
    state.relations.loadingOrganizationServicesForId === state.relations.selectedOrganizationId
      ? "提供サービスを読み込み中です。"
      : "この機関の提供サービスはまだありません。",
    {
      actionType: "deactivate-organization-service",
      idKey: "organizationServiceId",
      getLabel: (item) => state.relations.deactivatingOrganizationServiceId === item.organizationServiceId ? "解除中" : "登録解除",
      isDisabled: (item) => state.relations.deactivatingOrganizationServiceId === item.organizationServiceId || state.relations.savingOrganizationService,
    }
  );
  bindRelationActionButtons(dom.masters.organizationServiceList);
}

function renderServiceTable() {
  const rows = getMasterServices().filter((service) => matchesQuickSearch([
    service.serviceName,
    service.serviceCategory,
    service.targetScope,
    service.groupName,
  ]));
  dom.masters.servicesCount.textContent = `${rows.length}件`;
  dom.masters.servicesBody.innerHTML = rows.length === 0
    ? `<tr><td colspan="4"><div class="empty-state">該当するサービスがありません。</div></td></tr>`
    : rows.map((service) => `
      <tr>
        <td>${escapeHtml(service.serviceName)}</td>
        <td>${escapeHtml(service.serviceCategory)}</td>
        <td>${escapeHtml(service.targetScope)}</td>
        <td>${escapeHtml(service.groupName)}</td>
      </tr>
    `).join("");
}

function renderQuickSearchStatus() {
  if (!state.quickSearch) {
    dom.quickSearchStatus.textContent = "現在の画面だけに反映";
    return;
  }
  if (state.activeSection === "judgement") {
    dom.quickSearchStatus.textContent = `判定画面の利用者候補 ${getFilteredClientsForJudgement().length}件`;
    return;
  }
  if (state.activeSection === "report") {
    dom.quickSearchStatus.textContent = state.report.loading
      ? "集計結果 読込中"
      : `集計結果 ${getFilteredReportRecords().length}件`;
    return;
  }
  if (state.activeSection === "clients") {
    dom.quickSearchStatus.textContent = `利用者 ${dom.masters.clientsCount.textContent}`;
    return;
  }
  if (state.activeSection === "organizations") {
    dom.quickSearchStatus.textContent = `機関 ${dom.masters.organizationsCount.textContent}`;
    return;
  }
  dom.quickSearchStatus.textContent = `サービス ${dom.masters.servicesCount.textContent}`;
}

function renderRelationItems(items, titleGetter, detailGetter, emptyMessage, actionConfig = null) {
  if (items.length === 0) {
    return `<div class="empty-state">${escapeHtml(emptyMessage)}</div>`;
  }

  return items.map((item) => `
    <div class="relation-item">
      <div class="relation-item-head">
        <strong>${escapeHtml(titleGetter(item))}</strong>
        ${actionConfig ? `
          <button
            type="button"
            class="secondary-button compact-button danger-button relation-action-button"
            data-action-type="${escapeHtml(actionConfig.actionType)}"
            data-relation-id="${escapeHtml(String(item[actionConfig.idKey] ?? ""))}"
            ${actionConfig.isDisabled && actionConfig.isDisabled(item) ? "disabled" : ""}
          >${escapeHtml(actionConfig.getLabel ? actionConfig.getLabel(item) : "登録解除")}</button>
        ` : ""}
      </div>
      <span>${escapeHtml(detailGetter(item))}</span>
    </div>
  `).join("");
}

function bindRelationActionButtons(container) {
  if (!container) {
    return;
  }

  for (const button of container.querySelectorAll(".relation-action-button")) {
    button.addEventListener("click", () => {
      const relationId = button.dataset.relationId;
      const actionType = button.dataset.actionType;

      if (actionType === "deactivate-organization-service") {
        void deactivateOrganizationService(relationId);
        return;
      }

      if (actionType === "deactivate-client-enrollment") {
        void deactivateClientEnrollment(relationId);
      }
    });
  }
}

function getOrganizationServicesForSelectedOrganization() {
  return getOrganizationServicesForOrganization(state.relations.selectedOrganizationId);
}

function getOrganizationServicesForOrganization(organizationId) {
  const normalizedOrganizationId = String(organizationId ?? "");
  if (!normalizedOrganizationId) {
    return [];
  }

  if (state.relations.organizationServicesByOrganizationId[normalizedOrganizationId]) {
    return state.relations.organizationServicesByOrganizationId[normalizedOrganizationId];
  }

  if (canUseApiRelations()) {
    return [];
  }

  return buildSampleOrganizationServices(normalizedOrganizationId);
}

function getOrganizationServicesForClientForm() {
  return getOrganizationServicesForOrganization(state.relations.clientOrganizationId);
}

function getClientEnrollmentRelations(clientId) {
  const normalizedClientId = String(clientId ?? "");
  if (!normalizedClientId) {
    return [];
  }

  if (state.relations.clientEnrollmentsByClientId[normalizedClientId]) {
    return state.relations.clientEnrollmentsByClientId[normalizedClientId];
  }

  if (canUseApiRelations()) {
    return [];
  }

  return buildSampleClientEnrollments(normalizedClientId);
}

function getAvailableServiceDefinitionsForOrganization(organizationId) {
  if (!organizationId) {
    return [];
  }

  const registeredServiceIds = new Set(
    getOrganizationServicesForOrganization(organizationId).map((item) => item.serviceId),
  );

  const allServices = getMasterServices();
  const availableServices = allServices.filter((service) => !registeredServiceIds.has(service.serviceId));
  return availableServices.length > 0 ? availableServices : allServices;
}

function buildServiceDisplayLabel(service) {
  const parts = [
    service.serviceName || "-",
    service.serviceCategory || "-",
  ];

  if (service.targetScope) {
    parts.push(service.targetScope);
  }

  return parts.join(" / ");
}

function buildServiceMetaLabel(service, serviceDecisionCategories = []) {
  const parts = [
    service.serviceCategory || "-",
    service.groupName || service.constraintGroupCode || "-",
  ];

  if (serviceDecisionCategories.length > 0) {
    parts.push(`判定区分: ${serviceDecisionCategories.join("・")}`);
  }

  return parts.join(" / ");
}

function buildSampleOrganizationServices(organizationId) {
  const organization = data.organizations.find((item) => item.organizationId === organizationId);
  if (!organization) {
    return [];
  }

  return (organization.serviceIds ?? [])
    .map((serviceId) => {
      const service = data.services.find((item) => item.serviceId === serviceId);
      if (!service) {
        return null;
      }

      return {
        organizationServiceId: `${organization.organizationId}-${service.serviceId}`,
        organizationId: organization.organizationId,
        organizationName: organization.organizationName,
        serviceId: service.serviceId,
        serviceName: service.serviceName,
        serviceCategory: service.serviceCategory,
        targetScope: service.targetScope,
        constraintGroupCode: service.groupName,
        groupNames: service.groupName || "-",
      };
    })
    .filter(Boolean);
}

function deactivateSampleOrganizationService(organizationServiceId) {
  Object.keys(state.relations.organizationServicesByOrganizationId).forEach((organizationId) => {
    const items = state.relations.organizationServicesByOrganizationId[organizationId];
    if (!Array.isArray(items)) {
      return;
    }

    state.relations.organizationServicesByOrganizationId[organizationId] = items.filter(
      (item) => item.organizationServiceId !== organizationServiceId,
    );
  });
}

function buildSampleClientEnrollments(clientId) {
  return data.enrollments
    .filter((item) => item.clientId === clientId)
    .map((item) => {
      const client = data.clients.find((target) => target.clientId === item.clientId);
      const organization = data.organizations.find((target) => target.organizationId === item.organizationId);
      const service = data.services.find((target) => target.serviceId === item.serviceId);

      if (!client || !organization || !service) {
        return null;
      }

      return {
        clientEnrollmentId: item.enrollmentId,
        clientId: item.clientId,
        clientName: client.clientName,
        organizationServiceId: `${organization.organizationId}-${service.serviceId}`,
        organizationId: organization.organizationId,
        organizationName: organization.organizationName,
        serviceId: service.serviceId,
        serviceName: service.serviceName,
        serviceCategory: service.serviceCategory,
        serviceTargetScope: service.targetScope,
        serviceGroupId: "",
        groupName: service.groupName || "-",
        note: "",
      };
    })
    .filter(Boolean);
}

function deactivateSampleClientEnrollment(clientEnrollmentId) {
  Object.keys(state.relations.clientEnrollmentsByClientId).forEach((clientId) => {
    const items = state.relations.clientEnrollmentsByClientId[clientId];
    if (!Array.isArray(items)) {
      return;
    }

    state.relations.clientEnrollmentsByClientId[clientId] = items.filter(
      (item) => item.clientEnrollmentId !== clientEnrollmentId,
    );
  });
}

function matchesServiceTargetScope(serviceTargetScope, clientTargetType) {
  if (!serviceTargetScope || !clientTargetType) {
    return true;
  }

  return serviceTargetScope === "児者" || serviceTargetScope === clientTargetType;
}

function getFilteredClientsForJudgement() {
  const quickSearch = normalizeText(state.quickSearch);
  const clients = getJudgementClients();
  if (!quickSearch || state.activeSection !== "judgement") {
    return clients;
  }
  return clients.filter((client) => normalizeText(`${client.clientName} ${client.clientNameKana}`).includes(quickSearch));
}

function getClientEnrollments(clientId) {
  if (canUseApiJudgementContext() && state.dataSource.judgement === "api" && state.judgement.contextClientId === String(clientId)) {
    return state.judgement.enrollments;
  }
  return data.enrollments.filter((item) => item.clientId === clientId);
}

function hasClientEnrollmentContext(clientId) {
  return getClientEnrollments(clientId).length > 0;
}

function getSelectableOrganizationsForJudgement(clientId) {
  const enrollments = getClientEnrollments(clientId);
  if (enrollments.length > 0) {
    const organizationIds = Array.from(new Set(enrollments.map((item) => item.organizationId)));
    return organizationIds.map(getOrganizationById).filter(Boolean);
  }
  return getMasterOrganizations();
}

function getSelectableServicesForJudgement(clientId, organizationId) {
  const enrollments = getClientEnrollments(clientId);
  if (enrollments.length > 0) {
    const serviceIds = enrollments
      .filter((item) => item.organizationId === organizationId)
      .map((item) => item.serviceId);
    return Array.from(new Set(serviceIds)).map(getServiceById).filter(Boolean);
  }

  const client = getClientById(clientId);
  const organizationServices = getOrganizationServicesForOrganization(organizationId);
  if (organizationServices.length > 0) {
    const organizationScopedServices = Array.from(
      new Map(
        organizationServices
          .map((item) => getServiceById(item.serviceId))
          .filter((service) => service && (
            !client?.targetType
            || !service.targetScope
            || matchesServiceTargetScope(service.targetScope, client.targetType)
          ))
          .map((service) => [service.serviceId, service])
      ).values()
    );

    if (organizationScopedServices.length > 0) {
      return organizationScopedServices;
    }
  }

  return getMasterServices().filter((service) => (
    !client?.targetType
    || !service.targetScope
    || matchesServiceTargetScope(service.targetScope, client.targetType)
  ));
}

function getServiceDecisionCategories(service, organization = null) {
  if (!service) {
    return [];
  }

  const categories = new Set();
  const rawCategory = String(service.serviceCategory ?? "").trim();
  const resolvedOrganizationType = deriveResolvedOrganizationType(organization, service);

  if (rawCategory === "相談支援") {
    categories.add("相談支援");
  }

  if (rawCategory === "障害福祉" || rawCategory === "障害福祉サービス") {
    categories.add("障害福祉サービス");
  }

  if (rawCategory === "医療") {
    categories.add("医療関連");
  }

  if (rawCategory === "福祉") {
    categories.add("障害福祉以外の福祉サービス");
  }

  if (rawCategory === "障害福祉以外") {
    if (["病院", "訪問看護", "薬局"].includes(resolvedOrganizationType)) {
      categories.add("医療関連");
    } else {
      categories.add("障害福祉以外の福祉サービス");
    }
  }

  if (categories.size === 0 && ["病院", "訪問看護", "薬局"].includes(resolvedOrganizationType)) {
    categories.add("医療関連");
  }

  return Array.from(categories);
}

function buildJudgementContextHelp(hasEnrollmentContext, baseText) {
  if (hasEnrollmentContext) {
    return baseText;
  }
  return `${baseText} この利用者の利用状況がまだ未登録のため、機関とサービスは全マスタから選択しています。`;
}

function getBaseJudgementCandidates() {
  return evaluateCandidates({ includeAnswers: false });
}

function getJudgementCandidates() {
  return evaluateCandidates({ includeAnswers: true });
}

function evaluateCandidates({ includeAnswers }) {
  const facts = getJudgementFacts(includeAnswers);
  return data.additions
    .filter((addition) => candidateMatches(addition, facts))
    .sort((left, right) => left.priority - right.priority)
    .map((addition) => ({ ...addition, reason: buildCandidateReason(addition, facts) }));
}

function getJudgementFacts(includeAnswers) {
  const client = getClientById(state.judgement.clientId);
  const organization = getOrganizationById(state.judgement.organizationId);
  const service = getServiceById(state.judgement.serviceId);
  const serviceDecisionCategories = getServiceDecisionCategories(service, organization);
  return {
    targetType: client?.targetType ?? "",
    organizationGroup: getOrganizationGroupLabel(organization, service),
    organizationType: deriveResolvedOrganizationType(organization, service),
    serviceDecisionCategories,
    monthType: includeAnswers ? state.judgement.answers.monthType : "",
    placeType: includeAnswers ? state.judgement.answers.placeType : "",
    actionType: includeAnswers ? state.judgement.answers.actionType : "",
  };
}

function candidateMatches(candidate, facts) {
  return matchesTargetType(candidate.targetTypes, facts.targetType)
    && matchesCondition(candidate.organizationGroups, facts.organizationGroup)
    && matchesOptionalCondition(candidate.organizationTypes, facts.organizationType)
    && matchesDecisionCategoryRules(
      facts.serviceDecisionCategories,
      candidate.serviceDecisionInclude,
      candidate.serviceDecisionExclude,
    )
    && matchesCondition(candidate.monthTypes, facts.monthType)
    && matchesCondition(candidate.placeTypes, facts.placeType)
    && matchesCondition(candidate.actionTypes, facts.actionType);
}

function matchesTargetType(allowed, actual) {
  if (!actual) {
    return true;
  }
  return allowed.includes("共通") || allowed.includes(actual);
}

function matchesCondition(allowed, actual) {
  if (!actual) {
    return true;
  }
  return allowed.includes(actual);
}

function matchesOptionalCondition(allowed, actual) {
  if (!Array.isArray(allowed) || allowed.length === 0) {
    return true;
  }
  return matchesCondition(allowed, actual);
}

function matchesConditionList(allowed, actualValues) {
  if (!Array.isArray(actualValues) || actualValues.length === 0) {
    return true;
  }

  return actualValues.some((actual) => allowed.includes(actual));
}

function matchesDecisionCategoryRules(actualValues, includeValues = [], excludeValues = []) {
  const normalizedActualValues = Array.isArray(actualValues) ? actualValues : [];
  const normalizedIncludeValues = Array.isArray(includeValues) ? includeValues : [];
  const normalizedExcludeValues = Array.isArray(excludeValues) ? excludeValues : [];

  if (normalizedActualValues.length === 0) {
    return normalizedIncludeValues.length === 0;
  }

  if (normalizedExcludeValues.length > 0 && normalizedActualValues.some((actual) => normalizedExcludeValues.includes(actual))) {
    return false;
  }

  if (normalizedIncludeValues.length === 0) {
    return true;
  }

  return normalizedActualValues.some((actual) => normalizedIncludeValues.includes(actual));
}

function buildCandidateReason(candidate, facts) {
  const reasons = [];
  if (facts.targetType && matchesTargetType(candidate.targetTypes, facts.targetType)) {
    reasons.push(`${facts.targetType}対象`);
  }
  if (facts.organizationGroup && matchesCondition(candidate.organizationGroups, facts.organizationGroup)) {
    reasons.push(facts.organizationGroup);
  }
  if (facts.organizationType && matchesOptionalCondition(candidate.organizationTypes, facts.organizationType)) {
    reasons.push(facts.organizationType);
  }
  if (facts.serviceDecisionCategories.length > 0 && matchesDecisionCategoryRules(
    facts.serviceDecisionCategories,
    candidate.serviceDecisionInclude,
    candidate.serviceDecisionExclude,
  )) {
    reasons.push(facts.serviceDecisionCategories.join(" / "));
  }
  if (facts.monthType && matchesCondition(candidate.monthTypes, facts.monthType)) {
    reasons.push(facts.monthType);
  }
  if (facts.placeType && matchesCondition(candidate.placeTypes, facts.placeType)) {
    reasons.push(facts.placeType);
  }
  if (facts.actionType && matchesCondition(candidate.actionTypes, facts.actionType)) {
    reasons.push(facts.actionType);
  }
  return reasons.length > 0 ? `${reasons.join(" / ")} で残っています` : "利用者・機関・サービス条件で残っています";
}

function getVisibleQuestions() {
  return questionDefinitions.filter((question) => {
    if (question.key !== "actionType") {
      return true;
    }
    return Boolean(state.judgement.answers.placeType);
  });
}

function syncEnrollmentSelection() {
  const organizations = getSelectableOrganizationsForJudgement(state.judgement.clientId);
  state.judgement.organizationId = organizations[0]?.organizationId ?? "";

  const services = getSelectableServicesForJudgement(
    state.judgement.clientId,
    state.judgement.organizationId,
  );
  state.judgement.serviceId = services[0]?.serviceId ?? "";
}

function syncServiceSelection() {
  const services = getSelectableServicesForJudgement(
    state.judgement.clientId,
    state.judgement.organizationId,
  );
  state.judgement.serviceId = services[0]?.serviceId ?? "";
}

function resetJudgementAnswers() {
  state.judgement.answers = { monthType: "", placeType: "", actionType: "" };
  state.judgement.history = [];
}

function getFilteredReportRecords() {
  const records = state.report.records;
  const filters = state.report.filters;
  return records.filter((record) => {
    if (filters.targetMonth && record.targetMonth !== filters.targetMonth) {
      return false;
    }
    if (filters.client && !normalizeText(record.clientName).includes(normalizeText(filters.client))) {
      return false;
    }
    if (filters.addition && !normalizeText(record.additionName).includes(normalizeText(filters.addition))) {
      return false;
    }
    if (filters.status && record.finalStatus !== filters.status) {
      return false;
    }
    if (filters.postCheckStatus && (record.postCheckStatus || "") !== filters.postCheckStatus) {
      return false;
    }
    if (filters.organization && !normalizeText(record.organizationName).includes(normalizeText(filters.organization))) {
      return false;
    }
    if (filters.staff && !normalizeText(record.staffName).includes(normalizeText(filters.staff))) {
      return false;
    }
    if (!matchesQuickSearch([
      record.clientName,
      record.organizationName,
      record.additionName,
      record.postCheckSummary,
      record.savedNote,
      record.rationale,
    ], state.activeSection === "report")) {
      return false;
    }
    return true;
  });
}

function buildSampleReportRecords() {
  return data.reportRecords.map(enrichSampleReportRecord);
}

function getSampleJudgementHistoryRecords(clientId, targetMonth) {
  const normalizedClientId = String(clientId ?? "");
  const normalizedTargetMonth = String(targetMonth ?? "");

  return state.report.records.filter((record) => (
    String(record.clientId ?? "") === normalizedClientId
    && String(record.targetMonth ?? "") === normalizedTargetMonth
  ));
}

function enrichSampleReportRecord(record) {
  const client = getClientById(record.clientId);
  const organization = getOrganizationById(record.organizationId);
  const service = getServiceById(record.serviceId);
  const staff = getStaffById(record.staffId);
  const addition = data.additions.find((item) => item.additionCode === record.additionCode);
  return {
    ...record,
    clientName: client?.clientName ?? "-",
    targetType: client?.targetType ?? "-",
    organizationName: organization?.organizationName ?? "-",
    serviceName: service?.serviceName ?? "-",
    staffName: staff?.staffName ?? "-",
    additionName: addition?.additionName ?? "-",
  };
}

function ensureSelectedReportRecord(records) {
  if (records.some((record) => record.recordId === state.report.selectedRecordId)) {
    return;
  }
  state.report.selectedRecordId = records[0]?.recordId ?? "";
}

function syncReportFiltersFromInputs() {
  state.report.filters = {
    targetMonth: dom.report.filterMonth.value,
    client: dom.report.filterClient.value.trim(),
    addition: dom.report.filterAddition.value.trim(),
    status: dom.report.filterStatus.value,
    postCheckStatus: dom.report.filterPostCheckStatus.value,
    organization: dom.report.filterOrganization.value.trim(),
    staff: dom.report.filterStaff.value.trim(),
  };
}

function writeReportFiltersToInputs() {
  dom.report.filterMonth.value = state.report.filters.targetMonth;
  dom.report.filterClient.value = state.report.filters.client;
  dom.report.filterAddition.value = state.report.filters.addition;
  dom.report.filterStatus.value = state.report.filters.status;
  dom.report.filterPostCheckStatus.value = state.report.filters.postCheckStatus;
  dom.report.filterOrganization.value = state.report.filters.organization;
  dom.report.filterStaff.value = state.report.filters.staff;
}

function moveSelectedColumn(direction) {
  const view = state.report.views[state.report.activeViewCode];
  const currentIndex = view.columns.indexOf(state.report.selectedColumnKey);
  if (currentIndex < 0) {
    return;
  }
  const nextIndex = currentIndex + direction;
  if (nextIndex < 0 || nextIndex >= view.columns.length) {
    return;
  }
  const nextColumns = [...view.columns];
  const [columnKey] = nextColumns.splice(currentIndex, 1);
  nextColumns.splice(nextIndex, 0, columnKey);
  view.columns = nextColumns;
  persistReportViews();
  renderReport();
}

function loadReportViews() {
  try {
    const raw = localStorage.getItem(storageKeys.reportViews);
    if (!raw) {
      return cloneReportViews();
    }
    return { ...cloneReportViews(), ...JSON.parse(raw) };
  } catch (error) {
    return cloneReportViews();
  }
}

function persistReportViews() {
  localStorage.setItem(storageKeys.reportViews, JSON.stringify(state.report.views));
}

function loadActiveViewCode() {
  const viewCode = localStorage.getItem(storageKeys.activeView);
  return viewCode && baseReportViews[viewCode] ? viewCode : "monthly_claim";
}

function getFilterLabel(key) {
  const labels = {
    targetMonth: "対象月",
    client: "利用者",
    addition: "加算",
    status: "判定状態",
    postCheckStatus: "後段状態",
    organization: "機関",
    staff: "相談員",
  };
  return labels[key] ?? key;
}

function cloneReportViews() {
  return JSON.parse(JSON.stringify(baseReportViews));
}

function canUseApiReport() {
  return Boolean(state.dataSource.apiBaseUrl && state.dataSource.configReady);
}

function canUseApiRelations() {
  return Boolean(
    state.dataSource.apiBaseUrl
    && state.dataSource.configReady
    && state.dataSource.clients === "api"
    && state.dataSource.organizations === "api"
    && state.dataSource.services === "api"
  );
}

function canUseApiJudgementContext() {
  return Boolean(
    state.dataSource.apiBaseUrl
    && state.dataSource.configReady
    && state.dataSource.clients === "api"
    && state.dataSource.organizations === "api"
    && state.dataSource.services === "api"
    && state.dataSource.staffs === "api"
  );
}

function getMasterClients() {
  return state.dataSource.clients === "api" ? state.masters.clients : data.clients;
}

function getMasterOrganizations() {
  return state.dataSource.organizations === "api" ? state.masters.organizations : data.organizations;
}

function getMasterServices() {
  return state.dataSource.services === "api" ? state.masters.services : data.services;
}

function getJudgementClients() {
  return getMasterClients();
}

function getJudgementStaffs() {
  return state.dataSource.staffs === "api" ? state.masters.staffs : data.staff;
}

function syncJudgementStaffSelection() {
  const nextStaffId = resolveDefaultJudgementStaffId();
  if (nextStaffId) {
    state.judgement.staffId = nextStaffId;
  }
}

function resolveDefaultJudgementStaffId() {
  const currentStaffs = getJudgementStaffs();
  if (currentStaffs.some((item) => item.staffId === state.judgement.staffId)) {
    return state.judgement.staffId;
  }

  return currentStaffs[0]?.staffId ?? "";
}

function getOrganizationGroupLabel(organization, service = null) {
  if (!organization) {
    return "";
  }

  if (organization.organizationGroup && organization.organizationGroup !== "福祉サービス等提供機関") {
    return organization.organizationGroup;
  }

  const resolvedType = deriveResolvedOrganizationType(organization, service);
  return deriveOrganizationGroupFromType(resolvedType);
}

function getOrganizationServiceSummary(organization) {
  const relationItems = state.relations.organizationServicesByOrganizationId[String(organization?.organizationId ?? "")];
  if (Array.isArray(relationItems)) {
    if (relationItems.length === 0) {
      return "-";
    }

    return relationItems
      .map((item) => item.serviceName)
      .filter(Boolean)
      .join(" / ");
  }

  if (organization.serviceNames) {
    return organization.serviceNames;
  }
  if (!Array.isArray(organization.serviceIds)) {
    return "-";
  }
  return organization.serviceIds
    .map((serviceId) => getServiceById(serviceId)?.serviceName)
    .filter(Boolean)
    .join(" / ");
}

function buildReportApiParams() {
  const params = { limit: String(apiConfig.reportLimit) };
  if (state.report.filters.targetMonth) {
    params.target_month = state.report.filters.targetMonth;
  }
  if (state.report.filters.client) {
    params.client = state.report.filters.client;
  }
  if (state.report.filters.addition) {
    params.addition = state.report.filters.addition;
  }
  if (state.report.filters.status) {
    params.status = state.report.filters.status;
  }
  if (state.report.filters.postCheckStatus) {
    params.post_check_status = state.report.filters.postCheckStatus;
  }
  if (state.report.filters.organization) {
    params.organization = state.report.filters.organization;
  }
  if (state.report.filters.staff) {
    params.staff = state.report.filters.staff;
  }
  return params;
}

function buildApiUrl(path, params = {}) {
  const url = new URL(`${state.dataSource.apiBaseUrl}/${path}`, window.location.href);
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      return;
    }
    url.searchParams.set(key, value);
  });
  return url.toString();
}

async function fetchApiJson(url, options = {}) {
  const headers = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers ?? {}),
  };

  const response = await fetch(url, {
    method: options.method ?? "GET",
    body: options.body,
    headers,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (payload.ok === false) {
    throw new Error(payload.error?.message ?? "APIエラー");
  }

  return payload;
}

function normalizeApiClient(item) {
  return {
    clientId: String(item.client_id ?? ""),
    clientCode: item.client_code ?? "",
    clientName: item.client_name ?? "",
    clientNameKana: item.client_name_kana ?? "",
    targetType: item.target_type ?? "",
  };
}

function normalizeApiOrganization(item) {
  const resolvedOrganizationType = deriveResolvedOrganizationType({
    organizationType: item.organization_type ?? "",
    organizationName: item.organization_name ?? "",
    serviceNames: item.service_names || "",
  });
  return {
    organizationId: String(item.organization_id ?? ""),
    organizationCode: item.organization_code ?? "",
    organizationName: item.organization_name ?? "",
    organizationType: resolvedOrganizationType,
    organizationGroup: deriveOrganizationGroupFromType(resolvedOrganizationType),
    groupNames: item.group_names || "-",
    serviceNames: item.service_names || "-",
  };
}

function normalizeApiService(item) {
  return {
    serviceId: String(item.service_definition_id ?? ""),
    serviceCode: item.service_code ?? "",
    serviceName: item.service_name ?? "",
    serviceCategory: item.service_category ?? "",
    targetScope: item.target_scope ?? item.target_type ?? "",
    groupName: item.constraint_group_code || "-",
  };
}

function normalizeApiStaff(item) {
  return {
    staffId: String(item.staff_id ?? ""),
    staffCode: item.staff_code ?? "",
    staffName: item.staff_name ?? "",
    email: item.email ?? "",
    homeOrganizationId: item.home_organization_id ? String(item.home_organization_id) : "",
    homeOrganizationName: item.home_organization_name || "-",
  };
}

function normalizeApiOrganizationService(item) {
  return {
    organizationServiceId: String(item.organization_service_id ?? ""),
    organizationId: String(item.organization_id ?? ""),
    organizationName: item.organization_name ?? "",
    serviceId: String(item.service_definition_id ?? ""),
    serviceCode: item.service_code ?? "",
    serviceName: item.service_name ?? "",
    serviceCategory: item.service_category ?? "",
    targetScope: item.target_scope ?? item.target_type ?? "",
    constraintGroupCode: item.constraint_group_code ?? "",
    groupNames: item.group_names || "-",
  };
}

function normalizeApiClientEnrollment(item) {
  return {
    clientEnrollmentId: String(item.client_enrollment_id ?? ""),
    clientId: String(item.client_id ?? ""),
    clientName: item.client_name ?? "",
    organizationServiceId: String(item.organization_service_id ?? ""),
    organizationId: String(item.organization_id ?? ""),
    organizationName: item.organization_name ?? "",
    serviceId: String(item.service_definition_id ?? ""),
    serviceName: item.service_name ?? "",
    serviceCategory: item.service_category ?? "",
    serviceTargetScope: item.service_target_scope ?? item.service_target_type ?? "",
    serviceGroupId: item.service_group_id ? String(item.service_group_id) : "",
    groupName: item.group_name || "-",
    note: item.note ?? "",
  };
}

function normalizeApiJudgementEnrollment(item) {
  const resolvedOrganizationType = deriveResolvedOrganizationType({
    organizationType: item.organization_type ?? "",
    organizationName: item.organization_name ?? "",
    serviceNames: item.service_name ?? "",
  });
  return {
    enrollmentId: String(item.client_enrollment_id ?? ""),
    clientId: String(item.client_id ?? ""),
    organizationId: String(item.organization_id ?? ""),
    organizationName: item.organization_name ?? "",
    organizationType: resolvedOrganizationType,
    organizationGroup: item.organization_group || deriveOrganizationGroupFromType(resolvedOrganizationType),
    serviceId: String(item.service_definition_id ?? ""),
    serviceName: item.service_name ?? "",
    serviceCategory: item.service_category ?? "",
    serviceTargetScope: item.service_target_scope ?? item.service_target_type ?? "",
    groupName: item.service_group_name || "-",
  };
}

function normalizeApiReportRecord(item) {
  return {
    recordId: String(item.evaluation_case_id ?? ""),
    targetMonth: item.target_month ?? "",
    performedAt: item.performed_at ?? "",
    clientId: String(item.client_id ?? ""),
    clientName: item.client_name ?? "-",
    targetType: item.target_type ?? "-",
    organizationId: String(item.organization_id ?? ""),
    organizationName: item.organization_name ?? "-",
    serviceId: String(item.service_definition_id ?? ""),
    serviceName: item.service_name ?? "-",
    staffId: String(item.staff_id ?? ""),
    staffName: item.staff_name ?? "-",
    actionType: item.action_type ?? "",
    additionCode: item.addition_code ?? "",
    additionName: item.addition_name ?? "-",
    finalStatus: item.final_status ?? "-",
    postCheckStatus: item.post_check_status ?? "",
    postCheckSummary: item.post_check ?? "-",
    evaluatedAt: item.evaluated_at ?? "",
    rationale: item.message ?? "-",
    savedNote: item.final_note_text ?? "-",
  };
}

function formatPostCheckStatusLabel(value) {
  const normalized = String(value ?? "").trim();
  const labels = {
    ok: "問題なし",
    review: "要確認",
    pending: "確認待ち",
    none: "対象なし",
  };
  return labels[normalized] ?? (normalized || "-");
}

function updateApiDataStatusPill() {
  if (!dom.apiDataStatus) {
    return;
  }

  const apiCount = ["clients", "organizations", "services", "staffs", "judgement", "report", "relations"]
    .filter((key) => state.dataSource[key] === "api")
    .length;

  let label = "データ: 試作用";
  if (state.dataSource.apiBaseUrl && !state.dataSource.configReady) {
    label = "データ: 試作用 / API設定待ち";
  } else if (state.dataSource.apiBaseUrl && state.dataSource.configReady && apiCount === 0) {
    label = state.dataSource.note ? "データ: 試作用 / APIエラー" : "データ: API接続準備中";
  } else if (apiCount === 7) {
    label = "データ: API接続";
  } else if (apiCount > 0) {
    label = "データ: 一部API / 一部試作用";
  }

  dom.apiDataStatus.textContent = label;
  dom.apiDataStatus.title = state.dataSource.note || label;
}

function deriveResolvedOrganizationType(organization, service = null) {
  const explicitType = String(organization?.organizationType ?? "").trim();
  if (explicitType) {
    return explicitType;
  }

  const sourceTexts = [
    service?.serviceName,
    organization?.organizationName,
    organization?.serviceNames,
    ...(getOrganizationServicesForOrganization(String(organization?.organizationId ?? "")).map((item) => item.serviceName)),
  ]
    .filter(Boolean)
    .join(" / ");

  if (sourceTexts.includes("訪問看護") || sourceTexts.includes("訪看")) {
    return "訪問看護";
  }

  if (sourceTexts.includes("薬局")) {
    return "薬局";
  }

  if (sourceTexts.includes("病院")) {
    return "病院";
  }

  if (sourceTexts.includes("就業・生活支援センター") || sourceTexts.includes("就労支援センター")) {
    return "障害者就業・生活支援センター";
  }

  if (sourceTexts.includes("ケアマネ")) {
    return "ケアマネ事業所";
  }

  if (sourceTexts.includes("保育") || sourceTexts.includes("保育所") || sourceTexts.includes("保育園") || sourceTexts.includes("幼稚園")) {
    return "保育";
  }

  if (sourceTexts.includes("学校")) {
    return "学校";
  }

  if (sourceTexts.includes("会社") || sourceTexts.includes("企業")) {
    return "企業";
  }

  return "";
}

function getDisplayOrganizationType(organization, service = null) {
  return deriveResolvedOrganizationType(organization, service) || "-";
}

function deriveOrganizationGroupFromType(organizationType) {
  return ["病院", "訪問看護", "薬局"].includes(organizationType)
    ? "病院・訪看・薬局グループ"
    : "福祉サービス等提供機関";
}

function renderSelectOptions(element, items, selectedValue, mapper, emptyLabel = "選択肢なし") {
  if (items.length === 0) {
    element.innerHTML = `<option value="">${escapeHtml(emptyLabel)}</option>`;
    return;
  }

  element.innerHTML = items.map((item) => {
    const option = mapper(item);
    return `<option value="${escapeHtml(option.value)}"${option.value === selectedValue ? " selected" : ""}>${escapeHtml(option.label)}</option>`;
  }).join("");
}

function matchesQuickSearch(values, onlyWhenActive = state.activeSection === "clients" || state.activeSection === "organizations" || state.activeSection === "services") {
  if (!state.quickSearch || !onlyWhenActive) {
    return true;
  }
  return normalizeText(values.join(" ")).includes(normalizeText(state.quickSearch));
}

function normalizeText(value) {
  return String(value ?? "").toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getClientById(clientId) {
  return getJudgementClients().find((item) => item.clientId === clientId) ?? data.clients.find((item) => item.clientId === clientId);
}

function getOrganizationById(organizationId) {
  return getMasterOrganizations().find((item) => item.organizationId === organizationId) ?? data.organizations.find((item) => item.organizationId === organizationId);
}

function getServiceById(serviceId) {
  return getMasterServices().find((item) => item.serviceId === serviceId) ?? data.services.find((item) => item.serviceId === serviceId);
}

function getStaffById(staffId) {
  return getJudgementStaffs().find((item) => item.staffId === staffId) ?? data.staff.find((item) => item.staffId === staffId);
}
