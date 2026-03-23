const fs = require("fs");
const path = require("path");
const vm = require("vm");

const appJsPath = path.resolve(__dirname, "../app/frontend/app.js");
const source = fs.readFileSync(appJsPath, "utf8");

const additionsMatch = source.match(/additions:\s*(\[[\s\S]*?\])\s*,\s*reportRecords:/);
const organizationsMatch = source.match(/organizations:\s*(\[[\s\S]*?\])\s*,\s*services:/);
const reportRecordsMatch = source.match(/reportRecords:\s*(\[[\s\S]*?\])\s*,\s*};/);

if (!additionsMatch || !organizationsMatch || !reportRecordsMatch) {
  console.error("Could not extract prototype additions, organizations, or sample report records from app.js");
  process.exit(1);
}

const additions = vm.runInNewContext(`(${additionsMatch[1]})`);
const organizations = vm.runInNewContext(`(${organizationsMatch[1]})`);
const reportRecords = vm.runInNewContext(`(${reportRecordsMatch[1]})`);

function getAddition(code) {
  const addition = additions.find((item) => item.additionCode === code);
  if (!addition) {
    throw new Error(`Missing addition definition: ${code}`);
  }
  return addition;
}

function getCandidateHistory(addition, clientId, targetMonth) {
  const historyCodes = Array.isArray(addition.historyAdditionCodes)
    ? addition.historyAdditionCodes.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [String(addition.additionCode ?? "").trim()].filter(Boolean);
  return reportRecords.filter((record) => (
    historyCodes.includes(String(record.additionCode ?? "").trim())
    && record.clientId === clientId
    && record.targetMonth === targetMonth
  ));
}

