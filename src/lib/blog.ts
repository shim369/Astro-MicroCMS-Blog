import type { Article } from '../types/article'

export interface Category {
	id: string
	name: string
	color: string // CSS 変数名
	cover: string // カバー画像のベース色
}

export const CATEGORIES: Category[] = [
	{ id: 'Next', name: 'Next.js', color: '--c-next', cover: '#22343A' },
	{ id: 'Nuxt', name: 'Nuxt.js', color: '--c-nuxt', cover: '#2C8665' },
	{ id: 'Astro', name: 'Astro', color: '--c-astro', cover: '#B8336A' },
	{ id: 'Gatsby', name: 'Gatsby', color: '--c-gatsby', cover: '#6A3FA0' },
	{ id: 'Svelte', name: 'Svelte', color: '--c-svelte', cover: '#C4461C' },
]

export function catOf(id: string): Category {
	return CATEGORIES.find((c) => c.id === id) ?? { id, name: id, color: '--slate', cover: '#4A636B' }
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

export const fmtDate = (d: string | Date) =>
	new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Tokyo' }).format(new Date(d))

export const isoDate = (d: string | Date) => new Date(d).toISOString().slice(0, 10)

const stripTags = (html: string) =>
	html.replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim()

export const readMin = (html: string) => Math.max(1, Math.round(stripTags(html).length / 500))

export const excerptOf = (a: Article, len = 110) => {
	if (a.excerpt) return a.excerpt
	const text = stripTags(a.content ?? '')
	return text.length > len ? text.slice(0, len) + '…' : text
}

/* ---------- 記事ごとに固有の幾何学カバー画像（カテゴリ色 × slug のハッシュ） ---------- */
function hash(str: string) {
	let h = 2166136261
	for (const ch of str) {
		h ^= ch.charCodeAt(0)
		h = Math.imul(h, 16777619)
	}
	return h >>> 0
}
function rng(seed: number) {
	return () => {
		seed = (seed + 0x6d2b79f5) | 0
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}
const f = (n: number) => Math.round(n * 10) / 10

export function coverSvg(article: Article, w = 800, h = 600) {
	const r = rng(hash(article.id))
	const base = catOf(article.category?.name).cover
	const light = 'rgba(255,255,255,.9)'
	const sig = '#E7C942'
	const kind = hash(article.id) % 4
	let g = ''
	if (kind === 0) {
		const cx = w * (0.55 + r() * 0.35), cy = h * (0.3 + r() * 0.5)
		for (let i = 12; i > 0; i--)
			g += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(i * w * 0.07)}" fill="none" stroke="${light}" stroke-opacity="${f(0.08 + i * 0.02)}" stroke-width="${i % 3 ? 1.5 : 5}"/>`
		g += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(w * 0.05)}" fill="${sig}"/>`
	} else if (kind === 1) {
		const cols = 8, rows = 6, cw = w / cols, ch = h / rows
		for (let y = 0; y < rows; y++)
			for (let x = 0; x < cols; x++) {
				const v = r()
				if (v < 0.28) g += `<rect x="${f(x * cw + 6)}" y="${f(y * ch + 6)}" width="${f(cw - 12)}" height="${f(ch - 12)}" rx="${f(cw * 0.18)}" fill="${light}" opacity="${f(0.1 + v)}"/>`
				else if (v > 0.95) g += `<rect x="${f(x * cw + 6)}" y="${f(y * ch + 6)}" width="${f(cw - 12)}" height="${f(ch - 12)}" rx="${f(cw / 2)}" fill="${sig}"/>`
			}
	} else if (kind === 2) {
		const n = 9 + Math.floor(r() * 5), step = (w + h) / n
		for (let i = 0; i < n; i++) {
			const sw = step * (0.15 + r() * 0.45)
			const mid = i === Math.floor(n / 2)
			g += `<line x1="${f(i * step - h)}" y1="${h + 20}" x2="${f(i * step + 20)}" y2="-20" stroke="${mid ? sig : light}" stroke-opacity="${mid ? 1 : f(0.12 + r() * 0.25)}" stroke-width="${f(sw)}"/>`
		}
	} else {
		for (let y = 0; y < 14; y++) {
			let x = w * 0.08 + (y % 4) * w * 0.04
			const len = 2 + Math.floor(r() * 5)
			for (let k = 0; k < len; k++) {
				const lw = w * (0.04 + r() * 0.14)
				const hit = y === 5 && k === 1
				g += `<rect x="${f(x)}" y="${f(h * 0.1 + y * h * 0.058)}" width="${f(lw)}" height="${f(h * 0.026)}" rx="${f(h * 0.013)}" fill="${hit ? sig : light}" opacity="${hit ? 1 : f(0.15 + r() * 0.4)}"/>`
				x += lw + w * 0.015
				if (x > w * 0.95) break
			}
		}
	}
	return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="${w}" height="${h}" fill="${base}"/>${g}</svg>`
}

/* ---------- 本文の整形：見出しID・コードブロック・ハイライト ---------- */
function highlight(code: string) {
	if (code.includes('<span')) return code // 既にハイライト済みならそのまま
	const re = /(\/\/[^\n]*)|('[^'\n]*'|`[^`\n]*`)|\b(import|from|export|const|let|async|await|function|return|default|if|new)\b|\b([a-zA-Z_]\w*)(?=\()/g
	return code.replace(re, (m, c, s, k) =>
		c ? `<span class="tk-c">${m}</span>` : s ? `<span class="tk-s">${m}</span>` : k ? `<span class="tk-k">${m}</span>` : `<span class="tk-f">${m}</span>`
	)
}

export interface Heading {
	id: string
	text: string
}

export function processBody(html: string): { html: string; headings: Heading[] } {
	const headings: Heading[] = []
	let i = 0
	let out = (html ?? '').replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/g, (_m, attrs = '', inner) => {
		const existing = /\sid="([^"]+)"/.exec(attrs)
		const id = existing ? existing[1] : `s${++i}`
		headings.push({ id, text: stripTags(inner) })
		return `<h2${existing ? attrs : `${attrs} id="${id}"`}>${inner}</h2>`
	})
	out = out.replace(/<pre(\s[^>]*)?>([\s\S]*?)<\/pre>/g, (_m, attrs = '', inner) => {
		const codeMatch = /^\s*<code([^>]*)>([\s\S]*?)<\/code>\s*$/.exec(inner)
		const codeAttrs = codeMatch ? codeMatch[1] : ''
		const code = codeMatch ? codeMatch[2] : inner
		const lang =
			/data-lang="([^"]+)"/.exec(attrs)?.[1] ??
			/language-([\w-]+)/.exec(codeAttrs + attrs)?.[1] ??
			'code'
		return `<div class="code"><div class="code-bar"><span>${lang}</span><button type="button" data-copy>コピー</button></div><pre><code>${highlight(code)}</code></pre></div>`
	})
	return { html: out, headings }
}
