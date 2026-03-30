const fs = require("fs");
const path = require("path");

const {
  workspaceRoot,
  canonicalSourcePath,
  loadRuleMasterSourceObject,
} = require("./lib/rule_master_source");

const outputDir = path.join(workspaceRoot, "runtime", "import");
const outputJsonPath = path.join(outputDir, "prototype_branch_rule_catalog.json");
const outputSqlPath = path.join(outputDir, "prototype_branch_rule_seed.sql");
const outputDbSqlPath = path.join(workspaceRoot, "db", "006_seed_prototype_branch_rules.sql");

function readPrototypeData() {
  const sourceAsset = loadRuleMasterSourceObject();
  if (!sourceAsset?.data || typeof sourceAsset.data !== "object") {
    throw new Error("rule master source から prototype data を抽出できませんでした。");
  }
  return sourceAsset.data;
}

function escapeSql(value) {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/'/g, "''");
}

function isUnrestrictedTargetTypes(targetTypes) {
  const normalized = Array.isArray(targetTypes)
    ? targetTypes.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [];

  if (normalized.length === 0) {
    return true;
  }

  const unique = Array.from(new Set(normalized));
  return unique.includes("共通") || (unique.includes("児") && unique.includes("者"));
}

function buildBaseConditions(candidate) {
  const conditions = [];

  if (!isUnrestrictedTargetTypes(candidate.targetTypes)) {
    conditions.push({
      fieldKey: "targetType",
      operatorCode: "one_of",
      expectedValue: candidate.targetTypes,
      note: "利用者の対象区分",
    });
  }

  if (Array.isArray(candidate.organizationGroups) && candidate.organizationGroups.length > 0) {
    conditions.push({
      fieldKey: "organizationGroup",
      operatorCode: "one_of",
      expectedValue: candidate.organizationGroups,
      note: "機関グループ",
    });
  }

  if (Array.isArray(candidate.organizationTypes) && candidate.organizationTypes.length > 0) {
    conditions.push({
      fieldKey: "organizationType",
      operatorCode: "one_of",
      expectedValue: candidate.organizationTypes,
      note: "機関種別",
    });
  }

  if (Array.isArray(candidate.serviceDecisionInclude) && candidate.serviceDecisionInclude.length > 0) {
    conditions.push({
      fieldKey: "serviceDecisionCategories",
      operatorCode: "includes_any",
      expectedValue: candidate.serviceDecisionInclude,
      note: "サービス判定区分の包含条件",
    });
  }

  if (Array.isArray(candidate.serviceDecisionExclude) && candidate.serviceDecisionExclude.length > 0) {
    conditions.push({
      fieldKey: "serviceDecisionCategories",
      operatorCode: "excludes_all",
      expectedValue: candidate.serviceDecisionExclude,
      note: "サービス判定区分の除外条件",
    });
  }

  if (Array.isArray(candidate.monthTypes) && candidate.monthTypes.length > 0) {
    conditions.push({
      fieldKey: "monthType",
      operatorCode: "one_of",
      expectedValue: candidate.monthTypes,
      note: "対応月区分",
    });
  }

  if (Array.isArray(candidate.placeTypes) && candidate.placeTypes.length > 0) {
    conditions.push({
      fieldKey: "placeType",
      operatorCode: "one_of",
      expectedValue: candidate.placeTypes,
      note: "対応場所",
    });
  }

  if (Array.isArray(candidate.actionTypes) && candidate.actionTypes.length > 0) {
    conditions.push({
      fieldKey: "actionType",
      operatorCode: "one_of",
      expectedValue: candidate.actionTypes,
      note: "行為種別",
    });
  }

  Object.entries(candidate.requiredAnswers ?? {}).forEach(([fieldKey, expectedValue]) => {
    conditions.push({
      fieldKey,
      operatorCode: "one_of",
      expectedValue: [expectedValue],
      note: "設問回答の必須条件",
    });
  });

  return conditions;
}

