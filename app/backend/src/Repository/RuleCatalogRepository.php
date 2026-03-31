<?php

declare(strict_types=1);

namespace App\Repository;

use PDO;

final class RuleCatalogRepository
{
    /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function fetchQuestionCatalog(): array
    {
        $questions = $this->fetchQuestions();

        if ($questions === []) {
            return [];
        }

        $questionsById = [];
        foreach ($questions as $question) {
            $question['visibilityRules'] = [];
            $question['options'] = [];
            $questionsById[(int) $question['questionDefinitionId']] = $question;
        }

        foreach ($this->fetchQuestionVisibilityRules() as $rule) {
            $questionDefinitionId = (int) $rule['questionDefinitionId'];
            if (!isset($questionsById[$questionDefinitionId])) {
                continue;
            }
            $questionsById[$questionDefinitionId]['visibilityRules'][] = $rule;
        }

        $optionRulesByOptionId = [];
        foreach ($this->fetchQuestionOptionRules() as $rule) {
            $questionOptionId = (int) $rule['questionOptionId'];
            if (!isset($optionRulesByOptionId[$questionOptionId])) {
                $optionRulesByOptionId[$questionOptionId] = [];
            }
            $optionRulesByOptionId[$questionOptionId][] = $rule;
        }

        foreach ($this->fetchQuestionOptions() as $option) {
            $questionDefinitionId = (int) $option['questionDefinitionId'];
            $questionOptionId = (int) $option['questionOptionId'];
            if (!isset($questionsById[$questionDefinitionId])) {
                continue;
            }
            $option['optionRules'] = $optionRulesByOptionId[$questionOptionId] ?? [];
            $questionsById[$questionDefinitionId]['options'][] = $option;
        }

        return array_map([$this, 'buildRuntimeQuestion'], array_values($questionsById));
    }

    public function fetchAdditionCatalog(): array
    {
        $families = $this->fetchAdditionFamilies();

        if ($families === []) {
            return [];
        }

        $familiesById = [];
        foreach ($families as $family) {
            $family['branches'] = [];
            $familiesById[(int) $family['additionId']] = $family;
        }

        $conditionGroupsByBranchId = [];
        foreach ($this->fetchBranchConditions() as $condition) {
            $additionBranchId = (int) $condition['additionBranchId'];
            $groupNo = (int) $condition['conditionGroupNo'];
            if (!isset($conditionGroupsByBranchId[$additionBranchId])) {
                $conditionGroupsByBranchId[$additionBranchId] = [];
            }
            if (!isset($conditionGroupsByBranchId[$additionBranchId][$groupNo])) {
                $conditionGroupsByBranchId[$additionBranchId][$groupNo] = [
                    'groupNo' => $groupNo,
                    'conditions' => [],
                ];
            }
            $conditionGroupsByBranchId[$additionBranchId][$groupNo]['conditions'][] = $condition;
        }

        $constraintsByBranchId = [];
        foreach ($this->fetchBranchConstraints() as $constraint) {
            $additionBranchId = (int) $constraint['additionBranchId'];
            if (!isset($constraintsByBranchId[$additionBranchId])) {
                $constraintsByBranchId[$additionBranchId] = [];
            }
            $constraintsByBranchId[$additionBranchId][] = $constraint;
        }

        foreach ($this->fetchAdditionBranches() as $branch) {
            $additionId = (int) $branch['additionId'];
            $additionBranchId = (int) $branch['additionBranchId'];
            if (!isset($familiesById[$additionId])) {
                continue;
            }

            $branch['conditionGroups'] = array_values($conditionGroupsByBranchId[$additionBranchId] ?? []);
            $branch['constraints'] = $constraintsByBranchId[$additionBranchId] ?? [];
            $familiesById[$additionId]['branches'][] = $this->buildRuntimeBranch($branch, $familiesById[$additionId]);
        }

        return array_values($familiesById);
    }

    public function fetchAdditionPromptSettings(): array
    {
        return array_map(static function (array $family): array {
            $promptTemplate = (string) ($family['promptTemplate'] ?? '');

            return [
                'additionId' => (int) ($family['additionId'] ?? 0),
                'additionCode' => (string) ($family['additionCode'] ?? ''),
                'additionName' => (string) ($family['additionName'] ?? ''),
                'targetScope' => (string) ($family['targetScope'] ?? ''),
                'promptTemplate' => $promptTemplate,
                'hasPromptTemplate' => trim($promptTemplate) !== '',
            ];
        }, $this->fetchAdditionFamilies());
    }

