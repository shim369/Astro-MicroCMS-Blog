// microCMS の環境変数が未設定のときに表示するサンプル記事（ローカル確認用）
import type { Article } from '../types/article'

export const sampleArticles: Article[] = [
  {
    "id": "astro-content-layer",
    "title": "Astro の Content Layer で microCMS の記事をビルド時に取り込む",
    "excerpt": "CMS の記事を Content Collections として扱えるようにすると、型安全なまま一覧・詳細ページを生成できます。microCMS 用のローダーを書いて置き換えた手順をまとめました。",
    "content": "<p class=\"lead-p\">これまでこのブログでは、各ページのフロントマターで <code>microcmsClient.getList()</code> を直接呼んでいました。一覧ページと記事ページで同じ取得処理を書いていて、カテゴリページを足すとさらに増えます。そこで Astro の Content Layer に移し、取得処理を 1 か所にまとめました。</p>\n\n<h2>移行前の状態</h2>\n<p>一覧ページ（<code>index.astro</code>）と記事ページ（<code>[slug].astro</code>）の両方に、ほぼ同じ取得コードがありました。</p>\n<pre data-lang=\"astro\"><code>---\n// src/pages/index.astro\nconst { contents: articles } = await microcmsClient.getList({\n  endpoint: 'blogs',\n  queries: { fields: ['id', 'title', 'content', 'eyecatch', 'category', 'publishedAt'] },\n})\n---</code></pre>\n<p>問題は 2 つあります。<code>select</code> の項目を変えるたびに複数ファイルを直す必要があること、そして返ってくる値の型が手書きの <code>interface</code> 頼みで、CMS 側の変更に気づけないことです。</p>\n\n<h2>ローダーを定義する</h2>\n<p>Content Layer のローダーは、配列を返す非同期関数で十分です。スキーマは zod で書きます。</p>\n<pre data-lang=\"ts\"><code>// src/content.config.ts\nimport { defineCollection, z } from 'astro:content'\nimport { microcmsClient } from './lib/microcms'\n\nconst articles = defineCollection({\n  loader: async () => {\n    const items = await microcmsClient.getAllContents({\n      endpoint: 'blogs',\n    })\n    return items\n  },\n  schema: z.object({\n    title: z.string(),\n    content: z.string(),\n    publishedAt: z.coerce.date(),\n    category: z.object({ name: z.string() }),\n  }),\n})\n\nexport const collections = { articles }</code></pre>\n<div class=\"callout\">\n  <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 8v5M12 16.5v.5\"/></svg>\n  <div><strong>id は必須です</strong>各エントリに <code>id</code> がないとビルドが止まります。microCMS のコンテンツ ID をそのまま使えます。</div>\n</div>\n\n<h2>ページ側を書き換える</h2>\n<p>一覧ページは <code>getCollection()</code> を呼ぶだけになります。日付の降順ソートもここで済ませます。</p>\n<pre data-lang=\"astro\"><code>---\nimport { getCollection } from 'astro:content'\n\nconst articles = (await getCollection('articles'))\n  .sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf())\n---</code></pre>\n<p>記事ページの <code>getStaticPaths</code> も同じコレクションから作れます。</p>\n<pre data-lang=\"astro\"><code>export async function getStaticPaths() {\n  const articles = await getCollection('articles')\n  return articles.map((article) => ({\n    params: { slug: article.id },\n    props: { article },\n  }))\n}</code></pre>\n\n<h2>変更前後の比較</h2>\n<table>\n  <thead><tr><th>項目</th><th>変更前</th><th>変更後</th></tr></thead>\n  <tbody>\n    <tr><td>取得処理の場所</td><td>各ページに重複</td><td><code>content.config.ts</code> の 1 か所</td></tr>\n    <tr><td>型</td><td>手書きの interface</td><td>スキーマから自動生成</td></tr>\n    <tr><td>CMS 側の項目変更</td><td>実行時まで気づけない</td><td>ビルド時にエラーになる</td></tr>\n  </tbody>\n</table>\n\n<h2>まとめ</h2>\n<p>記事数が少ないうちは直接取得でも困りません。ただ、カテゴリページやタグページを足す予定があるなら、早めに移しておくとページを増やすたびに楽になります。</p>\n<blockquote>次回は、このコレクションを使ってカテゴリ別の一覧ページを静的生成します。</blockquote>",
    "category": {
      "name": "Astro"
    },
    "publishedAt": "2026-11-08T09:00:00.000Z"
  },
  {
    "id": "next-app-router-cache",
    "title": "App Router のキャッシュを「どこで」効かせるか整理する",
    "excerpt": "fetch のキャッシュ、Full Route Cache、Router Cache。名前の似た仕組みが重なって混乱しやすいので、ブログを題材に一つずつ確認しました。",
    "content": "<p>記事を更新したのに本番で反映されない。App Router に移行して最初にぶつかったのがこれでした。</p>\n<h2>3 つのキャッシュ</h2>\n<ul><li><strong>Data Cache</strong>：<code>fetch</code> の結果をサーバー側で保持</li><li><strong>Full Route Cache</strong>：ビルド時に生成した HTML と RSC ペイロード</li><li><strong>Router Cache</strong>：ブラウザ側に残る遷移済みページ</li></ul>\n<h2>記事ページの設定</h2>\n<pre data-lang=\"ts\"><code>// app/articles/[slug]/page.tsx\nexport const revalidate = 3600 // 1時間ごとに再生成\n\nexport default async function Page({ params }) {\n  const article = await getArticle(params.slug)\n  return &lt;Article data={article} /&gt;\n}</code></pre>\n<h2>CMS 更新時に即反映する</h2>\n<p>microCMS の Webhook から Route Handler を呼び、<code>revalidateTag('articles')</code> を実行すると、次のアクセスで再生成されます。</p>",
    "category": {
      "name": "Next"
    },
    "publishedAt": "2026-10-29T09:00:00.000Z"
  },
  {
    "id": "nuxt-usefetch-pitfalls",
    "title": "useFetch と $fetch の使い分けでハマった 3 つのこと",
    "excerpt": "SSR で二重に API を叩いていた、クリック時に useFetch を呼んで警告が出た、キーが衝突してデータが入れ替わった。実際に踏んだ順に原因と直し方を書きます。",
    "content": "<p>Nuxt 3 でデータ取得まわりを書き直した際、同じような失敗を何度か繰り返しました。</p>\n<h2>1. SSR とクライアントで二重取得</h2>\n<p>セットアップ関数内で <code>$fetch</code> を直接使うと、サーバーで取得したデータがクライアントに引き継がれず、ハイドレーション時にもう一度リクエストが飛びます。ここは <code>useFetch</code> を使います。</p>\n<h2>2. イベントハンドラ内の useFetch</h2>\n<p>ボタンのクリックで呼ぶ処理は composable ではなく <code>$fetch</code> で書きます。</p>\n<pre data-lang=\"vue\"><code>&lt;script setup&gt;\nconst { data: articles } = await useFetch('/api/articles')\n\nasync function like(id) {\n  await $fetch(`/api/articles/${id}/like`, { method: 'POST' })\n}\n&lt;/script&gt;</code></pre>\n<h2>3. キーの衝突</h2>\n<p>動的なパスで同じ関数から呼ぶ場合は <code>key</code> を明示しておくと安全です。</p>",
    "category": {
      "name": "Nuxt"
    },
    "publishedAt": "2026-10-17T09:00:00.000Z"
  },
  {
    "id": "astro-view-transitions",
    "title": "View Transitions で一覧から記事へのサムネイルをつなげる",
    "excerpt": "一覧のカバー画像が記事ページのヘッダーへ伸びていくような遷移を、JavaScript をほぼ書かずに実装しました。",
    "content": "<p>Astro の <code>&lt;ClientRouter /&gt;</code> を入れると、ページ遷移がブラウザの View Transitions API で処理されます。</p>\n<h2>同じ名前を付ける</h2>\n<pre data-lang=\"astro\"><code>&lt;Img src={cover} transition:name={`cover-${slug}`} /&gt;</code></pre>\n<p>一覧と詳細の両方で同じ <code>transition:name</code> を付けるだけで、要素が補間されます。</p>\n<h2>動きを控えたい人への配慮</h2>\n<p><code>prefers-reduced-motion</code> が有効な環境ではアニメーションを無効にしておきます。</p>",
    "category": {
      "name": "Astro"
    },
    "publishedAt": "2026-10-02T09:00:00.000Z"
  },
  {
    "id": "gatsby-to-astro",
    "title": "Gatsby から Astro へ移行して、ビルド時間が 4 分から 40 秒になった",
    "excerpt": "GraphQL レイヤーをやめて、各ページで必要なデータを直接取得する形に変えました。移行時に置き換えたプラグインの対応表も載せています。",
    "content": "<p>3 年運用した Gatsby 製のブログを Astro に移しました。きっかけはビルド時間とプラグインの更新停止です。</p>\n<h2>置き換えたもの</h2>\n<ul><li><code>gatsby-plugin-image</code> → <code>astro:assets</code></li><li><code>gatsby-source-filesystem</code> → Content Collections</li><li><code>gatsby-plugin-sitemap</code> → <code>@astrojs/sitemap</code></li></ul>\n<h2>GraphQL をやめた影響</h2>\n<p>クエリを書かずに済むぶん見通しは良くなりました。一方で、複数ソースを横断する集計は自分で書く必要があります。</p>\n<h2>結果</h2>\n<p>記事 120 本でビルドは約 40 秒。JavaScript の転送量もほぼゼロになりました。</p>",
    "category": {
      "name": "Gatsby"
    },
    "publishedAt": "2026-09-21T09:00:00.000Z"
  },
  {
    "id": "next-server-actions-form",
    "title": "Server Actions でお問い合わせフォームを API Route なしで作る",
    "excerpt": "バリデーションは zod、送信中の表示は useFormStatus。フォーム 1 枚に必要なコードがどこまで減るか試しました。",
    "content": "<p>API Route を用意してクライアントから fetch する、という定番の形を Server Actions に置き換えます。</p>\n<h2>アクションを書く</h2>\n<pre data-lang=\"ts\"><code>'use server'\nimport { z } from 'zod'\n\nconst schema = z.object({ email: z.string().email(), body: z.string().min(10) })\n\nexport async function send(_: unknown, form: FormData) {\n  const parsed = schema.safeParse(Object.fromEntries(form))\n  if (!parsed.success) return { error: '入力内容を確認してください' }\n  await sendMail(parsed.data)\n  return { ok: true }\n}</code></pre>\n<h2>送信中の状態</h2>\n<p><code>useFormStatus</code> の <code>pending</code> を見てボタンを無効化します。二重送信もこれで防げます。</p>",
    "category": {
      "name": "Next"
    },
    "publishedAt": "2026-09-10T09:00:00.000Z"
  },
  {
    "id": "nuxt-content-blog",
    "title": "Nuxt Content で Markdown ブログを 30 分で立ち上げる",
    "excerpt": "content ディレクトリに Markdown を置くだけで記事ページができあがる。最小構成からカテゴリ絞り込みまでを順に作ります。",
    "content": "<p>CMS を用意するほどでもない小さなブログなら、Nuxt Content がいちばん手軽です。</p>\n<h2>インストール</h2>\n<pre data-lang=\"sh\"><code>npx nuxi module add content</code></pre>\n<h2>一覧を取得する</h2>\n<pre data-lang=\"vue\"><code>const { data } = await useAsyncData('posts', () =>\n  queryCollection('blog').order('date', 'DESC').all()\n)</code></pre>\n<h2>カテゴリで絞り込む</h2>\n<p><code>where('category', '=', 'Nuxt')</code> を足すだけです。URL のクエリと連動させると共有しやすくなります。</p>",
    "category": {
      "name": "Nuxt"
    },
    "publishedAt": "2026-08-26T09:00:00.000Z"
  },
  {
    "id": "gatsby-image-optimization",
    "title": "gatsby-plugin-image の placeholder を見直して LCP を改善する",
    "excerpt": "blurred と dominantColor で体感がどう変わるか、Lighthouse の数値と合わせて比較しました。",
    "content": "<p>移行前の Gatsby サイトで最後に取り組んだのが画像まわりの改善です。</p>\n<h2>placeholder の比較</h2>\n<ul><li><code>blurred</code>：見た目は良いが HTML が重くなる</li><li><code>dominantColor</code>：軽量で、レイアウトシフトも起きない</li></ul>\n<h2>結論</h2>\n<p>ファーストビューの 1 枚だけ <code>loading=\"eager\"</code> にし、残りは <code>dominantColor</code> に統一したところ、LCP が 0.6 秒短くなりました。</p>",
    "category": {
      "name": "Gatsby"
    },
    "publishedAt": "2026-08-09T09:00:00.000Z"
  },
  {
    "id": "astro-islands-react",
    "title": "Astro の Islands に React コンポーネントを 1 つだけ載せる",
    "excerpt": "静的なページの中に、検索ボックスだけをインタラクティブにしたい。client:visible と client:idle の違いも確認します。",
    "content": "<p>ページ全体は静的なまま、必要な部品だけ JavaScript を読み込むのが Astro の Islands です。</p>\n<h2>ディレクティブの選び方</h2>\n<ul><li><code>client:load</code>：すぐに必要なもの</li><li><code>client:idle</code>：メインスレッドが空いてからで良いもの</li><li><code>client:visible</code>：画面に入ったときで良いもの</li></ul>\n<pre data-lang=\"astro\"><code>&lt;Search client:idle /&gt;</code></pre>\n<h2>結果</h2>\n<p>検索ボックスはヘッダーにあるので <code>client:idle</code> を選びました。初期表示の JavaScript は 0KB のままです。</p>",
    "category": {
      "name": "Astro"
    },
    "publishedAt": "2026-07-30T09:00:00.000Z"
  }
]
