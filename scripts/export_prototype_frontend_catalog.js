const fs = require("fs");
const path = require("path");

const workspaceRoot = path.resolve(__dirname, "..");
const runtimeDir = path.join(workspaceRoot, "runtime", "import");
const additionCatalogPath = path.join(runtimeDir, "prototype_addition_catalog.json");
const branchRuleCatalogPath = path.join(runtimeDir, "prototype_branch_rule_catalog.json");
const questionCatalogPath = path.join(runtimeDir, "prototype_question_catalog.json");
const outputPath = path.join(workspaceRoot, "app", "frontend", "prototype-rule-catalog.js");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function buildRuntimeQuestions(questionCatalog) {
  return (Array.isArray(questionCatalog?.questions) ? questionCatalog.questions : []).map((question) => ({
    key: question.fieldKey,
    order: question.displayOrder,
    label: question.label,
    helper: question.helpTextShort || question.description || "",
    visibilityMode: question.visibilityMode || "always",
    visibilityConfig: question.visibilityConfig || null,
    visibilityRules: Array.isArray(question.visibilityRules)
      ? question.visibilityRules.map((rule) => ({
          dependsOnFieldKey: rule.dependsOnFieldKey,
          matchValues: Array.isArray(rule.matchValues) ? rule.matchValues : [],
          clearOnHide: Boolean(rule.clearOnHide),
          displayOrder: Number(rule.displayOrder || 0),
        }))
      : [],
    options: Array.isArray(question.options)
      ? question.options.map((option) => ({
          value: option.value,
          label: option.label,
          note: option.note || "",
          optionRules: Array.isArray(option.optionRules)
            ? option.optionRules.map((rule) => ({
                dependsOnFieldKey: rule.dependsOnFieldKey,
                matchValues: Array.isArray(rule.matchValues) ? rule.matchValues : [],
                displayOrder: Number(rule.displayOrder || 0),
                note: rule.note || "",
              }))
            : [],
        }))
      : [],
  }));
}

function buildRuntimeAdditions(additionCatalog, branchRuleCatalog) {
  const branchRuleMap = new Map(
    (Array.isArray(branchRuleCatalog?.branches) ? branchRuleCatalog.branches : []).map((branch) => [branch.branchCode, branch])
  );

  const families = (Array.isArray(additionCatalog?.families) ? additionCatalog.families : []).map((family, familyIndex) => ({
    ...family,
    additionId: familyIndex + 1,
    branches: Array.isArray(family.branches)
      ? family.branches.map((branch, branchIndex) => ({
          ...branch,
          additionId: familyIndex + 1,
          additionBranchId: (familyIndex + 1) * 100 + branchIndex + 1,
          conditionGroups: branchRuleMap.get(branch.branchCode)?.conditionGroups ?? [],
          constraints: branchRuleMap.get(branch.branchCode)?.constraints ?? [],
        }))
      : [],
  }));

  return families.flatMap((family) => {
    const familyCode = String(family.additionCode ?? "").trim();
    const familyName = String(family.additionName ?? "").trim();

    return (Array.isArray(family.branches) ? family.branches : []).map((branch) => {
      const parsedDescription = parseBranchDescription(branch.description);

      return {
      additionId: family.additionId,
      additionBranchId: branch.additionBranchId,
      additionCode: String(branch.branchCode ?? "").trim(),
      additionName: String(branch.branchName ?? "").trim(),
      additionFamilyCode: familyCode,
      additionFamilyName: familyName,
      ruleStatus: String(branch.ruleStatus ?? "").trim() || parsedDescription.ruleStatus,
      confirmedRules:
        Array.isArray(branch.confirmedRules) && branch.confirmedRules.length > 0
          ? branch.confirmedRules
          : parsedDescription.confirmedRules,
      provisionalRules:
        Array.isArray(branch.provisionalRules) && branch.provisionalRules.length > 0
          ? branch.provisionalRules
          : parsedDescription.provisionalRules,
      priority: Number(branch.priority ?? branch.autoConfirmPriority ?? 9999),
      historyAdditionCodes: Array.isArray(branch.historyAdditionCodes) ? branch.historyAdditionCodes : [familyCode, String(branch.branchCode ?? "").trim()],
      conditionGroups: Array.isArray(branch.conditionGroups) ? branch.conditionGroups : [],
      postCheckRules: Array.isArray(branch.constraints)
        ? branch.constraints.map((constraint) => constraint.configJson).filter(Boolean)
        : [],
      postCheck: String(branch.postCheck ?? "").trim(),
      };
    });
  });
}

function parseBranchDescription(description) {
  const text = String(description ?? "").replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  const confirmedRules = [];
  const provisionalRules = [];
  let section = "";

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }

    if (trimmed === "確定条件:") {
      section = "confirmed";
      return;
    }

    if (trimmed === "仮置き:") {
      section = "provisional";
      return;
    }

    const normalized = trimmed.replace(/^- /, "").trim();
    if (!normalized) {
      return;
    }

    if (section === "confirmed") {
      confirmedRules.push(normalized);
      return;
    }

    if (section === "provisional") {
      provisionalRules.push(normalized);
    }
  });

  return {
    ruleStatus: provisionalRules.length > 0 ? "一部確定" : (confirmedRules.length > 0 ? "確定条件あり" : ""),
    confirmedRules,
    provisionalRules,
  };
}

function buildAssetContent(runtimeQuestions, runtimeAdditions) {
  const catalog = {
    generatedAt: new Date().toISOString(),
    questions: runtimeQuestions,
    additions: runtimeAdditions,
  };

  return `(function (global) {
  var catalog = ${JSON.stringify(catalog, null, 2)};
  global.__KASAN_PROTOTYPE_RULE_CATALOG__ = catalog;
  if (global.window && typeof global.window === "object") {
    global.window.__KASAN_PROTOTYPE_RULE_CATALOG__ = catalog;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
`;
}

function main() {
  const additionCatalog = readJson(additionCatalogPath);
  const branchRuleCatalog = readJson(branchRuleCatalogPath);
  const questionCatalog = readJson(questionCatalogPath);
  const runtimeQuestions = buildRuntimeQuestions(questionCatalog);
  const runtimeAdditions = buildRuntimeAdditions(additionCatalog, branchRuleCatalog);

  fs.writeFileSync(outputPath, buildAssetContent(runtimeQuestions, runtimeAdditions), "utf8");

  process.stdout.write(
    `frontend-catalog: ${path.relative(workspaceRoot, outputPath)}\n` +
      `questions: ${runtimeQuestions.length}\n` +
      `additions: ${runtimeAdditions.length}\n`
  );
}

main();