    public function updateAdditionPromptTemplate(int $additionId, string $promptTemplate): ?array
    {
        $statement = $this->pdo->prepare(<<<SQL
            UPDATE addition
            SET prompt_template = :prompt_template
            WHERE addition_id = :addition_id
              AND is_active = 1
        SQL);

        $statement->execute([
            'prompt_template' => $promptTemplate,
            'addition_id' => $additionId,
        ]);

        if ($statement->rowCount() === 0 && $this->fetchAdditionPromptSettingById($additionId) === null) {
            return null;
        }

        return $this->fetchAdditionPromptSettingById($additionId);
    }

    private function buildRuntimeQuestion(array $question): array
    {
        $question['key'] = (string) $question['fieldKey'];
        $question['order'] = (int) $question['displayOrder'];
        $question['helper'] = (string) ($question['helpTextShort'] ?: $question['description'] ?: '');
        $question['visibilityMode'] = (string) ($question['visibilityMode'] ?: 'always');
        $question['visibilityConfig'] = is_array($question['visibilityConfig']) ? $question['visibilityConfig'] : null;
        $question['visibilityRules'] = array_map(function (array $rule): array {
            return [
                'dependsOnFieldKey' => (string) $rule['dependsOnFieldKey'],
                'matchValues' => is_array($rule['matchValues']) ? $rule['matchValues'] : [],
                'clearOnHide' => (bool) $rule['clearOnHide'],
                'displayOrder' => (int) $rule['displayOrder'],
            ];
        }, is_array($question['visibilityRules']) ? $question['visibilityRules'] : []);
        $question['options'] = array_map([$this, 'buildRuntimeQuestionOption'], is_array($question['options']) ? $question['options'] : []);

        return $question;
    }

    private function buildRuntimeQuestionOption(array $option): array
    {
        $option['value'] = (string) $option['optionValue'];
        $option['label'] = (string) ($option['optionLabel'] ?: $option['optionValue']);
        $option['note'] = (string) ($option['helpTextShort'] ?: $option['description'] ?: '');
        $option['optionRules'] = array_map(function (array $rule): array {
            return [
                'dependsOnFieldKey' => (string) $rule['dependsOnFieldKey'],
                'matchValues' => is_array($rule['matchValues']) ? $rule['matchValues'] : [],
                'displayOrder' => (int) $rule['displayOrder'],
                'note' => (string) ($rule['note'] ?? ''),
            ];
        }, is_array($option['optionRules']) ? $option['optionRules'] : []);

        return $option;
    }

    private function buildRuntimeBranch(array $branch, array $family): array
    {
        $familyCode = (string) ($family['additionCode'] ?? '');
        $familyName = (string) ($family['additionName'] ?? '');
        $branchCode = (string) ($branch['branchCode'] ?? '');
        $parsed = $this->parseBranchDescription((string) ($branch['description'] ?? ''));

        $branch['additionCode'] = $branchCode;
        $branch['additionName'] = (string) ($branch['branchName'] ?? $branchCode);
        $branch['additionFamilyCode'] = $familyCode;
        $branch['additionFamilyName'] = $familyName;
        $branch['promptTemplate'] = (string) ($family['promptTemplate'] ?? '');
        $branch['ruleStatus'] = (string) ($parsed['ruleStatus'] ?? '');
        $branch['confirmedRules'] = $parsed['confirmedRules'];
        $branch['provisionalRules'] = $parsed['provisionalRules'];
        $branch['historyAdditionCodes'] = array_values(array_unique(array_filter([$familyCode, $branchCode], static function ($value): bool {
            return (string) $value !== '';
        })));
        $branch['postCheckRules'] = array_values(array_filter(array_map([$this, 'buildRuntimeConstraint'], is_array($branch['constraints']) ? $branch['constraints'] : [])));
        $branch['postCheck'] = $branch['postCheckRules'] !== []
            ? implode(' / ', array_values(array_filter(array_map(static function (array $rule): string {
                return (string) ($rule['label'] ?? $rule['code'] ?? '');
            }, $branch['postCheckRules']))))
            : (string) ($family['note'] ?? '追加の後段チェックはありません。');

        return $branch;
    }