function evaluateRule(rule, context) {
  const filteredHistory = filterHistoryForRule(context.history || [], rule);

  if (rule.code === "monthly_limit_per_client") {
    const existingCount = filteredHistory.length;
    return existingCount >= Number(rule.limit ?? 0)
      ? { level: "review", message: `${rule.label}。今月すでに${existingCount}件あります。` }
      : { level: "ok", message: `${rule.label}。今月既存${existingCount}件で範囲内です。` };
  }

  if (rule.code === "manual_review") {
    return {
      level: "review",
      message: rule.label || "制度要件が未整理のため要確認です。",
    };
  }

  if (rule.code === "blocked_if_answer_true") {
    const answerKey = String(rule.answerKey ?? "").trim();
    const blockedValue = String(rule.blockedValue ?? "はい").trim();
    const answerValue = String(context.answers?.[answerKey] ?? "").trim();

    if (!answerKey) {
      return { level: "skip", message: "" };
    }

    if (!answerValue) {
      return { level: "review", message: `${rule.label}。確認項目が未回答のため要確認です。` };
    }

    return answerValue === blockedValue
      ? { level: "review", message: `${rule.label}。今回は「${answerValue}」です。` }
      : { level: "ok", message: `${rule.label}。今回は「${answerValue}」のため対象外です。` };
  }

  if (rule.code === "monthly_limit_per_client_by_organization_group") {
    const currentGroup = String(context.currentOrganizationGroup ?? "").trim();
    if (!currentGroup) {
      return { level: "review", message: `${rule.label}。相手先グループを特定できないため要確認です。` };
    }

    const history = filteredHistory;
    const sameGroupHistory = history.filter((record) => resolveRecordOrganizationGroup(record) === currentGroup);
    const existingCount = sameGroupHistory.length;

    return existingCount >= Number(rule.limit ?? 0)
      ? { level: "review", message: `${rule.label}（${currentGroup}）。今月すでに${existingCount}件あります。` }
      : { level: "ok", message: `${rule.label}（${currentGroup}）。今月既存${existingCount}件で範囲内です。` };
  }

  if (rule.code === "monthly_limit_per_client_by_organization") {
    const currentOrganizationId = String(context.currentOrganizationId ?? "").trim();
    if (!currentOrganizationId) {
      return { level: "review", message: `${rule.label}。相手先機関を特定できないため要確認です。` };
    }

    const history = filteredHistory;
    const sameOrganizationHistory = history.filter((record) => (
      String(record.organizationId ?? "").trim() === currentOrganizationId
    ));
    const existingCount = sameOrganizationHistory.length;

    return existingCount >= Number(rule.limit ?? 0)
      ? { level: "review", message: `${rule.label}。今月すでに${existingCount}件あります。` }
      : { level: "ok", message: `${rule.label}。今月既存${existingCount}件で範囲内です。` };
  }

  if (rule.code === "monthly_action_count_min") {
    const requiredActions = Array.isArray(rule.actionTypes) ? rule.actionTypes.filter(Boolean) : [];
    if (requiredActions.length > 0 && context.currentActionType && !requiredActions.includes(context.currentActionType)) {
      return { level: "skip", message: "" };
    }

    const history = context.history.filter((record) => (
      requiredActions.length === 0 || requiredActions.includes(record.actionType || "")
    ));
    const projectedCount = history.length + 1;
    return projectedCount < Number(rule.minimum ?? 0)
      ? { level: "review", message: `${rule.label}。今回を含めて${projectedCount}回です。` }
      : { level: "ok", message: `${rule.label}。今回を含めて${projectedCount}回で条件内です。` };
  }

  if (rule.code === "monthly_addition_count_min") {
    const targetCodes = Array.isArray(rule.additionCodes)
      ? rule.additionCodes.map((item) => String(item ?? "").trim()).filter(Boolean)
      : [];
    const countedHistory = targetCodes.length > 0
      ? context.history.filter((record) => targetCodes.includes(String(record.additionCode ?? "").trim()))
      : context.history;
    const projectedCount = countedHistory.length + 1;
    return projectedCount < Number(rule.minimum ?? 0)
      ? { level: "review", message: `${rule.label}。今回を含めて${projectedCount}回です。` }
      : { level: "ok", message: `${rule.label}。今回を含めて${projectedCount}回で条件内です。` };
  }

  if (rule.code === "monthly_distinct_organization_limit_per_client") {
    const organizationIds = new Set(
      context.history.map((record) => String(record.organizationId ?? "")).filter(Boolean),
    );
    organizationIds.add(String(context.currentOrganizationId ?? ""));
    const projectedCount = organizationIds.size;
    return projectedCount > Number(rule.limit ?? 0)
      ? { level: "review", message: `${rule.label}。今回を含めると${projectedCount}機関になります。` }
      : { level: "ok", message: `${rule.label}。今回を含めて${projectedCount}機関です。` };
  }

  if (rule.code === "exclusive_with_addition_codes") {
    const exclusiveCodes = Array.isArray(rule.additionCodes)
      ? rule.additionCodes.map((item) => String(item ?? "").trim()).filter(Boolean)
      : [];
    const recordActionTypes = Array.isArray(rule.recordActionTypes)
      ? rule.recordActionTypes.map((item) => String(item ?? "").trim()).filter(Boolean)
      : [];
    const conflictingRecords = reportRecords.filter((record) => (
      record.clientId === context.clientId
      && record.targetMonth === context.targetMonth
      && exclusiveCodes.includes(String(record.additionCode ?? "").trim())
      && (
        recordActionTypes.length === 0
        || recordActionTypes.includes(String(record.actionType ?? "").trim())
      )
    ));

    return conflictingRecords.length > 0
      ? { level: "review", message: `${rule.label}。今月すでに併算定不可記録があります。` }
      : { level: "ok", message: `${rule.label}。今月の併算定不可記録は見つかっていません。` };
  }

  return { level: "ok", message: "" };
}

