# TECH BLOG — Astro + microCMS

[English](./README.md)

[Astro](https://astro.build/) と [microCMS](https://microcms.io/) で作った技術ブログです。記事はビルド時に microCMS から取得して静的ページとして出力します。記事は Next.js・Nuxt.js・Astro・Gatsby・Svelte などのフレームワーク別に分類しています。

![トップページ](./docs/screenshots/home.png)

| 記事ページ | カテゴリ絞り込み | スマートフォン |
| :---: | :---: | :---: |
| ![記事ページ](./docs/screenshots/article.png) | ![Svelte で絞り込んだ一覧](./docs/screenshots/home-filter.png) | ![スマートフォン表示](./docs/screenshots/mobile.png) |

## 主な機能

- **サイドバーの目次**：記事のあるフレームワークごとに記事数を表示し、クリックで一覧を絞り込みます。状態は URL（`/?cat=Astro`）に残ります。
- **アーカイブ一覧**：最新記事を大きく表示し、残りは番号付きの一覧で並べます。行にカーソルを合わせると概要とカバーが開きます。
- **⌘K 検索**：`⌘K`（Windows は `Ctrl K`）または `/` で検索ダイアログを開き、タイトル・本文・カテゴリから探せます。矢印キーで選んで Enter で開きます。
- **記事ページ**：日付・読了時間・見出し数・コード数のまとめ、読んでいる見出しに追従する目次、読了バー、コピーボタンと色分け付きのコードブロック、前後の記事、リンクのコピー。
- **ページ遷移のアニメーション**：対応ブラウザでは View Transitions で一覧のカバーが記事ページへつながります。視差効果を減らす設定のときは動きを止めます。
- **カバー画像の自動生成**：アイキャッチ画像がない記事には、記事番号とドット模様のカバーを表示します。
- **サンプルデータ**：microCMS の環境変数が未設定のときは、同梱のサンプル記事で表示します。アカウントがなくても動作を確認できます。

## 技術構成

- [Astro](https://astro.build/) 2（静的出力）
- [microCMS](https://microcms.io/)（`microcms-js-sdk`）
- TypeScript、CSS（UI フレームワークなし）

## ディレクトリ構成

```
/
├── docs/screenshots/          # README 用の画面キャプチャ
├── src/
│   ├── components/Cover.astro # 記事のカバー
│   ├── layouts/Layout.astro   # サイドバー・⌘K 検索・フッター
│   ├── lib/
│   │   ├── microcms.ts        # microCMS クライアントと getArticles()
│   │   ├── blog.ts            # カテゴリ・日付・カバー・本文の整形
│   │   └── sample-articles.ts # 環境変数が未設定のときのサンプル記事
│   ├── pages/
│   │   ├── index.astro        # 記事一覧
│   │   ├── 404.astro
│   │   └── articles/[slug].astro
│   ├── styles/global.css
│   └── types/article.ts       # 記事の型定義
└── .env.example
```

## microCMS の設定

**リスト形式の API** を作成し、エンドポイントを `blogs` にして、次のフィールドを用意します。

| フィールド ID | 種類 | 必須 | 備考 |
| :--- | :--- | :---: | :--- |
| `title` | テキストフィールド | ○ | 記事タイトル |
| `content` | リッチエディタ | ○ | 本文 |
| `category` | コンテンツ参照 | ○ | 参照先に `name` フィールドを持つ |
| `eyecatch` | 画像 | | カバー画像。未設定なら自動生成した画像を使用 |
| `excerpt` | テキストエリア | | 一覧に表示する概要。未設定なら本文の冒頭を使用 |

記事の URL は `/articles/{コンテンツID}` です。

カテゴリの `name` が `Next.js`・`Nuxt`・`Astro`・`Gatsby`・`Svelte` の場合は、この順で並べて表示名を整えます。それ以外の名前もそのまま表示します。記事が 1 本以上あるカテゴリだけを表示します。カテゴリの追加や変更は `src/lib/blog.ts` の `CATEGORIES` で行います。

本文中の `<h2>` は自動で目次に追加され、`<pre><code>` のコードブロックにはコピーボタンが付きます。

## 環境変数

`.env.example` をコピーして `.env` を作成し、値を設定します。

```bash
cp .env.example .env
```

| 変数 | 説明 |
| :--- | :--- |
| `MICROCMS_SERVICE_DOMAIN` | microCMS のサービスドメイン（`xxx.microcms.io` の `xxx`） |
| `MICROCMS_API_KEY` | microCMS の API キー |

どちらかが未設定の場合、ビルド時に警告を出してサンプル記事で表示します。

## コマンド

| コマンド | 内容 |
| :--- | :--- |
| `npm install` | 依存パッケージをインストール |
| `npm run dev` | 開発サーバーを起動（`localhost:4321`） |
| `npm run build` | `./dist/` に本番ビルドを出力 |
| `npm run preview` | ビルド結果をローカルでプレビュー |

## デプロイ

静的サイトとして出力されるため、Vercel・Netlify・Cloudflare Pages などどこにでも置けます。ホスティング先にも同じ環境変数を設定してください。記事はビルド時に取得するので、記事を更新したら再ビルドが必要です。microCMS の Webhook からホスティング先の Deploy Hook を呼ぶと自動化できます。