    private function buildRuntimeConstraint(array $constraint): ?array
    {
        $config = is_array($constraint['config']) ? $constraint['config'] : [];
        $code = trim((string) ($config['code'] ?? $constraint['constraintKind'] ?? ''));
        if ($code === '') {
            return null;
        }

        $config['code'] = $code;
        $config['label'] = trim((string) ($config['label'] ?? $constraint['message'] ?? $code));
        $config['severity'] = trim((string) ($constraint['severity'] ?? 'review'));

        return $config;
    }

    private function parseBranchDescription(string $description): array
    {
        $confirmedRules = [];
        $provisionalRules = [];
        $section = '';

        $lines = preg_split("/\r\n|\n|\r/", $description) ?: [];
        foreach ($lines as $line) {
            $trimmed = trim((string) $line);
            if ($trimmed === '') {
                continue;
            }

            if ($trimmed === '確定条件:' || strpos($trimmed, '確定条件:') === 0) {
                $section = 'confirmed';
                $inlineRule = trim((string) preg_replace('/^確定条件:\s*/u', '', $trimmed));
                if ($inlineRule !== '') {
                    $confirmedRules[] = trim((string) preg_replace('/^- /u', '', $inlineRule));
                }
                continue;
            }

            if ($trimmed === '仮置き:' || strpos($trimmed, '仮置き:') === 0) {
                $section = 'provisional';
                $inlineRule = trim((string) preg_replace('/^仮置き:\s*/u', '', $trimmed));
                if ($inlineRule !== '') {
                    $provisionalRules[] = trim((string) preg_replace('/^- /u', '', $inlineRule));
                }
                continue;
            }

            $normalized = trim((string) preg_replace('/^- /u', '', $trimmed));
            if ($normalized === '') {
                continue;
            }

            if ($section === 'confirmed') {
                $confirmedRules[] = $normalized;
                continue;
            }

            if ($section === 'provisional') {
                $provisionalRules[] = $normalized;
            }
        }

        return [
            'ruleStatus' => $provisionalRules !== []
                ? ($confirmedRules !== [] ? '一部確定' : '仮置きあり')
                : ($confirmedRules !== [] ? '確定条件あり' : ''),
            'confirmedRules' => $confirmedRules,
            'provisionalRules' => $provisionalRules,
        ];
    }

    private function fetchQuestions(): array
    {
        $statement = $this->pdo->query(<<<SQL
            SELECT
              question_definition_id,
              field_key,
              label,
              input_type,
              help_text_short,
              help_text_long,
              example_text,
              non_example_text,
              caution_text,
              help_display_mode,
              example_display_mode,
              option_source_type,
              option_source_ref,
              visibility_mode,
              visibility_config_json,
              reference_label_field,
              reference_sub_label_field,
              reference_search_fields_json,
              is_required,
              display_order,
              description
            FROM question_definition
            WHERE is_active = 1
            ORDER BY display_order ASC, question_definition_id ASC
        SQL);

        $rows = $statement->fetchAll();

        return array_map(function (array $row): array {
            return [
                'questionDefinitionId' => (int) $row['question_definition_id'],
                'fieldKey' => (string) $row['field_key'],
                'label' => (string) $row['label'],
                'inputType' => (string) $row['input_type'],
                'helpTextShort' => $row['help_text_short'],
                'helpTextLong' => $row['help_text_long'],
                'exampleText' => $row['example_text'],
                'nonExampleText' => $row['non_example_text'],
                'cautionText' => $row['caution_text'],
                'helpDisplayMode' => (string) $row['help_display_mode'],
                'exampleDisplayMode' => (string) $row['example_display_mode'],
                'optionSourceType' => $row['option_source_type'],
                'optionSourceRef' => $row['option_source_ref'],
                'visibilityMode' => (string) $row['visibility_mode'],
                'visibilityConfig' => $this->decodeJson($row['visibility_config_json']),
                'referenceLabelField' => $row['reference_label_field'],
                'referenceSubLabelField' => $row['reference_sub_label_field'],
                'referenceSearchFields' => $this->decodeJson($row['reference_search_fields_json']),
                'isRequired' => (bool) $row['is_required'],
                'displayOrder' => (int) $row['display_order'],
                'description' => $row['description'],
            ];
        }, $rows);
    }