function buildConditionGroups(candidate) {
  const baseConditions = buildBaseConditions(candidate);
  const conditionalRules = Array.isArray(candidate.conditionalRequiredAnswers)
    ? candidate.conditionalRequiredAnswers
    : [];

  if (conditionalRules.length === 0) {
    return [{ groupNo: 1, conditions: baseConditions }];
  }

  const groups = [];
  const baseOrganizationTypeConditionIndex = baseConditions.findIndex((condition) => condition.fieldKey === "organizationType");
  const baseOrganizationTypes = baseOrganizationTypeConditionIndex >= 0
    ? [...baseConditions[baseOrganizationTypeConditionIndex].expectedValue]
    : [];
  const coveredOrganizationTypes = new Set();

  conditionalRules.forEach((rule) => {
    const ruleConditions = baseConditions
      .filter((condition) => condition.fieldKey !== "organizationType")
      .map((condition) => ({ ...condition, expectedValue: Array.isArray(condition.expectedValue) ? [...condition.expectedValue] : condition.expectedValue }));

    const whenOrganizationTypes = Array.isArray(rule.whenOrganizationTypes)
      ? rule.whenOrganizationTypes.map((item) => String(item ?? "").trim()).filter(Boolean)
      : [];

    if (whenOrganizationTypes.length > 0) {
      whenOrganizationTypes.forEach((type) => coveredOrganizationTypes.add(type));
      ruleConditions.push({
        fieldKey: "organizationType",
        operatorCode: "one_of",
        expectedValue: whenOrganizationTypes,
        note: "conditionalRequiredAnswers で絞られた機関種別",
      });
    } else if (baseOrganizationTypeConditionIndex >= 0) {
      ruleConditions.push({
        ...baseConditions[baseOrganizationTypeConditionIndex],
        expectedValue: [...baseOrganizationTypes],
      });
    }

    Object.entries(rule.requiredAnswers ?? {}).forEach(([fieldKey, expectedValue]) => {
      ruleConditions.push({
        fieldKey,
        operatorCode: "one_of",
        expectedValue: [expectedValue],
        note: "conditionalRequiredAnswers 由来の追加条件",
      });
    });

    if (Array.isArray(rule.whenOrganizationGroups) && rule.whenOrganizationGroups.length > 0) {
      ruleConditions.push({
        fieldKey: "organizationGroup",
        operatorCode: "one_of",
        expectedValue: rule.whenOrganizationGroups,
        note: "conditionalRequiredAnswers で絞られた機関グループ",
      });
    }

    if (Array.isArray(rule.whenMonthTypes) && rule.whenMonthTypes.length > 0) {
      ruleConditions.push({
        fieldKey: "monthType",
        operatorCode: "one_of",
        expectedValue: rule.whenMonthTypes,
        note: "conditionalRequiredAnswers で絞られた月区分",
      });
    }

    if (Array.isArray(rule.whenPlaceTypes) && rule.whenPlaceTypes.length > 0) {
      ruleConditions.push({
        fieldKey: "placeType",
        operatorCode: "one_of",
        expectedValue: rule.whenPlaceTypes,
        note: "conditionalRequiredAnswers で絞られた場所区分",
      });
    }

    if (Array.isArray(rule.whenActionTypes) && rule.whenActionTypes.length > 0) {
      ruleConditions.push({
        fieldKey: "actionType",
        operatorCode: "one_of",
        expectedValue: rule.whenActionTypes,
        note: "conditionalRequiredAnswers で絞られた行為区分",
      });
    }

    groups.push({
      groupNo: groups.length + 1,
      conditions: ruleConditions,
    });
  });

  if (baseOrganizationTypes.length > 0) {
    const fallbackOrganizationTypes = baseOrganizationTypes.filter((type) => !coveredOrganizationTypes.has(type));
    if (fallbackOrganizationTypes.length > 0) {
      const fallbackConditions = baseConditions
        .filter((condition) => condition.fieldKey !== "organizationType")
        .map((condition) => ({ ...condition, expectedValue: Array.isArray(condition.expectedValue) ? [...condition.expectedValue] : condition.expectedValue }));
      fallbackConditions.push({
        fieldKey: "organizationType",
        operatorCode: "one_of",
        expectedValue: fallbackOrganizationTypes,
        note: "conditionalRequiredAnswers 非該当の機関種別",
      });
      groups.unshift({
        groupNo: 1,
        conditions: fallbackConditions,
      });
      groups.forEach((group, index) => {
        group.groupNo = index + 1;
      });
    }
  }

  if (groups.length === 0) {
    return [{ groupNo: 1, conditions: baseConditions }];
  }

  return groups;
}

function buildConstraints(candidate) {
  const rules = Array.isArray(candidate.postCheckRules) ? candidate.postCheckRules : [];
  return rules.map((rule, index) => ({
    constraintCode: `${String(rule.code ?? "constraint").trim()}_${String(index + 1).padStart(2, "0")}`,
    constraintKind: String(rule.code ?? "constraint").trim(),
    configJson: rule,
    message: String(rule.label ?? rule.code ?? "").trim(),
    severity: "review",
    note: "Generated from prototype postCheckRules.",
  }));
}

