const fs = require("fs");
const path = require("path");

const questionCatalogPath = path.resolve(__dirname, "../runtime/import/prototype_question_catalog.json");
const additionCatalogPath = path.resolve(__dirname, "../runtime/import/prototype_addition_catalog.json");
const branchRuleCatalogPath = path.resolve(__dirname, "../runtime/import/prototype_branch_rule_catalog.json");

function normalizeApiBaseUrl(rawValue) {
  const normalized = String(rawValue ?? "").trim().replace(/\/+$/, "");
  if (!normalized) {
    throw new Error("API URL を指定してください。例: https://shinonome-kai.or.jp/kasan2/api");
  }

  if (normalized.endsWith("/api")) {
    return normalized;
  }

  return `${normalized}/api`;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  const text = await response.text();
  let json = null;

  try {
    json = JSON.parse(text);
  } catch (error) {
    const trimmedBody = text.trim();
    const hint = response.status === 404 || trimmedBody === "index.php"
      ? "API ファイル未配置か、公開サーバーの rewrite が先に反応している可能性があります。"
      : "JSON 以外の応答です。";
    throw new Error(`${url} が JSON を返しませんでした。status=${response.status} body=${trimmedBody.slice(0, 300)} hint=${hint}`);
  }

  if (!response.ok) {
    throw new Error(`${url} がエラーを返しました。status=${response.status} body=${JSON.stringify(json).slice(0, 300)}`);
  }

  return json;
}

function loadExpectedCatalogCounts() {
  const questionCatalog = JSON.parse(fs.readFileSync(questionCatalogPath, "utf8"));
  const additionCatalog = JSON.parse(fs.readFileSync(additionCatalogPath, "utf8"));
  const branchRuleCatalog = JSON.parse(fs.readFileSync(branchRuleCatalogPath, "utf8"));

  return {
    questionCount: Array.isArray(questionCatalog.questions) ? questionCatalog.questions.length : 0,
    questionKeys: new Set(
      (Array.isArray(questionCatalog.questions) ? questionCatalog.questions : [])
        .map((item) => String(item.fieldKey ?? "").trim())
        .filter(Boolean)
    ),
    familyCount: Array.isArray(additionCatalog.families) ? additionCatalog.families.length : 0,
    familyCodes: new Set(
      (Array.isArray(additionCatalog.families) ? additionCatalog.families : [])
        .map((item) => String(item.additionCode ?? "").trim())
        .filter(Boolean)
    ),
    branchCount: Array.isArray(branchRuleCatalog.branches) ? branchRuleCatalog.branches.length : 0,
    branchCodes: new Set(
      (Array.isArray(branchRuleCatalog.branches) ? branchRuleCatalog.branches : [])
        .map((item) => String(item.branchCode ?? "").trim())
        .filter(Boolean)
    ),
  };
}

function collectRemoteAdditionStats(additions) {
  const families = Array.isArray(additions) ? additions : [];
  const familyCodes = new Set();
  const branchCodes = new Set();
  let branchCount = 0;

  for (const family of families) {
    const familyCode = String(family?.additionCode ?? "").trim();
    if (familyCode) {
      familyCodes.add(familyCode);
    }

    const branches = Array.isArray(family?.branches) ? family.branches : [];
    branchCount += branches.length;

    for (const branch of branches) {
      const branchCode = String(branch?.branchCode ?? "").trim();
      if (branchCode) {
        branchCodes.add(branchCode);
      }
    }
  }

  return {
    familyCount: families.length,
    familyCodes,
    branchCount,
    branchCodes,
  };
}

function findMissing(expected, actual) {
  return Array.from(expected).filter((value) => !actual.has(value));
}

