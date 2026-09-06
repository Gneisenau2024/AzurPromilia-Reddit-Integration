import {
    getDatabase,
} from '../database/database.mjs';

const COLLECTION_NAME =
    'redditNotificationPosts';

const INITIALIZATION_STATE_ID =
    '__reddit_notification_initialized__';

/**
 * Reddit通知履歴Collectionを取得します。
 */
function getRedditNotificationCollection() {
    return getDatabase().collection(
        COLLECTION_NAME,
    );
}

/**
 * Reddit通知履歴用Collectionを初期化します。
 *
 * postIdはReddit投稿ごとに一意なので、
 * 重複記録を防ぐUnique Indexを作成します。
 */
export async function initializeRedditNotificationRepository() {
    const collection =
        getRedditNotificationCollection();

    await collection.createIndex(
        {
            postId:
                1,
        },
        {
            unique:
                true,

            name:
                'unique_reddit_post_id',
        },
    );

    await collection.createIndex(
        {
            notifiedAt:
                -1,
        },
        {
            name:
                'reddit_notification_history',
        },
    );
}

/**
 * 指定したReddit投稿が
 * すでに記録済みか確認します。
 *
 * @param {string} postId
 */
export async function findRedditNotificationPost(
    postId,
) {
    return getRedditNotificationCollection()
        .findOne({
            postId,
        });
}

/**
 * 複数のReddit投稿IDから、
 * すでに記録済みの投稿IDをまとめて取得します。
 *
 * @param {string[]} postIds
 * @returns {Promise<Set<string>>}
 */
export async function findKnownRedditPostIds(
    postIds,
) {
    if (
        !Array.isArray(
            postIds,
        ) ||
        postIds.length ===
            0
    ) {
        return new Set();
    }

    const records =
        await getRedditNotificationCollection()
            .find(
                {
                    postId: {
                        $in:
                            postIds,
                    },
                },
                {
                    projection: {
                        postId:
                            1,

                        _id:
                            0,
                    },
                },
            )
            .toArray();

    return new Set(
        records.map(
            (record) =>
                record.postId,
        ),
    );
}

/**
 * Reddit通知機能の初回準備が
 * 完了しているか確認します。
 */
export async function isRedditNotificationInitialized() {
    const record =
        await getRedditNotificationCollection()
            .findOne({
                postId:
                    INITIALIZATION_STATE_ID,
            });

    return Boolean(
        record,
    );
}

/**
 * 初回導入時に現在取得できる投稿を
 * 既知投稿として登録します。
 *
 * これにより、Bot導入時に過去投稿を
 * 一斉通知することを防ぎます。
 *
 * 投稿本文、画像、翻訳結果は保存しません。
 *
 * @param {Array<{
 *   id: string,
 *   title: string,
 *   url: string,
 *   publishedAt: string | null,
 * }>} posts
 */
export async function seedRedditNotificationPosts(
    posts,
) {
    if (
        !Array.isArray(
            posts,
        ) ||
        posts.length ===
            0
    ) {
        return {
            insertedCount:
                0,
        };
    }

    const now =
        new Date();

    const operations =
        posts
            .filter(
                (post) =>
                    post?.id,
            )
            .map(
                (post) => {
                    const publishedAt =
                        post.publishedAt
                            ? new Date(
                                post.publishedAt,
                            )
                            : null;

                    return {
                        updateOne: {
                            filter: {
                                postId:
                                    post.id,
                            },

                            update: {
                                $setOnInsert: {
                                    postId:
                                        post.id,

                                    recordType:
                                        'post',

                                    subreddit:
                                        'AzurPromilia',

                                    title:
                                        post.title,

                                    redditUrl:
                                        post.url,

                                    publishedAt:
                                        publishedAt &&
                                        !Number.isNaN(
                                            publishedAt.getTime(),
                                        )
                                            ? publishedAt
                                            : null,

                                    seededAt:
                                        now,

                                    createdAt:
                                        now,
                                },
                            },

                            upsert:
                                true,
                        },
                    };
                },
            );

    if (
        operations.length ===
        0
    ) {
        return {
            insertedCount:
                0,
        };
    }

    const result =
        await getRedditNotificationCollection()
            .bulkWrite(
                operations,
                {
                    ordered:
                        false,
                },
            );

    return {
        insertedCount:
            result.upsertedCount,
    };
}

/**
 * Reddit通知機能の初回準備完了を記録します。
 */
export async function markRedditNotificationInitialized() {
    const now =
        new Date();

    return getRedditNotificationCollection()
        .updateOne(
            {
                postId:
                    INITIALIZATION_STATE_ID,
            },
            {
                $setOnInsert: {
                    postId:
                        INITIALIZATION_STATE_ID,

                    recordType:
                        'state',

                    initializedAt:
                        now,

                    createdAt:
                        now,
                },
            },
            {
                upsert:
                    true,
            },
        );
}

/**
 * Discordへの通知が成功したReddit投稿を記録します。
 *
 * 投稿本文、画像URL、翻訳結果は保存せず、
 * 重複通知防止に必要な最小限のメタデータだけ保存します。
 *
 * @param {{
 *   id: string,
 *   title: string,
 *   url: string,
 *   publishedAt: string | null,
 * }} post
 * @param {{
 *   channelId: string,
 *   messageId: string,
 * }} discordMessage
 */
export async function saveRedditNotificationPost(
    post,
    discordMessage,
) {
    const now =
        new Date();

    const publishedAt =
        post.publishedAt
            ? new Date(
                post.publishedAt,
            )
            : null;

    return getRedditNotificationCollection()
        .updateOne(
            {
                postId:
                    post.id,
            },
            {
                $setOnInsert: {
                    postId:
                        post.id,

                    recordType:
                        'post',

                    subreddit:
                        'AzurPromilia',

                    title:
                        post.title,

                    redditUrl:
                        post.url,

                    publishedAt:
                        publishedAt &&
                        !Number.isNaN(
                            publishedAt.getTime(),
                        )
                            ? publishedAt
                            : null,

                    discordChannelId:
                        discordMessage.channelId,

                    discordMessageId:
                        discordMessage.messageId,

                    notifiedAt:
                        now,

                    createdAt:
                        now,
                },
            },
            {
                upsert:
                    true,
            },
        );
}
