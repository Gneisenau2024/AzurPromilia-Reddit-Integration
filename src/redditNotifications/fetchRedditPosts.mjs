const SUBREDDIT =
    'AzurPromilia';

const REDDIT_API_BASE_URL =
    'https://oauth.reddit.com';

/**
 * Reddit Data APIから
 * r/AzurPromilia の最新投稿を取得します。
 *
 * OAuthアクセストークンの取得方法は、
 * Reddit Data APIアクセス承認後に
 * Redditから提供されるAccess Infoに合わせて構成します。
 *
 * @param {string} accessToken
 */
export async function fetchRedditPosts(
    accessToken,
) {
    if (!accessToken) {
        throw new Error(
            'Reddit OAuth access token is required.',
        );
    }

    const userAgent =
        process.env.REDDIT_USER_AGENT;

    if (!userAgent) {
        throw new Error(
            'REDDIT_USER_AGENT is not configured.',
        );
    }

    const url =
        new URL(
            `/r/${SUBREDDIT}/new`,
            REDDIT_API_BASE_URL,
        );

    url.searchParams.set(
        'limit',
        '25',
    );

    url.searchParams.set(
        'raw_json',
        '1',
    );

    const response =
        await fetch(
            url,
            {
                headers: {
                    Authorization:
                        `Bearer ${accessToken}`,

                    'User-Agent':
                        userAgent,
                },
            },
        );

    if (!response.ok) {
        const responseText =
            await response.text();

        throw new Error(
            `Reddit Data API request failed: ${response.status} ${response.statusText} ${responseText}`,
        );
    }

    const data =
        await response.json();

    const children =
        Array.isArray(
            data?.data?.children,
        )
            ? data.data.children
            : [];

    return children
        .map(
            (child) => {
                const post =
                    child?.data;

                if (!post) {
                    return null;
                }

                return {
                    id:
                        post.name ??
                        null,

                    title:
                        post.title ??
                        '',

                    author:
                        post.author ??
                        '',

                    url:
                        post.permalink
                            ? `https://www.reddit.com${post.permalink}`
                            : '',

                    publishedAt:
                        Number.isFinite(
                            post.created_utc,
                        )
                            ? new Date(
                                post.created_utc *
                                    1000,
                            ).toISOString()
                            : null,

                    text:
                        post.selftext ??
                        '',

                    imageUrl:
                        post.post_hint ===
                            'image'
                            ? post.url_overridden_by_dest ??
                              post.url ??
                              null
                            : null,

                    externalUrls:
                        getExternalUrls(
                            post,
                        ),
                };
            },
        )
        .filter(
            Boolean,
        );
}

/**
 * Reddit投稿に含まれる外部リンクを抽出します。
 */
function getExternalUrls(
    post,
) {
    const urls =
        [];

    const destinationUrl =
        post.url_overridden_by_dest ??
        post.url;

    if (
        destinationUrl &&
        !isRedditUrl(
            destinationUrl,
        ) &&
        post.post_hint !==
            'image'
    ) {
        urls.push(
            destinationUrl,
        );
    }

    return [
        ...new Set(
            urls,
        ),
    ];
}

function isRedditUrl(
    value,
) {
    try {
        const url =
            new URL(
                value,
            );

        return (
            url.hostname ===
                'reddit.com' ||
            url.hostname.endsWith(
                '.reddit.com',
            ) ||
            url.hostname ===
                'redd.it' ||
            url.hostname.endsWith(
                '.redd.it',
            )
        );
    } catch {
        return false;
    }
}
