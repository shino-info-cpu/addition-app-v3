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

## Sakura Deployment Notes

1. `config/app.example.php` を `config/app.php` にコピーして DB 情報を入れる
2. ドキュメントルート配下に `public` の中身を配置する
3. `src` と `config` は公開ルートの外に置くのが理想
4. DB には `v3/db/001_initial_schema.sql` を流してから API を使う
5. フロント試作は `./api` を優先し、開発中は `../backend/public/api` も自動で探します

## Notes

- 今は `利用者 / 機関 / サービス / 相談員 / 判定文脈 / 集計 / 判定保存` の API までです
- 判定ロジック自体はまだフロント試作側にあり、保存 API はその結果を `evaluation_case` ほかへ記録します
- Composer なしでも動く形にしてあるので、共有レンタルサーバーに載せやすいはずです
- さくら側が PHP 7.4 の場合を想定し、バックエンドは PHP 7.4 互換の記法に寄せています
- ログインは将来的に Google Workspace を使う前提です
- そのため、業務上の相談員とは別に `operator_account` と `audit_event` を持つ設計にしています
- まだ OAuth 実装そのものは入れていません
- 判定画面では、ログインに紐づく初期値とは別に `相談員` を選べる前提で `staffs.php` と `judgement-context.php` を用意しています