function filterHistoryForRule(history, rule) {
  let filtered = Array.isArray(history) ? [...history] : [];
  const additionCodes = Array.isArray(rule?.additionCodes)
    ? rule.additionCodes.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [];
  const recordActionTypes = Array.isArray(rule?.recordActionTypes)
    ? rule.recordActionTypes.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [];

  if (additionCodes.length > 0) {
    filtered = filtered.filter((record) => additionCodes.includes(String(record.additionCode ?? "").trim()));
  }

  if (recordActionTypes.length > 0) {
    filtered = filtered.filter((record) => recordActionTypes.includes(String(record.actionType ?? "").trim()));
  }

  return filtered;
}

function resolveRecordOrganizationGroup(record) {
  const explicitGroup = String(record.organizationGroup ?? "").trim();
  if (explicitGroup) {
    return explicitGroup;
  }

  const organization = organizations.find((item) => String(item.organizationId ?? "") === String(record.organizationId ?? ""));
  return String(organization?.organizationGroup ?? "").trim();
}

function evaluatePostChecks(additionCode, input) {
  const addition = getAddition(additionCode);
  const history = getCandidateHistory(addition, input.clientId, input.targetMonth);
  return addition.postCheckRules.map((rule) => evaluateRule(rule, {
    history,
    answers: input.answers || {},
    clientId: input.clientId,
    targetMonth: input.targetMonth,
    currentActionType: input.actionType,
    currentOrganizationId: input.organizationId,
    currentOrganizationGroup: input.organizationGroup,
  }));
}

