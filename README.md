# Tampermonkey Scripts

個人用Tampermonkeyスクリプトの管理リポジトリです。

## スクリプト一覧

| スクリプト | 説明 |
|-----------|------|
| [Kyotei Tenji Miyoshi Correction](scripts/kyotei-tenji-miyoshi-correction.user.js) | 展示情報を艇番号別に補正し、補正後の順位で色分け表示 |

## セットアップ

### Greasy Fork との連携

1. [Greasy Fork](https://greasyfork.org/) のスクリプト管理画面を開く
2. 「Source sync」で以下のURLを設定:
   ```
   https://raw.githubusercontent.com/matsuda719/kyoteibiyori-correction/main/scripts/kyotei-tenji-miyoshi-correction.user.js
   ```
3. Webhook を設定すると push 時に即座に反映される

### ローカル開発（Tampermonkey連携）

1. Chromeの拡張機能設定で Tampermonkey の「ファイルのURLへのアクセスを許可」を有効化
2. Tampermonkey のスクリプトヘッダーに `@require file://` でローカルパスを指定
3. 編集後、ブラウザをリロードするだけで反映
