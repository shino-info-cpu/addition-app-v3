const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execFileSync } = require("child_process");

const workspaceRoot = path.resolve(__dirname, "..");
const sourceAssetPath = path.join(workspaceRoot, "runtime", "prototype", "prototype-rule-source.js");
const additionCatalogPath = path.join(workspaceRoot, "runtime", "import", "prototype_addition_catalog.json");
const questionCatalogPath = path.join(workspaceRoot, "runtime", "import", "prototype_question_catalog.json");
const branchRuleCatalogPath = path.join(workspaceRoot, "runtime", "import", "prototype_branch_rule_catalog.json");

function runExporter(scriptName) {
  execFileSync("node", [path.join(__dirname, scriptName)], {
    cwd: workspaceRoot,
    stdio: "pipe",
    encoding: "utf8",
  });
}

function readPrototypeData() {
  const source = fs.readFileSync(sourceAssetPath, "utf8");
  const sourceContext = {};
  vm.createContext(sourceContext);
  vm.runInContext(source, sourceContext, { timeout: 1000 });
  const prototypeSource = sourceContext.__KASAN_PROTOTYPE_RULE_SOURCE__;
  if (!prototypeSource || !prototypeSource.data || !Array.isArray(prototypeSource.questionDefinitions)) {
    throw new Error("prototype-rule-source.js から raw prototype source を取得できませんでした。");
  }

  return {
    data: prototypeSource.data,
    questionDefinitions: prototypeSource.questionDefinitions,
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getExpectedFamilies(additions) {
  const families = new Map();
  additions.forEach((addition) => {
    const familyCode = String(addition.additionFamilyCode || addition.additionCode || "").trim();
    const familyName = String(addition.additionFamilyName || addition.additionName || "").trim();
    if (!familyCode) {
      return;
    }
    if (!families.has(familyCode)) {
      families.set(familyCode, familyName);
    }
  });
  return families;
}

function toSortedArray(values) {
  return Array.from(values).sort((left, right) => left.localeCompare(right, "ja"));
}

function compareSets(label, actualValues, expectedValues) {
  const actual = new Set(actualValues);
  const expected = new Set(expectedValues);
  const missing = toSortedArray(Array.from(expected).filter((value) => !actual.has(value)));
  const extra = toSortedArray(Array.from(actual).filter((value) => !expected.has(value)));

  if (missing.length === 0 && extra.length === 0) {
    return `${label}: ${actual.size}/${expected.size}`;
  }

  const parts = [`${label} が一致しません。`];
  if (missing.length > 0) {
    parts.push(`missing=${missing.join(", ")}`);
  }
  if (extra.length > 0) {
    parts.push(`extra=${extra.join(", ")}`);
  }
  throw new Error(parts.join(" "));
}

function ensureBranchRuleShape(branchCatalog) {
  branchCatalog.branches.forEach((branch) => {
    if (!Array.isArray(branch.conditionGroups) || branch.conditionGroups.length === 0) {
      throw new Error(`branch ${branch.branchCode} に conditionGroups がありません。`);
    }
    branch.conditionGroups.forEach((group) => {
      if (!Array.isArray(group.conditions) || group.conditions.length === 0) {
        throw new Error(`branch ${branch.branchCode} group ${group.groupNo} に conditions がありません。`);
      }
    });
    if (!Array.isArray(branch.constraints)) {
      throw new Error(`branch ${branch.branchCode} の constraints 形式が不正です。`);
    }
  });
}

function ensureQuestionCatalogShape(questionCatalog) {
  const questionsByKey = new Map(questionCatalog.questions.map((question) => [question.fieldKey, question]));

  const actionType = questionsByKey.get("actionType");
  if (!actionType || actionType.visibilityMode !== "answer_rules") {
    throw new Error("actionType の visibilityMode が answer_rules ではありません。");
  }
  const actionTypeDynamicOptions = Array.isArray(actionType.options)
    ? actionType.options.filter((option) => Array.isArray(option.optionRules) && option.optionRules.length > 0)
    : [];
  if (actionTypeDynamicOptions.length === 0) {
    throw new Error("actionType の動的選択肢条件が seed 化されていません。");
  }

  const hospitalAdmissionContext = questionsByKey.get("hospitalAdmissionContext");
  if (!hospitalAdmissionContext || hospitalAdmissionContext.visibilityMode !== "candidate_requirement") {
    throw new Error("hospitalAdmissionContext の candidate requirement 移管が不完全です。");
  }

  const serviceUseStartMonth = questionsByKey.get("serviceUseStartMonth");
  if (!serviceUseStartMonth || serviceUseStartMonth.visibilityMode !== "candidate_requirement") {
    throw new Error("serviceUseStartMonth の candidate requirement 移管が不完全です。");
  }
  if (!serviceUseStartMonth.visibilityConfig || serviceUseStartMonth.visibilityConfig.singleCandidateOnly !== true) {
    throw new Error("serviceUseStartMonth の singleCandidateOnly 設定が欠けています。");
  }
}

function main() {
  runExporter("export_prototype_frontend_source.js");
  runExporter("export_prototype_rule_catalog.js");
  runExporter("export_prototype_question_catalog.js");
  runExporter("export_prototype_branch_rule_catalog.js");

  const { data, questionDefinitions } = readPrototypeData();
  const additions = Array.isArray(data.additions) ? data.additions : [];
  const additionCatalog = readJson(additionCatalogPath);
  const questionCatalog = readJson(questionCatalogPath);
  const branchRuleCatalog = readJson(branchRuleCatalogPath);

  const expectedFamilies = getExpectedFamilies(additions);
  const expectedBranchCodes = additions.map((addition) => String(addition.additionCode || "").trim()).filter(Boolean);
  const expectedQuestionKeys = questionDefinitions.map((question) => String(question.key || "").trim()).filter(Boolean);

  const additionFamilyCodes = additionCatalog.families.map((family) => String(family.additionCode || "").trim()).filter(Boolean);
  const additionBranchCodes = additionCatalog.families.flatMap((family) =>
    Array.isArray(family.branches) ? family.branches.map((branch) => String(branch.branchCode || "").trim()) : []
  ).filter(Boolean);
  const branchRuleCodes = branchRuleCatalog.branches.map((branch) => String(branch.branchCode || "").trim()).filter(Boolean);
  const questionKeys = questionCatalog.questions.map((question) => String(question.fieldKey || "").trim()).filter(Boolean);

  const lines = [];
  lines.push(compareSets("family", additionFamilyCodes, expectedFamilies.keys()));
  lines.push(compareSets("addition branch", additionBranchCodes, expectedBranchCodes));
  lines.push(compareSets("branch rule", branchRuleCodes, expectedBranchCodes));
  lines.push(compareSets("question", questionKeys, expectedQuestionKeys));

  ensureBranchRuleShape(branchRuleCatalog);
  ensureQuestionCatalogShape(questionCatalog);

  process.stdout.write(
    [
      "prototype-db-bridge: ok",
      ...lines,
      `conditions: ${branchRuleCatalog.branches.reduce((sum, branch) => sum + branch.conditionGroups.reduce((groupSum, group) => groupSum + group.conditions.length, 0), 0)}`,
      `constraints: ${branchRuleCatalog.branches.reduce((sum, branch) => sum + branch.constraints.length, 0)}`,
      `visibility-rules: ${questionCatalog.questions.reduce((sum, question) => sum + (Array.isArray(question.visibilityRules) ? question.visibilityRules.length : 0), 0)}`,
      `option-rules: ${questionCatalog.questions.reduce((sum, question) => sum + (Array.isArray(question.options) ? question.options.reduce((optionSum, option) => optionSum + (Array.isArray(option.optionRules) ? option.optionRules.length : 0), 0) : 0), 0)}`,
    ].join("\n") + "\n"
  );
}

main();
