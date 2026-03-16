# サービス対象範囲統合の移行メモ

## 目的

同じサービス名が `児` と `者` で別行になっていたため、

- 機関サービス登録で同名が並ぶ
- 同じ作業を児者で二重に登録しやすい
- 利用者利用状況や判定文脈でも重複が起きやすい

という問題がありました。

v3 では、サービス定義は1行にまとめて、`target_scope` に `児 / 者 / 児者` を持つ形へ寄せます。

## 変更の考え方

- `client.target_type`
  利用者自身の属性なので、そのまま残す
- `service_definition.target_scope`
  サービスがどこまでを対象にするかを表す
- 同名で違いが `児` / `者` だけのサービス
  1行へ統合して `児者` にする

## 実施順

1. DBをバックアップする
2. [002_service_target_scope_refactor.sql](J:/マイドライブ/加算アプリV2/v3/db/002_service_target_scope_refactor.sql) をDBへ流す
3. backend / frontend の更新ファイルをFTP反映する
4. 画面で `機関 -> 提供サービス登録` を開き、同名重複が消えているか確認する

## 注意

- backend を先に上げて、DB移行が後になるのは不可
  理由:
  新しい backend は `service_definition.target_scope` を参照するため
- この移行SQLは、旧重複行をいきなり削除しない
  方針:
  正本へ参照を寄せて、旧行は `is_active = 0` にする
- `organization_service`、`client_enrollment`、`evaluation_case` の参照先も合わせて寄せる

## fresh DB の場合

新しくDBを作り直す場合は、[001_initial_schema.sql](J:/マイドライブ/加算アプリV2/v3/db/001_initial_schema.sql) と、再生成済みの [master_seed_appsheet.sql](J:/マイドライブ/加算アプリV2/v3/runtime/import/master_seed_appsheet.sql) を使えば、最初から重複しないサービス定義で始められます。
