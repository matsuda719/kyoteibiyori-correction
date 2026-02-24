# Tampermonkey Scripts

個人用Tampermonkeyスクリプトの管理リポジトリです。

## スクリプト一覧

| スクリプト | 説明 |
|-----------|------|
| [Kyotei Tenji Miyoshi Correction](scripts/kyotei-tenji-miyoshi-correction.user.js) | 展示情報を艇番号別に補正し、補正後の順位で色分け表示 |

## 更新の流れ

```
Kiro で編集 → GitHub に push → Greasy Fork 自動更新 → Tampermonkey 自動更新
```

Greasy Fork 経由でインストールしたスクリプトは、Greasy Fork が更新元になります。  
GitHub → Greasy Fork の同期を設定しておけば、push するだけで全自動で反映されます。

## セットアップ

### 1. Greasy Fork で GitHub 同期を設定する

1. [Greasy Fork](https://greasyfork.org/) にログイン
2. 自分のスクリプトページを開く: https://greasyfork.org/scripts/566323
3. 「管理」(Admin) タブをクリック
4. 「ソースを同期するURL」(Sync script with URL) に以下を入力:
   ```
   https://raw.githubusercontent.com/matsuda719/kyoteibiyori-correction/main/scripts/kyotei-tenji-miyoshi-correction.user.js
   ```
5. 保存する

これで Greasy Fork が定期的に GitHub の最新ソースを取り込むようになります。

### 2. Webhook を設定して push 時に即反映させる（任意）

Webhook を設定すると、push のたびに Greasy Fork が即座に更新を取り込みます。

#### Greasy Fork 側

1. さきほどの管理画面で「ウェブフックを設定する」リンクをクリック
2. 表示される Payload URL と Secret をメモする

#### GitHub 側

1. https://github.com/matsuda719/kyoteibiyori-correction/settings/hooks にアクセス
2. 「Add webhook」をクリック
3. 以下を入力:
   - Payload URL: Greasy Fork で表示された URL
   - Content type: `application/json`
   - Secret: Greasy Fork で表示された Secret
4. 「Which events would you like to trigger this webhook?」で「Just the push event」を選択
5. 「Add webhook」で保存

### 3. ローカル開発（Tampermonkey 直接連携）

ローカルで即座に動作確認したい場合:

1. Chrome の拡張機能設定で Tampermonkey の「ファイルの URL へのアクセスを許可」を有効化
2. Tampermonkey のスクリプトヘッダーに `@require file://` でローカルパスを指定
3. 編集後、ブラウザをリロードするだけで反映