    private function fetchAdditionFamilies(): array
    {
        $statement = $this->pdo->query(<<<SQL
            SELECT
              addition_id,
              addition_code,
              addition_name,
              short_name,
              target_scope,
              prompt_template,
              note
            FROM addition
            WHERE is_active = 1
            ORDER BY addition_id ASC
        SQL);

        $rows = $statement->fetchAll();

        return array_map(static function (array $row): array {
            return [
                'additionId' => (int) $row['addition_id'],
                'additionCode' => (string) $row['addition_code'],
                'additionName' => (string) $row['addition_name'],
                'shortName' => $row['short_name'],
                'targetScope' => $row['target_scope'],
                'promptTemplate' => $row['prompt_template'],
                'note' => $row['note'],
            ];
        }, $rows);
    }

    private function fetchAdditionPromptSettingById(int $additionId): ?array
    {
        $statement = $this->pdo->prepare(<<<SQL
            SELECT
              addition_id,
              addition_code,
              addition_name,
              target_scope,
              prompt_template
            FROM addition
            WHERE addition_id = :addition_id
              AND is_active = 1
            LIMIT 1
        SQL);

        $statement->execute([
            'addition_id' => $additionId,
        ]);

        $row = $statement->fetch();
        if (!is_array($row)) {
            return null;
        }

        $promptTemplate = (string) ($row['prompt_template'] ?? '');

        return [
            'additionId' => (int) $row['addition_id'],
            'additionCode' => (string) $row['addition_code'],
            'additionName' => (string) $row['addition_name'],
            'targetScope' => (string) ($row['target_scope'] ?? ''),
            'promptTemplate' => $promptTemplate,
            'hasPromptTemplate' => trim($promptTemplate) !== '',
        ];
    }

    private function fetchAdditionBranches(): array
    {
        $statement = $this->pdo->query(<<<SQL
            SELECT
              addition_branch_id,
              addition_id,
              branch_code,
              branch_name,
              branch_type,
              priority,
              auto_confirm_priority,
              description
            FROM addition_branch
            WHERE is_active = 1
            ORDER BY priority ASC, addition_branch_id ASC
        SQL);

        $rows = $statement->fetchAll();

        return array_map(static function (array $row): array {
            return [
                'additionBranchId' => (int) $row['addition_branch_id'],
                'additionId' => (int) $row['addition_id'],
                'branchCode' => (string) $row['branch_code'],
                'branchName' => (string) $row['branch_name'],
                'branchType' => $row['branch_type'],
                'priority' => (int) $row['priority'],
                'autoConfirmPriority' => (int) $row['auto_confirm_priority'],
                'description' => $row['description'],
            ];
        }, $rows);
    }

    private function fetchBranchConditions(): array
    {
        $statement = $this->pdo->query(<<<SQL
            SELECT
              addition_branch_condition_id,
              addition_branch_id,
              condition_group_no,
              field_key,
              operator_code,
              expected_value_json,
              is_required,
              display_order,
              note
            FROM addition_branch_condition
            WHERE is_required = 1
            ORDER BY addition_branch_id ASC, condition_group_no ASC, display_order ASC, addition_branch_condition_id ASC
        SQL);

        $rows = $statement->fetchAll();

        return array_map(function (array $row): array {
            return [
                'additionBranchConditionId' => (int) $row['addition_branch_condition_id'],
                'additionBranchId' => (int) $row['addition_branch_id'],
                'conditionGroupNo' => (int) $row['condition_group_no'],
                'fieldKey' => (string) $row['field_key'],
                'operatorCode' => (string) $row['operator_code'],
                'expectedValue' => $this->decodeJson($row['expected_value_json']),
                'isRequired' => (bool) $row['is_required'],
                'displayOrder' => (int) $row['display_order'],
                'note' => $row['note'],
            ];
        }, $rows);
    }

