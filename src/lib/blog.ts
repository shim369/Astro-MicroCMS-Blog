import type { Article } from '../types/article'

export interface Category {
	id: string // microCMS のカテゴリ name
	name: string // 表示名
}

/** 表示名と並び順。ここにないカテゴリも CMS 側の name のまま表示される */
export const CATEGORIES: Category[] = [
	{ id: 'Next.js', name: 'Next.js' },
	{ id: 'Nuxt', name: 'Nuxt.js' },
	{ id: 'Astro', name: 'Astro' },
	{ id: 'Gatsby', name: 'Gatsby' },
	{ id: 'Svelte', name: 'Svelte' },
]

export function catOf(id: string): Category {
	return CATEGORIES.find((c) => c.id === id) ?? { id, name: id }
}

/** 記事が 1 本以上あるカテゴリと記事数（定義済みの順 → CMS 側で追加されたものの順） */
export function categoriesOf(articles: Article[]): (Category & { count: number })[] {
	const ids = [...new Set(articles.map((a) => a.category?.name).filter(Boolean))]
	const order = (id: string) => {
		const i = CATEGORIES.findIndex((c) => c.id === id)
		return i < 0 ? CATEGORIES.length : i
	}
	return ids
		.sort((a, b) => order(a) - order(b))
		.map((id) => ({ ...catOf(id), count: articles.filter((a) => a.category?.name === id).length }))
}

/** 2 桁ゼロ埋め（記事番号など） */
export const two = (n: number) => String(n).padStart(2, '0')

/** 日本時間の YYYY-MM-DD */
export const isoDate = (d: string | Date) =>
	new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date(d))

/** 2026.11.08 形式 */
export const dotDate = (d: string | Date) => isoDate(d).replaceAll('-', '.')

export const stripTags = (html: string) =>
	(html ?? '').replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim()

export const readMin = (html: string) => Math.max(1, Math.round(stripTags(html).length / 600))

export const excerptOf = (a: Article, len = 96) => {
	if (a.excerpt) return a.excerpt
	const text = stripTags(a.content)
	return text.length > len ? text.slice(0, len) + '…' : text
}

/* ---------- カバー：記事 ID のハッシュからドット格子・帯の位置を決める ---------- */
export function coverVars(id: string) {
	const h = [...id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 17)
	return [
		`--a:${[135, 45, 180, 90][h % 4]}deg`,
		`--m:${30 + (h % 40)}%`,
		`--g:${14 + ((h >> 3) % 10)}px`,
		`--y:${18 + ((h >> 6) % 60)}%`,
		`--h:${8 + ((h >> 9) % 12)}%`,
		`--w:${30 + ((h >> 11) % 30)}%`,
	].join(';')
}

/* ---------- 本文の整形：見出しID・コードブロック・ハイライト ---------- */
function highlight(code: string) {
	if (code.includes('<span')) return code // 既にハイライト済みならそのまま
	const re =
		/(\/\/[^\n]*|&lt;!--[\s\S]*?--&gt;)|(&#x27;[^\n]*?&#x27;|&#39;[^\n]*?&#39;|&quot;[^\n]*?&quot;|'[^'\n]*'|`[^`]*`)|\b(import|from|export|const|let|async|await|function|return|default|if|else|try|catch|throw|new|type|interface|for|of|true|false|null|undefined)\b|\b(\d+(?:\.\d+)?)\b|\b([A-Za-z_$][\w$]*)(?=\()/g
	return code.replace(re, (m, c, s, k, n) =>
		c ? `<span class="k-c">${m}</span>`
		: s ? `<span class="k-s">${m}</span>`
		: k ? `<span class="k-k">${m}</span>`
		: n ? `<span class="k-n">${m}</span>`
		: `<span class="k-f">${m}</span>`
	)
}

export interface Heading {
	id: string
	text: string
}

export function processBody(html: string): { html: string; headings: Heading[]; codeCount: number } {
	const headings: Heading[] = []
	let i = 0
	let codeCount = 0
	let out = (html ?? '').replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/g, (_m, attrs = '', inner) => {
		const existing = /\sid="([^"]+)"/.exec(attrs)
		const id = existing ? existing[1] : `s${++i}`
		headings.push({ id, text: stripTags(inner) })
		return `<h2${existing ? attrs : `${attrs} id="${id}"`}>${inner}</h2>`
	})
	out = out.replace(/<pre(\s[^>]*)?>([\s\S]*?)<\/pre>/g, (_m, attrs = '', inner) => {
		codeCount++
		const codeMatch = /^\s*<code([^>]*)>([\s\S]*?)<\/code>\s*$/.exec(inner)
		const codeAttrs = codeMatch ? codeMatch[1] : ''
		const code = codeMatch ? codeMatch[2] : inner
		const lang =
			/data-lang="([^"]+)"/.exec(attrs)?.[1] ??
			/language-([\w-]+)/.exec(codeAttrs + attrs)?.[1] ??
			'code'
		return `<div class="code"><header class="tag"><span>${lang}</span><button type="button" class="tag" data-copy>Copy</button></header><pre><code>${highlight(code)}</code></pre></div>`
	})
	return { html: out, headings, codeCount }
}
