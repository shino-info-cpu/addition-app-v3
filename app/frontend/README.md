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
- `app.js` : interactive prototype logic for判定フロー、集計、マスタ表示

Open `index.html` in a browser to review the first interactive prototype without choosing a framework yet.

Current prototype scope:

- step-by-step judgement narrowing with sample data
- report filtering and detail view
- saved report views and column order persistence in `localStorage`
- auto-detect API base from `./api` or `../backend/public/api`
- `利用者 / 機関 / サービス / 集計` use API when available, otherwise fall back to sample data

Current data-source behavior:

- `加算判定` is now able to read `利用者ごとの利用状況` and `相談員一覧` from API when `judgement-context.php` and `staffs.php` are available
- `利用者利用状況` が未登録でも、判定画面は `機関` と `サービス` を全マスタから選べる
- if the judgement API is unavailable, the screen falls back to the prototype sample data
- `集計` calls `report-records.php` with the current saved/search filters when `再検索` is pressed
- the top bar pill shows whether the screen is using API data or prototype fallback
