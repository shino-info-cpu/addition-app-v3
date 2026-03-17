const fs = require("fs");
const path = require("path");
const vm = require("vm");

const appJsPath = path.resolve(__dirname, "../app/frontend/app.js");
const source = fs.readFileSync(appJsPath, "utf8");

const additionsMatch = source.match(/additions:\s*(\[[\s\S]*?\])\s*,\s*reportRecords:/);
const reportRecordsMatch = source.match(/reportRecords:\s*(\[[\s\S]*?\])\s*,\s*};/);

if (!additionsMatch || !reportRecordsMatch) {
  console.error("Could not extract prototype additions or sample report records from app.js");
  process.exit(1);
}

const additions = vm.runInNewContext(`(${additionsMatch[1]})`);
const reportRecords = vm.runInNewContext(`(${reportRecordsMatch[1]})`);

function getAddition(code) {
  const addition = additions.find((item) => item.additionCode === code);
  if (!addition) {
    throw new Error(`Missing addition definition: ${code}`);
  }
  return addition;
}

function getCandidateHistory(additionCode, clientId, targetMonth) {
  return reportRecords.filter((record) => (
    record.additionCode === additionCode
    && record.clientId === clientId
    && record.targetMonth === targetMonth
  ));
}

function evaluateRule(rule, context) {
  if (rule.code === "monthly_limit_per_client") {
    const existingCount = context.history.length;
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
    const conflictingRecords = reportRecords.filter((record) => (
      record.clientId === context.clientId
      && record.targetMonth === context.targetMonth
      && exclusiveCodes.includes(String(record.additionCode ?? "").trim())
    ));

    return conflictingRecords.length > 0
      ? { level: "review", message: `${rule.label}。今月すでに併算定不可記録があります。` }
      : { level: "ok", message: `${rule.label}。今月の併算定不可記録は見つかっていません。` };
  }

  return { level: "ok", message: "" };
}

function evaluatePostChecks(additionCode, input) {
  const addition = getAddition(additionCode);
  const history = getCandidateHistory(additionCode, input.clientId, input.targetMonth);
  return addition.postCheckRules.map((rule) => evaluateRule(rule, {
    history,
    clientId: input.clientId,
    targetMonth: input.targetMonth,
    currentActionType: input.actionType,
    currentOrganizationId: input.organizationId,
  }));
}

const cases = [
  {
    name: "mededu monthly once becomes review when one history already exists",
    actual: evaluatePostChecks("mededu", {
      clientId: "1001",
      targetMonth: "2026-03",
      organizationId: "21",
      actionType: "情報共有",
    }).some((item) => item.level === "review"),
    expected: true,
  },
  {
    name: "intensive visit requires at least two visits",
    actual: evaluatePostChecks("intensive", {
      clientId: "1001",
      targetMonth: "2026-03",
      organizationId: "10",
      actionType: "訪問",
    }).some((item) => item.level === "review"),
    expected: true,
  },
  {
    name: "intensive visit passes when one visit history already exists",
    actual: evaluatePostChecks("intensive", {
      clientId: "1002",
      targetMonth: "2026-03",
      organizationId: "22",
      actionType: "訪問",
    }).some((item) => item.level === "review"),
    expected: false,
  },
  {
    name: "intensive service scene check does not trigger visit-count rule",
    actual: evaluatePostChecks("intensive", {
      clientId: "1001",
      targetMonth: "2026-03",
      organizationId: "10",
      actionType: "サービス提供場面確認",
    }).filter((item) => item.message.includes("同月2回以上の訪問が必要")).length,
    expected: 0,
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
    name: "home collab monthly limit of two is ok with one existing history",
    actual: evaluateRule(
      getAddition("home_collab").postCheckRules[0],
      {
        history: [{ recordId: "x1" }],
      },
    ).level,
    expected: "ok",
  },
  {
    name: "home work collab monthly limit of two becomes review with two existing histories",
    actual: evaluateRule(
      getAddition("home_work_collab").postCheckRules[0],
      {
        history: [{ recordId: "x1" }, { recordId: "x2" }],
      },
    ).level,
    expected: "review",
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
    name: "exclusive rule engine can detect conflicting addition history",
    actual: evaluateRule(
      {
        code: "exclusive_with_addition_codes",
        additionCodes: ["mededu"],
        label: "併算定不可",
      },
      {
        clientId: "1001",
        targetMonth: "2026-03",
      },
    ).level,
    expected: "review",
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
