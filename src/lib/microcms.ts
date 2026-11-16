import { createClient } from 'microcms-js-sdk'
import type { Article } from '../types/article'
import { sampleArticles } from './sample-articles'

const serviceDomain = import.meta.env.MICROCMS_SERVICE_DOMAIN
const apiKey = import.meta.env.MICROCMS_API_KEY

export const microcmsClient = serviceDomain && apiKey ? createClient({ serviceDomain, apiKey }) : null

let cache: Promise<Article[]> | null = null

/** 記事を公開日の新しい順で取得（環境変数が未設定ならサンプル記事を返す） */
export function getArticles(): Promise<Article[]> {
	if (!cache) {
		cache = (async () => {
			let items: Article[]
			if (microcmsClient) {
				items = await microcmsClient.getAllContents<Article>({
					endpoint: 'blogs',
					queries: {
						fields: ['id', 'title', 'content', 'excerpt', 'eyecatch', 'category', 'publishedAt'],
						orders: '-publishedAt',
					},
				})
			} else {
				console.warn('[microCMS] MICROCMS_SERVICE_DOMAIN / MICROCMS_API_KEY が未設定のため、サンプル記事を表示します')
				items = sampleArticles
			}
			return [...items].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
		})()
	}
	return cache
}

export type { Article }
