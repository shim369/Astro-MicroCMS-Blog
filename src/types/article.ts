import type { MicroCMSImage } from 'microcms-js-sdk'

export interface Category {
	name: string
}

export interface Article {
	id: string
	createdAt?: string
	updatedAt?: string
	publishedAt: string
	revisedAt?: string
	title: string
	content: string
	/** 任意：一覧に出す概要文。未設定なら本文の冒頭から作る */
	excerpt?: string
	eyecatch?: MicroCMSImage
	category: Category
}
