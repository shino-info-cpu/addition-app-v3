const fs = require("fs");
const path = require("path");

const {
  workspaceRoot,
  canonicalSourcePath,
  loadRuleMasterSourceObject,
} = require("./lib/rule_master_source");

const outputDir = path.join(workspaceRoot, "runtime", "import");
const outputJsonPath = path.join(outputDir, "prototype_question_catalog.json");
const outputSqlPath = path.join(outputDir, "prototype_question_seed.sql");
const outputDbSqlPath = path.join(workspaceRoot, "db", "005_seed_prototype_questions.sql");

function readQuestionDefinitions() {
  const sourceAsset = loadRuleMasterSourceObject();
  if (Array.isArray(sourceAsset?.questionDefinitions)) {
    return sourceAsset.questionDefinitions;
  }
  throw new Error("rule master source から questionDefinitions を抽出できませんでした。");
}

function escapeSql(value) {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/'/g, "''");
}

function buildQuestionOptionCatalog(questionDefinitions) {
  const placeTypeQuestion = questionDefinitions.find((question) => question.key === "placeType");
  const placeTypeValues = Array.isArray(placeTypeQuestion?.options)
    ? placeTypeQuestion.options.map((option) => String(option?.value ?? "").trim()).filter(Boolean)
    : [];

  return questionDefinitions.map((question) => {
    if (typeof question.getOptions !== "function") {
      const staticOptions = Array.isArray(question.options) ? question.options : [];
      return {
        options: staticOptions
          .map((option) => ({
            value: String(option?.value ?? "").trim(),
            label: String(option?.value ?? "").trim(),
            note: String(option?.note ?? "").trim(),
            optionRules: [],
          }))
          .filter((option) => option.value !== ""),
      };
    }

    const optionsByValue = new Map();
    const optionOrder = [];

    const optionSets = placeTypeValues.map((placeType) => ({
      placeType,
      options: question.getOptions({ placeType }),
    }));
    optionSets.sort((left, right) => right.options.length - left.options.length);

    optionSets.forEach(({ placeType, options: dynamicOptions }) => {
      dynamicOptions.forEach((option) => {
        const value = String(option?.value ?? "").trim();
        if (!value) {
          return;
        }

        if (!optionOrder.includes(value)) {
          optionOrder.push(value);
        }

        if (!optionsByValue.has(value)) {
          optionsByValue.set(value, {
            value,
            label: value,
            note: String(option?.note ?? "").trim(),
            visiblePlaceTypes: new Set(),
          });
        }

        optionsByValue.get(value).visiblePlaceTypes.add(placeType);
      });
    });

    return {
      options: optionOrder.map((value) => {
        const option = optionsByValue.get(value);
        const visiblePlaceTypes = Array.from(option.visiblePlaceTypes);
        const optionRules = visiblePlaceTypes.length === placeTypeValues.length
          ? []
          : [
              {
                dependsOnFieldKey: "placeType",
                matchValues: visiblePlaceTypes,
                displayOrder: 10,
                note: "Prototype の動的選択肢条件から生成。",
              },
            ];

        return {
          value: option.value,
          label: option.label,
          note: option.note,
          optionRules,
        };
      }),
    };
  });
}

function buildVisibilityDefinition(question) {
  if (question.key === "actionType") {
    return {
      visibilityMode: "answer_rules",
      visibilityConfig: null,
      visibilityRules: [
        {
          dependsOnFieldKey: "placeType",
          matchValues: ["自事業所内", "外出先"],
          clearOnHide: true,
          displayOrder: 10,
        },
      ],
    };
  }

  if (question.key === "serviceUseStartMonth") {
    return {
      visibilityMode: "candidate_requirement",
      visibilityConfig: {
        answerKey: "serviceUseStartMonth",
        singleCandidateOnly: true,
      },
      visibilityRules: [],
    };
  }

  if (
    [
      "hospitalAdmissionContext",
      "requiredInfoReceived",
      "dischargeFacilityStaffOnlyInfo",
      "dischargeInpatientPeriodCount",
      "initialAdditionPlanned",
      "careManagerStart",
      "employmentStart",
    ].includes(question.key)
  ) {
    return {
      visibilityMode: "candidate_requirement",
      visibilityConfig: {
        answerKey: question.key,
        singleCandidateOnly: false,
      },
      visibilityRules: [],
    };
  }

  return {
    visibilityMode: "always",
    visibilityConfig: null,
    visibilityRules: [],
  };
}