const cases = [
  {
    name: "mededu same-group monthly limit becomes review when one history already exists",
    actual: evaluatePostChecks("mededu_info", {
      clientId: "1001",
      targetMonth: "2026-03",
      organizationId: "21",
      organizationGroup: "病院・訪看・薬局グループ",
      actionType: "情報共有",
    }).some((item) => item.level === "review"),
    expected: true,
  },
  {
    name: "mededu group limit still allows a different organization group",
    actual: evaluateRule(
      getAddition("mededu_info").postCheckRules[0],
      {
        currentOrganizationGroup: "福祉サービス等提供機関",
        history: [{ recordId: "x1", organizationGroup: "病院・訪看・薬局グループ" }],
      },
    ).level,
    expected: "ok",
  },
  {
    name: "mededu info group limit ignores interview history from same family",
    actual: evaluateRule(
      getAddition("mededu_info").postCheckRules[0],
      {
        currentOrganizationGroup: "福祉サービス等提供機関",
        history: [{ recordId: "x1", additionCode: "mededu_interview", organizationGroup: "福祉サービス等提供機関", actionType: "面談" }],
      },
    ).level,
    expected: "ok",
  },
  {
    name: "mededu tsuuin uses monthly three-times limit",
    actual: evaluateRule(
      getAddition("mededu_tsuuin").postCheckRules[0],
      {
        history: [
          { recordId: "x1", additionCode: "mededu_tsuuin", actionType: "通院同行" },
          { recordId: "x2", additionCode: "mededu_tsuuin", actionType: "通院同行" },
          { recordId: "x3", additionCode: "mededu_tsuuin", actionType: "通院同行" },
        ],
      },
    ).level,
    expected: "review",
  },
  {
    name: "mededu tsuuin monthly limit ignores other mededu branch history",
    actual: evaluateRule(
      getAddition("mededu_tsuuin").postCheckRules[0],
      {
        history: [{ recordId: "x1", additionCode: "mededu_info" }],
      },
    ).level,
    expected: "ok",
  },
  {
    name: "mededu tsuuin same-organization limit only counts tsuuin branch",
    actual: evaluateRule(
      getAddition("mededu_tsuuin").postCheckRules[1],
      {
        currentOrganizationId: "o1",
        history: [{ recordId: "x1", additionCode: "mededu_tsuuin", organizationId: "o1", actionType: "通院同行" }],
      },
    ).level,
    expected: "review",
  },
  {
    name: "intensive visit requires at least two visits",
    actual: evaluatePostChecks("intensive_visit", {
      clientId: "1001",
      targetMonth: "2026-03",
      organizationId: "10",
      actionType: "訪問",
    }).some((item) => item.level === "review"),
    expected: true,
  },
  {
    name: "intensive visit passes when one visit history already exists",
    actual: evaluatePostChecks("intensive_visit", {
      clientId: "1002",
      targetMonth: "2026-03",
      organizationId: "22",
      actionType: "訪問",
    }).some((item) => item.level === "review"),
    expected: false,
  },
  {
    name: "intensive scene check does not trigger visit-count rule",
    actual: evaluatePostChecks("intensive_scene_check", {
      clientId: "1001",
      targetMonth: "2026-03",
      organizationId: "10",
      actionType: "サービス提供場面確認",
    }).filter((item) => item.message.includes("同月2回以上の訪問が必要")).length,
    expected: 0,
  },
  {
    name: "intensive visit keeps only minimum-visit post-check rule",
    actual: getAddition("intensive_visit").postCheckRules.length,
    expected: 1,
  },
  {
    name: "intensive scene check has no unsupported monthly distinct-organization limit",
    actual: getAddition("intensive_scene_check").postCheckRules.length,
    expected: 0,
  },
  {
    name: "intensive info uses same-group monthly limit",
    actual: evaluateRule(
      getAddition("intensive_info").postCheckRules[0],
      {
        currentOrganizationGroup: "病院・訪看・薬局グループ",
        history: [{ recordId: "x1", additionCode: "intensive_info", organizationGroup: "病院・訪看・薬局グループ", actionType: "情報共有" }],
      },
    ).level,
    expected: "review",
  },
  {
    name: "intensive info still allows a different organization group",
    actual: evaluateRule(
      getAddition("intensive_info").postCheckRules[0],
      {
        currentOrganizationGroup: "福祉サービス等提供機関",
        history: [{ recordId: "x1", organizationGroup: "病院・訪看・薬局グループ" }],
      },
    ).level,
    expected: "ok",
  },
  {
    name: "intensive medical info uses same-group monthly limit across split info branches",
    actual: evaluateRule(
      getAddition("intensive_info_medical").postCheckRules[0],
      {
        currentOrganizationGroup: "病院・訪看・薬局グループ",
        history: [{ recordId: "x1", additionCode: "intensive_info", organizationGroup: "病院・訪看・薬局グループ", actionType: "情報共有" }],
      },
    ).level,
    expected: "review",
  },
  {
    name: "intensive pharmacy info uses same-group monthly limit across split info branches",
    actual: evaluateRule(
      getAddition("intensive_info_pharmacy").postCheckRules[0],
      {
        currentOrganizationGroup: "病院・訪看・薬局グループ",
        history: [{ recordId: "x1", additionCode: "intensive_info_medical", organizationGroup: "病院・訪看・薬局グループ", actionType: "情報共有" }],
      },
    ).level,
    expected: "review",
  },
  {
    name: "intensive info group limit ignores visit history from same family",
    actual: evaluateRule(
      getAddition("intensive_info").postCheckRules[0],
      {
        currentOrganizationGroup: "福祉サービス等提供機関",
        history: [{ recordId: "x1", additionCode: "intensive_visit", organizationGroup: "福祉サービス等提供機関", actionType: "訪問" }],
      },
    ).level,
    expected: "ok",
  },
  {
    name: "intensive tsuuin reviews when same organization already exists this month",
    actual: evaluateRule(
      getAddition("intensive_tsuuin").postCheckRules[1],
      {
        currentOrganizationId: "o1",
        history: [{ recordId: "x1", additionCode: "intensive_tsuuin", organizationId: "o1", actionType: "通院同行" }],
      },
    ).level,
    expected: "review",
  },
  {
    name: "intensive tsuuin reviews after three monthly records",
    actual: evaluateRule(
      getAddition("intensive_tsuuin").postCheckRules[0],
      {
        history: [
          { recordId: "x1", additionCode: "intensive_tsuuin", actionType: "通院同行" },
          { recordId: "x2", additionCode: "intensive_tsuuin", actionType: "通院同行" },
          { recordId: "x3", additionCode: "intensive_tsuuin", actionType: "通院同行" },
        ],
      },
    ).level,
    expected: "review",
  },
  {
    name: "intensive tsuuin limits ignore other intensive branch history",
    actual: evaluateRule(
      getAddition("intensive_tsuuin").postCheckRules[0],
      {
        history: [{ recordId: "x1", additionCode: "intensive_info", actionType: "情報共有" }],
      },
    ).level,
    expected: "ok",
  },
  {
    name: "intensive meeting host has no extra post-check review when no explicit upper limit exists",
    actual: evaluatePostChecks("intensive_meeting_host", {
      clientId: "1001",
      targetMonth: "2026-03",
      organizationId: "10",
      organizationGroup: "福祉サービス等提供機関",
      actionType: "担当者会議開催",
    }).some((item) => item.level === "review"),
    expected: false,
  },
  {
    name: "intensive meeting join has no extra post-check review when no explicit upper limit exists",
    actual: evaluatePostChecks("intensive_meeting_join", {
      clientId: "1001",
      targetMonth: "2026-03",
      organizationId: "10",
      organizationGroup: "福祉サービス等提供機関",
      actionType: "会議",
    }).some((item) => item.level === "review"),
    expected: false,
  },
  {
    name: "edu visit requires at least two monthly visit records",
    actual: evaluateRule(
      getAddition("edu_visit").postCheckRules[0],
      {
        history: [],
      },
    ).level,
    expected: "review",
  },
  {
    name: "home visit passes when one same-branch visit history already exists",
    actual: evaluateRule(
      getAddition("home_visit").postCheckRules[0],
      {
        history: [{ recordId: "x1", additionCode: "home_visit", actionType: "面談" }],
      },
    ).level,
    expected: "ok",
  },
  {
    name: "home work visit ignores generic legacy family code for visit minimum",
    actual: evaluateRule(
      getAddition("home_work_visit").postCheckRules[0],
      {
        history: [{ recordId: "x1", additionCode: "home_work_collab" }],
      },
    ).level,
    expected: "review",
  },
  {
    name: "monitoring monthly once is ok when no history exists",
    actual: evaluatePostChecks("monitoring", {
      clientId: "1001",
      targetMonth: "2026-03",
      organizationId: "11",
      actionType: "サービス提供場面確認",
    }).some((item) => item.level === "review"),
    expected: false,
  },
  {
    name: "monitoring monthly once becomes review when one monitoring history already exists",
    actual: evaluateRule(
      getAddition("monitoring").postCheckRules[0],
      {
        history: [{ recordId: "x1", additionCode: "monitoring", actionType: "サービス提供場面確認" }],
      },
    ).level,
    expected: "review",
  },
  {
    name: "monitoring monthly once ignores hospital info history",
    actual: evaluateRule(
      getAddition("monitoring").postCheckRules[0],
      {
        history: [{ recordId: "x1", additionCode: "hospital_info_i", actionType: "情報共有" }],
      },
    ).level,
    expected: "ok",
  },
  {
    name: "home info monthly limit of two is ok with one existing history",
    actual: evaluateRule(
      getAddition("home_info").postCheckRules[0],
      {
        history: [{ recordId: "x1", additionCode: "home_info", actionType: "情報共有" }],
      },
    ).level,
    expected: "ok",
  },
  {
    name: "home info monthly limit ignores visit history from same family",
    actual: evaluateRule(
      getAddition("home_info").postCheckRules[0],
      {
        history: [{ recordId: "x1", additionCode: "home_visit" }],
      },
    ).level,
    expected: "ok",
  },
  {
    name: "home work info monthly limit of two becomes review with two existing histories",
    actual: evaluateRule(
      getAddition("home_work_info").postCheckRules[0],
      {
        history: [
          { recordId: "x1", additionCode: "home_work_info", actionType: "情報共有" },
          { recordId: "x2", additionCode: "home_work_info", actionType: "情報共有" },
        ],
      },
    ).level,
    expected: "review",
  },
  {
    name: "home work info monthly limit ignores meeting history from same family",
    actual: evaluateRule(
      getAddition("home_work_info").postCheckRules[0],
      {
        history: [{ recordId: "x1", additionCode: "home_work_meeting", actionType: "会議" }],
      },
    ).level,
    expected: "ok",
  },
  {
    name: "hospital info I monthly once becomes review when one history already exists",
    actual: evaluatePostChecks("hospital_info_i", {
      clientId: "1003",
      targetMonth: "2026-01",
      organizationId: "21",
      actionType: "情報共有",
    }).some((item) => item.message.includes("同月1回まで") && item.level === "review"),
    expected: true,
  },
  {
    name: "hospital info II detects incompatible I history in same month",
    actual: evaluatePostChecks("hospital_info_ii", {
      clientId: "1003",
      targetMonth: "2026-01",
      organizationId: "21",
      actionType: "情報共有",
    }).some((item) => item.message.includes("Iとの併算定不可") && item.level === "review"),
    expected: true,
  },
  {
    name: "hospital info I monthly limit ignores II history and relies on exclusive rule separately",
    actual: evaluateRule(
      getAddition("hospital_info_i").postCheckRules[0],
      {
        history: [{ recordId: "x1", additionCode: "hospital_info_ii", actionType: "情報共有" }],
      },
    ).level,
    expected: "ok",
  },
  {
    name: "conference monthly once becomes review when one history already exists",
    actual: evaluatePostChecks("conference", {
      clientId: "1003",
      targetMonth: "2026-03",
      organizationId: "10",
      organizationGroup: "福祉サービス等提供機関",
      actionType: "担当者会議開催",
    }).some((item) => item.message.includes("同月1回まで") && item.level === "review"),
    expected: true,
  },
  {
    name: "conference detects incompatible legacy mededu interview history in same month",
    actual: evaluatePostChecks("conference", {
      clientId: "1002",
      targetMonth: "2026-03",
      organizationId: "11",
      organizationGroup: "福祉サービス等提供機関",
      actionType: "担当者会議開催",
    }).some((item) => item.message.includes("医保教（面談・会議）との併算定不可") && item.level === "review"),
    expected: true,
  },
  {
    name: "mededu interview detects incompatible conference history in same month",
    actual: evaluatePostChecks("mededu_interview", {
      clientId: "1003",
      targetMonth: "2026-03",
      organizationId: "10",
      organizationGroup: "福祉サービス等提供機関",
      actionType: "面談",
      answers: { initialAdditionPlanned: "初回加算なし" },
    }).some((item) => item.message.includes("担当者会議加算との併算定不可") && item.level === "review"),
    expected: true,
  },
  {
    name: "mededu interview becomes review when initial addition is also planned",
    actual: evaluatePostChecks("mededu_interview", {
      clientId: "1003",
      targetMonth: "2026-02",
      organizationId: "10",
      organizationGroup: "福祉サービス等提供機関",
      actionType: "面談",
      answers: { initialAdditionPlanned: "初回加算あり" },
    }).some((item) => item.message.includes("初回加算算定時は不可") && item.level === "review"),
    expected: true,
  },
  {
    name: "mededu interview becomes review when info is only from discharge facility staff",
    actual: evaluatePostChecks("mededu_interview", {
      clientId: "1003",
      targetMonth: "2026-02",
      organizationId: "10",
      organizationGroup: "福祉サービス等提供機関",
      actionType: "面談",
      answers: { dischargeFacilityStaffOnlyInfo: "施設職員のみ", initialAdditionPlanned: "初回加算なし" },
    }).some((item) => item.message.includes("退院・退所する施設の職員のみからの情報なら不可") && item.level === "review"),
    expected: true,
  },
  {
    name: "mededu meeting becomes review when info is only from discharge facility staff",
    actual: evaluatePostChecks("mededu_meeting", {
      clientId: "1003",
      targetMonth: "2026-02",
      organizationId: "10",
      organizationGroup: "福祉サービス等提供機関",
      actionType: "会議",
      answers: { dischargeFacilityStaffOnlyInfo: "施設職員のみ", initialAdditionPlanned: "初回加算なし" },
    }).some((item) => item.message.includes("退院・退所する施設の職員のみからの情報なら不可") && item.level === "review"),
    expected: true,
  },
  {
    name: "mededu meeting stays ok for initial addition rule when initial addition is not planned",
    actual: evaluateRule(
      getAddition("mededu_meeting").postCheckRules[1],
      {
        answers: { initialAdditionPlanned: "初回加算なし" },
      },
    ).level,
    expected: "ok",
  },
  {
    name: "discharge becomes review when initial addition is also planned",
    actual: evaluatePostChecks("discharge", {
      clientId: "1001",
      targetMonth: "2026-02",
      organizationId: "21",
      organizationGroup: "病院・訪看・薬局グループ",
      actionType: "退院前面談",
      answers: { initialAdditionPlanned: "初回加算あり" },
    }).some((item) => item.message.includes("初回加算算定時は不可") && item.level === "review"),
    expected: true,
  },
  {
    name: "discharge does not use facility-staff-only rule",
    actual: evaluatePostChecks("discharge", {
      clientId: "1001",
      targetMonth: "2026-02",
      organizationId: "21",
      organizationGroup: "病院・訪看・薬局グループ",
      actionType: "退院前面談",
      answers: {
        serviceUseStartMonth: "開始月である",
        dischargeFacilityStaffOnlyInfo: "施設職員のみ",
        initialAdditionPlanned: "初回加算なし",
      },
    }).some((item) => item.message.includes("退院・退所する施設の職員のみからの情報なら不可")),
    expected: false,
  },
  {
    name: "conference ignores legacy mededu info history because only 面談・会議 are incompatible",
    actual: evaluatePostChecks("conference", {
      clientId: "1001",
      targetMonth: "2026-03",
      organizationId: "10",
      organizationGroup: "福祉サービス等提供機関",
      actionType: "担当者会議開催",
    }).some((item) => item.message.includes("医保教（面談・会議）との併算定不可") && item.level === "review"),
    expected: false,
  },
  {
    name: "exclusive rule engine can detect conflicting addition history",
    actual: evaluateRule(
      {
        code: "exclusive_with_addition_codes",
        additionCodes: ["mededu"],
        recordActionTypes: ["面談", "会議"],
        label: "併算定不可",
      },
      {
        clientId: "1002",
        targetMonth: "2026-03",
      },
    ).level,
    expected: "review",
  },
  {
    name: "exclusive rule engine can ignore non-target action types on same addition code",
    actual: evaluateRule(
      {
        code: "exclusive_with_addition_codes",
        additionCodes: ["mededu"],
        recordActionTypes: ["面談", "会議"],
        label: "併算定不可",
      },
      {
        clientId: "1001",
        targetMonth: "2026-03",
      },
    ).level,
    expected: "ok",
  },
];

const failures = cases.filter((testCase) => testCase.actual !== testCase.expected);

cases.forEach((testCase) => {
  const status = testCase.actual === testCase.expected ? "PASS" : "FAIL";
  console.log(`${status}: ${testCase.name}`);
});

if (failures.length > 0) {
  console.error(`\n${failures.length} prototype post-check checks failed.`);
  process.exit(1);
}

console.log(`\nAll ${cases.length} prototype post-check checks passed.`);