function buildCatalog(additions) {
  return {
    generatedAt: new Date().toISOString(),
    source: path.relative(workspaceRoot, canonicalSourcePath).replace(/\\/g, "/"),
    branches: additions.map((candidate) => ({
      branchCode: String(candidate.additionCode ?? "").trim(),
      branchName: String(candidate.additionName ?? "").trim(),
      conditionGroups: buildConditionGroups(candidate),
      constraints: buildConstraints(candidate),
    })),
  };
}

function buildSeedSql(catalog) {
  const branchCodes = catalog.branches.map((branch) => `'${escapeSql(branch.branchCode)}'`);
  const lines = [];
  lines.push("-- Generated by v3/scripts/export_prototype_branch_rule_catalog.js");
  lines.push("-- Seeds prototype branch conditions and constraints into addition_branch_condition / addition_branch_constraint.");
  lines.push("START TRANSACTION;");
  lines.push("");

  if (branchCodes.length > 0) {
    lines.push(
      "DELETE abc FROM addition_branch_condition AS abc " +
      "INNER JOIN addition_branch AS ab ON ab.addition_branch_id = abc.addition_branch_id " +
      `WHERE ab.branch_code IN (${branchCodes.join(", ")});`
    );
    lines.push(
      "DELETE abc FROM addition_branch_constraint AS abc " +
      "INNER JOIN addition_branch AS ab ON ab.addition_branch_id = abc.addition_branch_id " +
      `WHERE ab.branch_code IN (${branchCodes.join(", ")});`
    );
    lines.push("");
  }

  catalog.branches.forEach((branch) => {
    branch.conditionGroups.forEach((group) => {
      group.conditions.forEach((condition, index) => {
        lines.push(
          `INSERT INTO addition_branch_condition (` +
          `addition_branch_id, condition_group_no, field_key, operator_code, expected_value_json, is_required, display_order, note` +
          `) SELECT ` +
          `ab.addition_branch_id, ` +
          `${Number(group.groupNo)}, ` +
          `'${escapeSql(condition.fieldKey)}', ` +
          `'${escapeSql(condition.operatorCode)}', ` +
          `'${escapeSql(JSON.stringify(condition.expectedValue))}', ` +
          `1, ` +
          `${(index + 1) * 10}, ` +
          `${condition.note ? `'${escapeSql(condition.note)}'` : "NULL"} ` +
          `FROM addition_branch AS ab ` +
          `WHERE ab.branch_code = '${escapeSql(branch.branchCode)}';`
        );
      });
    });

    branch.constraints.forEach((constraint) => {
      lines.push(
        `INSERT INTO addition_branch_constraint (` +
        `addition_branch_id, constraint_code, constraint_kind, config_json, message, severity, is_active, note` +
        `) SELECT ` +
        `ab.addition_branch_id, ` +
        `'${escapeSql(constraint.constraintCode)}', ` +
        `'${escapeSql(constraint.constraintKind)}', ` +
        `'${escapeSql(JSON.stringify(constraint.configJson))}', ` +
        `${constraint.message ? `'${escapeSql(constraint.message)}'` : "NULL"}, ` +
        `'${escapeSql(constraint.severity)}', ` +
        `1, ` +
        `'${escapeSql(constraint.note)}' ` +
        `FROM addition_branch AS ab ` +
        `WHERE ab.branch_code = '${escapeSql(branch.branchCode)}';`
      );
    });

    lines.push("");
  });

  lines.push("COMMIT;");
  lines.push("");
  return lines.join("\n");
}

function main() {
  const data = readPrototypeData();
  const additions = Array.isArray(data.additions) ? data.additions : [];
  const catalog = buildCatalog(additions);
  const sql = buildSeedSql(catalog);

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputJsonPath, JSON.stringify(catalog, null, 2) + "\n", "utf8");
  fs.writeFileSync(outputSqlPath, sql, "utf8");
  fs.writeFileSync(outputDbSqlPath, sql, "utf8");

  const conditionCount = catalog.branches.reduce(
    (sum, branch) => sum + branch.conditionGroups.reduce((groupSum, group) => groupSum + group.conditions.length, 0),
    0
  );
  const constraintCount = catalog.branches.reduce((sum, branch) => sum + branch.constraints.length, 0);

  process.stdout.write(
    `catalog: ${path.relative(workspaceRoot, outputJsonPath)}\n` +
    `seed: ${path.relative(workspaceRoot, outputSqlPath)}\n` +
    `db-seed: ${path.relative(workspaceRoot, outputDbSqlPath)}\n` +
    `source: ${path.relative(workspaceRoot, canonicalSourcePath)}\n` +
    `branches: ${catalog.branches.length}\n` +
    `conditions: ${conditionCount}\n` +
    `constraints: ${constraintCount}\n`
  );
}

main();