function buildQuestionCatalog(questionDefinitions) {
  const optionCatalog = buildQuestionOptionCatalog(questionDefinitions);

  return {
    generatedAt: new Date().toISOString(),
    source: path.relative(workspaceRoot, canonicalSourcePath).replace(/\\/g, "/"),
    questions: questionDefinitions.map((question, index) => {
      const visibility = buildVisibilityDefinition(question);
      const options = optionCatalog[index].options;
      const descriptionLines = [];

      if (visibility.visibilityMode !== "always") {
        descriptionLines.push("表示条件は seed 化済み。");
      }
      if (options.some((option) => option.optionRules.length > 0)) {
        descriptionLines.push("選択肢条件は seed 化済み。");
      }

      return {
        fieldKey: String(question.key ?? "").trim(),
        label: String(question.label ?? "").trim(),
        inputType: "single_select",
        helpTextShort: String(question.helper ?? "").trim(),
        displayOrder: Number.isFinite(Number(question.order)) ? Number(question.order) : 9999,
        visibilityMode: visibility.visibilityMode,
        visibilityConfig: visibility.visibilityConfig,
        description: descriptionLines.join(" "),
        visibilityRules: visibility.visibilityRules,
        options,
      };
    }),
  };
}

function buildSeedSql(catalog) {
  const lines = [];
  lines.push("-- Generated by v3/scripts/export_prototype_question_catalog.js");
  lines.push("-- Seeds prototype questions into question_definition / question_option / question_visibility_rule / question_option_rule.");
  lines.push("START TRANSACTION;");
  lines.push("");

  const fieldKeys = catalog.questions.map((question) => `'${escapeSql(question.fieldKey)}'`);
  if (fieldKeys.length > 0) {
    lines.push(
      "DELETE qvr FROM question_visibility_rule AS qvr " +
      "INNER JOIN question_definition AS qd ON qd.question_definition_id = qvr.question_definition_id " +
      `WHERE qd.field_key IN (${fieldKeys.join(", ")});`
    );
    lines.push(
      "DELETE qor FROM question_option_rule AS qor " +
      "INNER JOIN question_option AS qo ON qo.question_option_id = qor.question_option_id " +
      "INNER JOIN question_definition AS qd ON qd.question_definition_id = qo.question_definition_id " +
      `WHERE qd.field_key IN (${fieldKeys.join(", ")});`
    );
    lines.push("");
  }

  catalog.questions.forEach((question) => {
    lines.push(
      `INSERT INTO question_definition (` +
      `field_key, label, input_type, help_text_short, display_order, visibility_mode, visibility_config_json, description, is_active` +
      `) VALUES (` +
      `'${escapeSql(question.fieldKey)}', ` +
      `'${escapeSql(question.label)}', ` +
      `'${escapeSql(question.inputType)}', ` +
      `${question.helpTextShort ? `'${escapeSql(question.helpTextShort)}'` : "NULL"}, ` +
      `${Number(question.displayOrder)}, ` +
      `'${escapeSql(question.visibilityMode)}', ` +
      `${question.visibilityConfig ? `'${escapeSql(JSON.stringify(question.visibilityConfig))}'` : "NULL"}, ` +
      `${question.description ? `'${escapeSql(question.description)}'` : "NULL"}, ` +
      `1)` +
      ` ON DUPLICATE KEY UPDATE ` +
      `label = VALUES(label), ` +
      `input_type = VALUES(input_type), ` +
      `help_text_short = VALUES(help_text_short), ` +
      `display_order = VALUES(display_order), ` +
      `visibility_mode = VALUES(visibility_mode), ` +
      `visibility_config_json = VALUES(visibility_config_json), ` +
      `description = VALUES(description), ` +
      `is_active = VALUES(is_active);`
    );

    question.visibilityRules.forEach((rule) => {
      lines.push(
        `INSERT INTO question_visibility_rule (` +
        `question_definition_id, depends_on_field_key, match_values_json, clear_on_hide, display_order, is_active` +
        `) SELECT ` +
        `qd.question_definition_id, ` +
        `'${escapeSql(rule.dependsOnFieldKey)}', ` +
        `'${escapeSql(JSON.stringify(rule.matchValues))}', ` +
        `${rule.clearOnHide ? 1 : 0}, ` +
        `${Number(rule.displayOrder)}, ` +
        `1 ` +
        `FROM question_definition AS qd ` +
        `WHERE qd.field_key = '${escapeSql(question.fieldKey)}';`
      );
    });

    question.options.forEach((option, index) => {
      lines.push(
        `INSERT INTO question_option (` +
        `question_definition_id, option_value, option_label, help_text_short, display_order, is_active` +
        `) SELECT ` +
        `qd.question_definition_id, ` +
        `'${escapeSql(option.value)}', ` +
        `'${escapeSql(option.label)}', ` +
        `${option.note ? `'${escapeSql(option.note)}'` : "NULL"}, ` +
        `${(index + 1) * 10}, ` +
        `1 ` +
        `FROM question_definition AS qd ` +
        `WHERE qd.field_key = '${escapeSql(question.fieldKey)}' ` +
        `ON DUPLICATE KEY UPDATE ` +
        `option_label = VALUES(option_label), ` +
        `help_text_short = VALUES(help_text_short), ` +
        `display_order = VALUES(display_order), ` +
        `is_active = VALUES(is_active);`
      );

      option.optionRules.forEach((rule) => {
        lines.push(
          `INSERT INTO question_option_rule (` +
          `question_option_id, depends_on_field_key, match_values_json, display_order, is_active, note` +
          `) SELECT ` +
          `qo.question_option_id, ` +
          `'${escapeSql(rule.dependsOnFieldKey)}', ` +
          `'${escapeSql(JSON.stringify(rule.matchValues))}', ` +
          `${Number(rule.displayOrder)}, ` +
          `1, ` +
          `${rule.note ? `'${escapeSql(rule.note)}'` : "NULL"} ` +
          `FROM question_option AS qo ` +
          `INNER JOIN question_definition AS qd ON qd.question_definition_id = qo.question_definition_id ` +
          `WHERE qd.field_key = '${escapeSql(question.fieldKey)}' ` +
          `AND qo.option_value = '${escapeSql(option.value)}';`
        );
      });
    });

    lines.push("");
  });

  lines.push("COMMIT;");
  lines.push("");
  return lines.join("\n");
}

function main() {
  const questionDefinitions = readQuestionDefinitions();
  const catalog = buildQuestionCatalog(questionDefinitions);
  const sql = buildSeedSql(catalog);

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputJsonPath, JSON.stringify(catalog, null, 2) + "\n", "utf8");
  fs.writeFileSync(outputSqlPath, sql, "utf8");
  fs.writeFileSync(outputDbSqlPath, sql, "utf8");

  process.stdout.write(
    `catalog: ${path.relative(workspaceRoot, outputJsonPath)}\n` +
    `seed: ${path.relative(workspaceRoot, outputSqlPath)}\n` +
    `db-seed: ${path.relative(workspaceRoot, outputDbSqlPath)}\n` +
    `source: ${path.relative(workspaceRoot, canonicalSourcePath)}\n` +
    `questions: ${catalog.questions.length}\n` +
    `options: ${catalog.questions.reduce((sum, question) => sum + question.options.length, 0)}\n` +
    `visibility-rules: ${catalog.questions.reduce((sum, question) => sum + question.visibilityRules.length, 0)}\n` +
    `option-rules: ${catalog.questions.reduce((sum, question) => sum + question.options.reduce((optionSum, option) => optionSum + option.optionRules.length, 0), 0)}\n`
  );
}

main();
