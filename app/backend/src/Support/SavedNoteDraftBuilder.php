<?php

declare(strict_types=1);

namespace App\Support;

use RuntimeException;

final class SavedNoteDraftBuilder
{
    /**
     * @param array<string, mixed> $payload
     */
    public function buildDeveloperInstructions(array $payload = []): string
    {
        $lines = [
            'あなたは相談支援の加算判定記録を下書きする補助です。',
            '与えられた事実だけを使い、推測や補完はしないでください。',
            '出力は日本語の平文のみで、箇条書きや見出しは使わないでください。',
            '1〜3文で簡潔にまとめ、判定状態が要確認ならそのことを自然に触れてください。',
            '利用者名・機関名・サービス名・加算名は入力値をそのまま使ってください。',
        ];

        $additionPromptTemplate = trim((string) ($payload['addition_prompt_template'] ?? ''));
        if ($additionPromptTemplate !== '') {
            $lines[] = '次の加算別指示があれば、上の共通指示より優先してください。';
            $lines[] = $additionPromptTemplate;
        }

        return implode("\n", $lines);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function buildUserPrompt(array $payload): string
    {
        $clientName = $this->requiredText($payload, 'client_name', '利用者名');
        $organizationName = $this->requiredText($payload, 'organization_name', '機関名');
        $serviceName = $this->requiredText($payload, 'service_name', 'サービス名');
        $staffName = $this->requiredText($payload, 'staff_name', '相談員名');
        $targetMonth = $this->requiredText($payload, 'target_month', '対象月');
        $additionName = $this->requiredText($payload, 'addition_name', '加算名');
        $finalStatus = $this->requiredText($payload, 'final_status', '判定状態');

        $performedAt = trim((string) ($payload['performed_at'] ?? ''));
        $organizationGroup = trim((string) ($payload['organization_group'] ?? ''));
        $serviceCategory = trim((string) ($payload['service_category'] ?? ''));
        $postCheckSummary = trim((string) ($payload['post_check_summary'] ?? ''));
        $rationale = trim((string) ($payload['rationale'] ?? ''));
        $defaultNoteText = trim((string) ($payload['default_note_text'] ?? ''));

        $candidateNames = [];
        if (is_array($payload['candidate_names'] ?? null)) {
            foreach ($payload['candidate_names'] as $candidateName) {
                $normalized = trim((string) $candidateName);
                if ($normalized !== '') {
                    $candidateNames[] = $normalized;
                }
            }
        }

        $answerLines = [];
        if (is_array($payload['answers'] ?? null)) {
            foreach ($payload['answers'] as $key => $value) {
                $normalizedValue = trim((string) $value);
                if ($normalizedValue === '') {
                    continue;
                }
                $answerLines[] = sprintf('- %s: %s', $this->formatAnswerLabel((string) $key), $normalizedValue);
            }
        }

        $lines = [
            '以下の事実だけを使って、保存文の下書きを作成してください。',
            '',
            '[文脈]',
            sprintf('利用者: %s', $clientName),
            sprintf('相談員: %s', $staffName),
            sprintf('機関: %s', $organizationName),
            sprintf('サービス: %s', $serviceName),
            sprintf('対象月: %s', $targetMonth),
        ];

        if ($performedAt !== '') {
            $lines[] = sprintf('対応日時: %s', $performedAt);
        }
        if ($organizationGroup !== '') {
            $lines[] = sprintf('機関グループ: %s', $organizationGroup);
        }
        if ($serviceCategory !== '') {
            $lines[] = sprintf('サービス区分: %s', $serviceCategory);
        }

        $lines[] = '';
        $lines[] = '[判定結果]';
        $lines[] = sprintf('判定状態: %s', $finalStatus);
        $lines[] = sprintf('加算: %s', $additionName);
        if ($candidateNames !== []) {
            $lines[] = sprintf('候補一覧: %s', implode(' / ', $candidateNames));
        }
        if ($postCheckSummary !== '') {
            $lines[] = sprintf('後段チェック: %s', $postCheckSummary);
        }
        if ($rationale !== '') {
            $lines[] = sprintf('判定根拠: %s', $rationale);
        }

        if ($answerLines !== []) {
            $lines[] = '';
            $lines[] = '[回答]';
            foreach ($answerLines as $answerLine) {
                $lines[] = $answerLine;
            }
        }

        if ($defaultNoteText !== '') {
            $lines[] = '';
            $lines[] = '[定型文]';
            $lines[] = $defaultNoteText;
        }

        return implode("\n", $lines);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function buildPromptText(array $payload): string
    {
        return "[developer]\n"
            . $this->buildDeveloperInstructions($payload)
            . "\n\n[user]\n"
            . $this->buildUserPrompt($payload);
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function requiredText(array $payload, string $field, string $label): string
    {
        $value = trim((string) ($payload[$field] ?? ''));
        if ($value === '') {
            throw new RuntimeException($label . 'が不足しています。');
        }
        return $value;
    }

    private function formatAnswerLabel(string $fieldKey): string
    {
        $labels = [
            'monthType' => '対応した時期',
            'placeType' => 'その場',
            'actionType' => '行為',
            'hospitalAdmissionContext' => '入院に当たっているか',
            'requiredInfoReceived' => '必要情報の提供',
            'dischargeFacilityStaffOnlyInfo' => '施設職員のみ情報か',
            'dischargeInpatientPeriodCount' => '入所・入院期間回数',
            'initialAdditionPlanned' => '初回加算予定',
            'careManagerStart' => 'ケアマネ利用開始',
            'employmentStart' => '新規雇用開始',
            'serviceUseStartMonth' => 'サービス利用開始月',
        ];

        return $labels[$fieldKey] ?? $fieldKey;
    }
}
