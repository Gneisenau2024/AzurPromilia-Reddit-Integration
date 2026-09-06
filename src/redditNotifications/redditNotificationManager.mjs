import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
} from 'discord.js';

import {
    fetchRedditPosts,
} from './fetchRedditPosts.mjs';

import {
    getRedditAccessToken,
} from './getRedditAccessToken.mjs';

import {
    translateRedditPost,
} from './translateRedditPost.mjs';

import {
    findKnownRedditPostIds,
    isRedditNotificationInitialized,
    markRedditNotificationInitialized,
    saveRedditNotificationPost,
    seedRedditNotificationPosts,
} from './redditNotificationRepository.mjs';

const CHECK_INTERVAL_MS =
    15 * 60 * 1000;

let checkTimer =
    null;

let isChecking =
    false;

/**
 * Extracts the translated title and body
 * from the translation response.
 */
function parseTranslatedPost(
    translatedText,
) {
    const titleMatch =
        translatedText.match(
            /【タイトル】\s*([\s\S]*?)(?=\n\s*【本文】|$)/,
        );

    const bodyMatch =
        translatedText.match(
            /【本文】\s*([\s\S]*)$/,
        );

    return {
        title:
            titleMatch?.[1]
                ?.trim() ??
            '',

        body:
            bodyMatch?.[1]
                ?.trim() ??
            '',
    };
}

/**
 * Returns the configured Discord channel.
 */
async function fetchNotificationChannel(
    client,
) {
    const channelId =
        process.env
            .REDDIT_NOTIFICATION_CHANNEL_ID;

    if (!channelId) {
        throw new Error(
            'REDDIT_NOTIFICATION_CHANNEL_ID is not configured.',
        );
    }

    const channel =
        client.channels.cache.get(
            channelId,
        ) ??
        await client.channels.fetch(
            channelId,
        );

    if (
        !channel ||
        !channel.isTextBased() ||
        typeof channel.send !==
            'function'
    ) {
        throw new Error(
            'The configured Reddit notification channel is unavailable.',
        );
    }

    return channel;
}

/**
 * Sends one Reddit post to Discord.
 */
async function sendRedditNotification(
    channel,
    post,
) {
    const translatedText =
        await translateRedditPost(
            post,
        );

    const {
        title,
        body,
    } =
        parseTranslatedPost(
            translatedText,
        );

    const embed =
        new EmbedBuilder()
            .setColor(
                0xff4500,
            )
            .setAuthor({
                name:
                    `Reddit / r/AzurPromilia • ${post.author || 'unknown'}`,
            })
            .setTitle(
                (
                    title ||
                    post.title ||
                    'Reddit post'
                ).slice(
                    0,
                    256,
                ),
            )
            .setURL(
                post.url,
            );

    if (
        body &&
        body !==
            '本文なし'
    ) {
        embed.setDescription(
            body.slice(
                0,
                2000,
            ),
        );
    } else {
        embed.setDescription(
            '*本文なし*',
        );
    }

    if (post.imageUrl) {
        embed.setImage(
            post.imageUrl,
        );
    }

    if (
        Array.isArray(
            post.externalUrls,
        ) &&
        post.externalUrls.length >
            0
    ) {
        const links =
            post.externalUrls
                .slice(
                    0,
                    5,
                )
                .join(
                    '\n',
                )
                .slice(
                    0,
                    1024,
                );

        embed.addFields({
            name:
                '🔗 関連リンク',

            value:
                links,
        });
    }

    const publishedAt =
        post.publishedAt
            ? new Date(
                post.publishedAt,
            )
            : null;

    if (
        publishedAt &&
        !Number.isNaN(
            publishedAt.getTime(),
        )
    ) {
        embed.setTimestamp(
            publishedAt,
        );
    }

    embed.setFooter({
        text:
            'AIによる日本語訳です。原文もあわせてご確認ください。',
    });

    const row =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel(
                        'Redditで原文を見る',
                    )
                    .setEmoji(
                        '🟠',
                    )
                    .setStyle(
                        ButtonStyle.Link,
                    )
                    .setURL(
                        post.url,
                    ),
            );

    return channel.send({
        content:
            '🟠 **r/AzurPromilia 新着投稿**',

        embeds: [
            embed,
        ],

        components: [
            row,
        ],

        allowedMentions: {
            parse: [],
        },
    });
}

/**
 * Checks Reddit once for new posts.
 */
export async function checkRedditNotifications(
    client,
) {
    if (isChecking) {
        return false;
    }

    isChecking =
        true;

    try {
        const accessToken =
            await getRedditAccessToken();

        const posts =
            await fetchRedditPosts(
                accessToken,
            );

        const initialized =
            await isRedditNotificationInitialized();

        /*
         * On first startup, current posts are recorded
         * as already known.
         *
         * This prevents old posts from being sent to
         * Discord when the integration is first enabled.
         */
        if (!initialized) {
            await seedRedditNotificationPosts(
                posts,
            );

            await markRedditNotificationInitialized();

            return true;
        }

        const postIds =
            posts
                .map(
                    (post) =>
                        post.id,
                )
                .filter(
                    Boolean,
                );

        const knownPostIds =
            await findKnownRedditPostIds(
                postIds,
            );

        const newPosts =
            posts
                .filter(
                    (post) =>
                        post.id &&
                        !knownPostIds.has(
                            post.id,
                        ),
                )
                .sort(
                    (
                        first,
                        second,
                    ) => {
                        const firstTime =
                            first.publishedAt
                                ? new Date(
                                    first.publishedAt,
                                ).getTime()
                                : 0;

                        const secondTime =
                            second.publishedAt
                                ? new Date(
                                    second.publishedAt,
                                ).getTime()
                                : 0;

                        return (
                            firstTime -
                            secondTime
                        );
                    },
                );

        if (
            newPosts.length ===
            0
        ) {
            return true;
        }

        const channel =
            await fetchNotificationChannel(
                client,
            );

        for (
            const post of
            newPosts
        ) {
            try {
                const message =
                    await sendRedditNotification(
                        channel,
                        post,
                    );

                /*
                 * Reddit post bodies, images and translations
                 * are not stored.
                 *
                 * Only minimal metadata needed to prevent
                 * duplicate notifications is recorded.
                 */
                await saveRedditNotificationPost(
                    post,
                    {
                        channelId:
                            channel.id,

                        messageId:
                            message.id,
                    },
                );
            } catch (error) {
                console.error(
                    `Failed to process Reddit post ${post.id}:`,
                    error,
                );
            }
        }

        return true;
    } catch (error) {
        console.error(
            'Reddit notification check failed:',
            error,
        );

        return false;
    } finally {
        isChecking =
            false;
    }
}

/**
 * Starts periodic Reddit checks.
 *
 * Normal request frequency:
 * approximately once every 15 minutes.
 */
export async function startRedditNotificationManager(
    client,
) {
    if (checkTimer) {
        return;
    }

    await checkRedditNotifications(
        client,
    );

    checkTimer =
        setInterval(
            () => {
                void checkRedditNotifications(
                    client,
                );
            },
            CHECK_INTERVAL_MS,
        );

    checkTimer.unref();
}

/**
 * Stops periodic Reddit checks.
 */
export function stopRedditNotificationManager() {
    if (!checkTimer) {
        return;
    }

    clearInterval(
        checkTimer,
    );

    checkTimer =
        null;
}
