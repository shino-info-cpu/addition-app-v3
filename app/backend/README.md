# Backend

`v3` のバックエンドは、さくらインターネットのレンタルサーバーにそのまま載せやすいように、
`PHP + MySQL` 前提の軽い構成で始めます。

## Folder Layout

- `config/app.example.php`
  配置時の設定雛形です。実際には `config/app.php` を作って使います。
- `public/api/*.php`
  直接公開される API エンドポイントです。
- `src/Infrastructure`
  DB 接続などの基盤処理です。
- `src/Repository`
  SQL をまとめる層です。
- `src/Support`
  JSON 応答やリクエスト補助です。

## First Endpoints

- `public/api/health.php`
- `public/api/clients.php`
- `public/api/organizations.php`
- `public/api/services.php`
- `public/api/staffs.php`
- `public/api/judgement-context.php`
- `public/api/report-records.php`
- `public/api/evaluation-cases.php`
- `public/api/question-catalog.php`
- `public/api/addition-catalog.php`
- `public/api/note-draft.php`

## Sakura Deployment Notes

1. `config/app.example.php` を `config/app.php` にコピーして DB 情報を入れる
2. ドキュメントルート配下に `public` の中身を配置する
3. `src` と `config` は公開ルートの外に置くのが理想
4. DB には `v3/db/001_initial_schema.sql` を流してから API を使う
5. フロント試作は `./api` を優先し、開発中は `../backend/public/api` も自動で探します
6. `addition_branch_id` まで保存したい場合は、`v3/db/004_seed_prototype_additions.sql` を DB に流してから API を使う
7. 設問定義・表示条件・動的選択肢条件を DB から読みたい場合は、`v3/db/007_add_question_runtime_support.sql` を先に反映し、そのあと `v3/db/005_seed_prototype_questions.sql` と `v3/db/006_seed_prototype_branch_rules.sql` を流してから `public/api/question-catalog.php` を使う
8. 候補枝・条件・後段制約を DB から読みたい場合は、`v3/db/004_seed_prototype_additions.sql` と `v3/db/006_seed_prototype_branch_rules.sql` を流してから `public/api/addition-catalog.php` を使う
9. `evaluation_candidate` と `evaluation_result.addition_branch_id` まで branch 基準で保存したい場合も、`v3/db/004_seed_prototype_additions.sql` と `v3/db/006_seed_prototype_branch_rules.sql` を先に流しておく
10. `report-records.php` で候補一覧要約まで返したい場合は、`evaluation_candidate` が保存される状態で運用する
11. AI 下書きを使いたい場合は、`config/app.php` に `openai.enabled`, `openai.api_key`, `openai.model` などを追加し、`public/api/note-draft.php` を配置する

## Notes

- 今は `利用者 / 機関 / サービス / 相談員 / 判定文脈 / 集計 / 判定保存` の API までです
- `note-draft.php` を使うと、判定結果の `saved_note` に入れる AI 下書きをサーバー側で生成できます
- 判定ロジック自体はまだフロント試作側にあります
- ただし保存 API は、seed 済みの `addition` / `addition_branch` があれば `evaluation_result.addition_branch_id` まで記録します
- 同じ条件がそろっていれば、保存 API は `evaluation_candidate` に候補枝一覧も記録します
- `report-records.php` は、`evaluation_candidate` があれば `candidate_count` と `candidate_names_summary` も返します
- `evaluation-cases.php` は、`prompt_text` と `ai_draft_text` が payload にあれば `saved_note` へ一緒に保存します
- Composer なしでも動く形にしてあるので、共有レンタルサーバーに載せやすいはずです
- さくら側が PHP 7.4 の場合を想定し、バックエンドは PHP 7.4 互換の記法に寄せています
- ログインは将来的に Google Workspace を使う前提です
- そのため、業務上の相談員とは別に `operator_account` と `audit_event` を持つ設計にしています
- まだ OAuth 実装そのものは入れていません
- 判定画面では、ログインに紐づく初期値とは別に `相談員` を選べる前提で `staffs.php` と `judgement-context.php` を用意しています