async function main() {
  const apiBaseUrl = normalizeApiBaseUrl(process.argv[2] ?? "");
  const expected = loadExpectedCatalogCounts();
  const warnings = [];

  const health = await fetchJson(`${apiBaseUrl}/health.php?check=db`);
  if (!health.ok || !health.checks || health.checks.config !== true || health.checks.db !== true) {
    throw new Error(`health.php の結果が不正です: ${JSON.stringify(health)}`);
  }
  console.log("[pass] health.php config/db ok");

  const questionCatalog = await fetchJson(`${apiBaseUrl}/question-catalog.php`);
  const remoteQuestions = Array.isArray(questionCatalog.questions) ? questionCatalog.questions : [];
  if (questionCatalog.ok !== true) {
    throw new Error(`question-catalog.php の ok が true ではありません: ${JSON.stringify(questionCatalog)}`);
  }
  if (remoteQuestions.length !== expected.questionCount) {
    throw new Error(`question count mismatch: expected ${expected.questionCount}, got ${remoteQuestions.length}`);
  }

  const remoteQuestionKeys = new Set(
    remoteQuestions.map((item) => String(item.fieldKey ?? "").trim()).filter(Boolean)
  );
  const missingQuestionKeys = findMissing(expected.questionKeys, remoteQuestionKeys);
  if (missingQuestionKeys.length > 0) {
    throw new Error(`question keys missing: ${missingQuestionKeys.join(", ")}`);
  }
  if (remoteQuestions.length > 0) {
    const firstQuestion = remoteQuestions[0];
    if (String(firstQuestion.key ?? "").trim() === "" || !Number.isFinite(Number(firstQuestion.order ?? NaN))) {
      throw new Error(`question-catalog.php が runtime-ready shape を返していません: ${JSON.stringify(firstQuestion).slice(0, 300)}`);
    }
  }
  console.log(`[pass] question-catalog.php ${remoteQuestions.length}/${expected.questionCount}`);

  const additionCatalog = await fetchJson(`${apiBaseUrl}/addition-catalog.php`);
  const remoteAdditions = Array.isArray(additionCatalog.additions) ? additionCatalog.additions : [];
  if (additionCatalog.ok !== true) {
    throw new Error(`addition-catalog.php の ok が true ではありません: ${JSON.stringify(additionCatalog)}`);
  }

  const remoteStats = collectRemoteAdditionStats(remoteAdditions);
  if (remoteStats.familyCount !== expected.familyCount) {
    throw new Error(`addition family count mismatch: expected ${expected.familyCount}, got ${remoteStats.familyCount}`);
  }
  if (remoteStats.branchCount !== expected.branchCount) {
    throw new Error(`addition branch count mismatch: expected ${expected.branchCount}, got ${remoteStats.branchCount}`);
  }

  const missingFamilyCodes = findMissing(expected.familyCodes, remoteStats.familyCodes);
  if (missingFamilyCodes.length > 0) {
    throw new Error(`addition family codes missing: ${missingFamilyCodes.join(", ")}`);
  }

  const missingBranchCodes = findMissing(expected.branchCodes, remoteStats.branchCodes);
  if (missingBranchCodes.length > 0) {
    throw new Error(`addition branch codes missing: ${missingBranchCodes.join(", ")}`);
  }
  if (remoteAdditions.length > 0) {
    const firstFamily = remoteAdditions[0];
    const firstBranch = Array.isArray(firstFamily.branches) ? firstFamily.branches[0] : null;
    if (
      !firstBranch
      || String(firstBranch.additionCode ?? "").trim() === ""
      || String(firstBranch.additionFamilyCode ?? "").trim() === ""
      || !Array.isArray(firstBranch.conditionGroups)
      || !Array.isArray(firstBranch.postCheckRules)
    ) {
      throw new Error(`addition-catalog.php が runtime-ready shape を返していません: ${JSON.stringify(firstBranch ?? firstFamily).slice(0, 300)}`);
    }
  }
  console.log(`[pass] addition-catalog.php family ${remoteStats.familyCount}/${expected.familyCount}, branch ${remoteStats.branchCount}/${expected.branchCount}`);

  const reportRecords = await fetchJson(`${apiBaseUrl}/report-records.php?limit=1`);
  if (reportRecords.ok !== true || !Array.isArray(reportRecords.items)) {
    throw new Error(`report-records.php の戻りが不正です: ${JSON.stringify(reportRecords)}`);
  }

  if (reportRecords.items.length === 0) {
    warnings.push("report-records.php は 0件でした。candidate_count / candidate_names_summary の live 確認は未実施です。");
  } else {
    const firstItem = reportRecords.items[0];
    const hasCandidateCount = Object.prototype.hasOwnProperty.call(firstItem, "candidate_count");
    const hasCandidateSummary = Object.prototype.hasOwnProperty.call(firstItem, "candidate_names_summary");
    if (!hasCandidateCount || !hasCandidateSummary) {
      throw new Error(`report-records.php の item に candidate_count / candidate_names_summary がありません: ${JSON.stringify(firstItem)}`);
    }
    console.log("[pass] report-records.php candidate aggregate keys present");
  }

  console.log(`live-api-runtime: ok (${apiBaseUrl})`);
  if (warnings.length > 0) {
    for (const warning of warnings) {
      console.warn(`[warn] ${warning}`);
    }
  }
}

main().catch((error) => {
  console.error(`[fail] ${error.message}`);
  process.exitCode = 1;
});
