# Frontend

Place the v3 frontend application code here.
The app shell should assume:

- top bar
- left navigation with button links
- right content pane

The counselor flow should focus first on:

- judgement input
- aggregation and audit lookup

Master screens for `利用者`, `機関`, and `サービス` are separate feature areas from the judgement flow.

## Mock

- `index.html` : interactive shell prototype for layout and workflow validation
- `styles.css` : mock styles
- `rule-runtime-adapter.js` : sample/API の catalog runtime 切替と lookup を担う helper
- `app.js` : UI adapter に寄せた判定フロー、集計、マスタ表示ロジック
- `prototype-sample-data.js` : sample mode 用の利用者/機関/サービス/履歴データ asset
- `prototype-rule-catalog.js` : sample mode 用の generated rule catalog asset

Open `index.html` in a browser to review the first interactive prototype without choosing a framework yet.

Current prototype scope:

- step-by-step judgement narrowing with sample data
- report filtering and detail view
- saved report views and column order persistence in `localStorage`
- auto-detect API base from `./api` or `../backend/public/api`
- `利用者 / 機関 / サービス / 集計` use API when available, otherwise fall back to sample data

Current data-source behavior:

- `加算判定` is now able to read `利用者ごとの利用状況` and `相談員一覧` from API when `judgement-context.php` and `staffs.php` are available
- `加算判定` は `question-catalog.php` が利用可能なら、設問定義・表示条件・動的選択肢を DB-backed question catalog から読む
- `加算判定` は `addition-catalog.php` が利用可能なら、候補枝・条件・後段制約を DB-backed addition catalog から読む
- `addition-catalog.php` が利用可能なら、候補カードの `確定条件 / 仮置き / 後段チェック要約` も catalog 側の description / constraints から描く
- `addition-catalog.php` が利用可能な状態で保存すると、判定 payload は `addition_id` / `addition_branch_id` と候補一覧を branch 基準で含む
- `report-records.php` が `evaluation_candidate` を返せる状態なら、集計詳細は `candidate_count` / `candidate_names_summary` を branch 基準で表示する
- `question-catalog.php` が利用できない場合は、prototype question 定義へ安全に fallback する
- `addition-catalog.php` が利用できない場合は、prototype branch 定義へ安全に fallback する
- `利用者利用状況` が未登録でも、判定画面は `機関` と `サービス` を全マスタから選べる
- if the judgement API is unavailable, the screen falls back to the prototype sample data
- `集計` calls `report-records.php` with the current saved/search filters when `再検索` is pressed
- the top bar pill shows whether the screen is using API data or prototype fallback