    private function fetchBranchConstraints(): array
    {
        $statement = $this->pdo->query(<<<SQL
            SELECT
              addition_branch_constraint_id,
              addition_branch_id,
              constraint_code,
              constraint_kind,
              config_json,
              message,
              severity,
              note
            FROM addition_branch_constraint
            WHERE is_active = 1
            ORDER BY addition_branch_id ASC, addition_branch_constraint_id ASC
        SQL);

        $rows = $statement->fetchAll();

        return array_map(function (array $row): array {
            return [
                'additionBranchConstraintId' => (int) $row['addition_branch_constraint_id'],
                'additionBranchId' => (int) $row['addition_branch_id'],
                'constraintCode' => (string) $row['constraint_code'],
                'constraintKind' => (string) $row['constraint_kind'],
                'config' => $this->decodeJson($row['config_json']),
                'message' => $row['message'],
                'severity' => $row['severity'],
                'note' => $row['note'],
            ];
        }, $rows);
    }

    private function fetchQuestionOptions(): array
    {
        $statement = $this->pdo->query(<<<SQL
            SELECT
              question_option_id,
              question_definition_id,
              option_value,
              option_label,
              help_text_short,
              help_text_long,
              example_text,
              non_example_text,
              caution_text,
              help_display_mode,
              example_display_mode,
              search_keywords,
              description,
              display_order
            FROM question_option
            WHERE is_active = 1
            ORDER BY question_definition_id ASC, display_order ASC, question_option_id ASC
        SQL);

        $rows = $statement->fetchAll();

        return array_map(static function (array $row): array {
            return [
                'questionOptionId' => (int) $row['question_option_id'],
                'questionDefinitionId' => (int) $row['question_definition_id'],
                'optionValue' => (string) $row['option_value'],
                'optionLabel' => (string) $row['option_label'],
                'helpTextShort' => $row['help_text_short'],
                'helpTextLong' => $row['help_text_long'],
                'exampleText' => $row['example_text'],
                'nonExampleText' => $row['non_example_text'],
                'cautionText' => $row['caution_text'],
                'helpDisplayMode' => (string) $row['help_display_mode'],
                'exampleDisplayMode' => (string) $row['example_display_mode'],
                'searchKeywords' => $row['search_keywords'],
                'description' => $row['description'],
                'displayOrder' => (int) $row['display_order'],
            ];
        }, $rows);
    }

    private function fetchQuestionVisibilityRules(): array
    {
        $statement = $this->pdo->query(<<<SQL
            SELECT
              question_visibility_rule_id,
              question_definition_id,
              depends_on_field_key,
              match_values_json,
              clear_on_hide,
              display_order
            FROM question_visibility_rule
            WHERE is_active = 1
            ORDER BY question_definition_id ASC, display_order ASC, question_visibility_rule_id ASC
        SQL);

        $rows = $statement->fetchAll();

        return array_map(function (array $row): array {
            return [
                'questionVisibilityRuleId' => (int) $row['question_visibility_rule_id'],
                'questionDefinitionId' => (int) $row['question_definition_id'],
                'dependsOnFieldKey' => (string) $row['depends_on_field_key'],
                'matchValues' => $this->decodeJson($row['match_values_json']) ?? [],
                'clearOnHide' => (bool) $row['clear_on_hide'],
                'displayOrder' => (int) $row['display_order'],
            ];
        }, $rows);
    }

    private function fetchQuestionOptionRules(): array
    {
        $statement = $this->pdo->query(<<<SQL
            SELECT
              question_option_rule_id,
              question_option_id,
              depends_on_field_key,
              match_values_json,
              display_order,
              note
            FROM question_option_rule
            WHERE is_active = 1
            ORDER BY question_option_id ASC, display_order ASC, question_option_rule_id ASC
        SQL);

        $rows = $statement->fetchAll();

        return array_map(function (array $row): array {
            return [
                'questionOptionRuleId' => (int) $row['question_option_rule_id'],
                'questionOptionId' => (int) $row['question_option_id'],
                'dependsOnFieldKey' => (string) $row['depends_on_field_key'],
                'matchValues' => $this->decodeJson($row['match_values_json']) ?? [],
                'displayOrder' => (int) $row['display_order'],
                'note' => $row['note'],
            ];
        }, $rows);
    }

    /**
     * @return mixed
     */
    private function decodeJson($value)
    {
        if ($value === null || $value === '') {
            return null;
        }

        $decoded = json_decode((string) $value, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return null;
        }

        return $decoded;
    }
}
