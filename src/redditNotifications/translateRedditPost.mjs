import OpenAI from 'openai';

let openai =
    null;

/**
 * Creates the OpenAI client used only for
 * per-notification Japanese translation.
 */
function getOpenAIClient() {
    const apiKey =
        process.env.OPENAI_API_KEY;

    if (!apiKey) {
        throw new Error(
            'OPENAI_API_KEY is not configured.',
        );
    }

    if (!openai) {
        openai =
            new OpenAI({
                apiKey,
            });
    }

    return openai;
}

/**
 * Translates the title and text of a Reddit post
 * into Japanese for an individual Discord notification.
 *
 * Only the public post title and body text are sent
 * to the OpenAI API.
 *
 * Reddit usernames, post IDs, URLs, images,
 * and other metadata are not sent for translation.
 *
 * The translation is not stored by this module.
 *
 * @param {{
 *   title: string,
 *   text: string,
 * }} post
 */
export async function translateRedditPost(
    post,
) {
    const model =
        process.env
            .OPENAI_REDDIT_TRANSLATION_MODEL ??
        'gpt-5.4-mini';

    const instructions = [
        'Redditの「r/AzurPromilia」に投稿された文章を、日本語へ翻訳してください。',
        '',
        '# 方針',
        '原文の意味を保った自然で読みやすい日本語にしてください。',
        '要約せず、原文にある内容を省略しないでください。',
        '原文にない情報や推測を追加しないでください。',
        '投稿者の主張や推測は、事実であるかのように強めないでください。',
        'URL、日付、数字、アカウント名はできるだけそのまま維持してください。',
        '',
        '# 固有名詞',
        'Azur Promilia は「アズールプロミリア」と訳してください。',
        'Starborn は文脈上プレイヤーを指す場合「星臨者」と訳してください。',
        'Lumii または Lumi は「ルミィ」としてください。',
        '',
        '# 文体',
        'Reddit投稿らしい自然な文章にしてください。',
        '投稿者の口調や温度感は可能な範囲で維持してください。',
        '勝手に丁寧語へ統一しないでください。',
        '',
        '# 出力形式',
        '必ず次の形式だけで出力してください。',
        '',
        '【タイトル】',
        '翻訳したタイトル',
        '',
        '【本文】',
        '翻訳した本文',
        '',
        '本文が空の場合は【本文】の次に「本文なし」と出力してください。',
    ].join(
        '\n',
    );

    const input = [
        '【原文タイトル】',
        post.title,
        '',
        '【原文本文】',
        post.text ||
            '本文なし',
    ].join(
        '\n',
    );

    const response =
        await getOpenAIClient()
            .responses.create({
                model,

                instructions,

                input,

                max_output_tokens:
                    4000,

                store:
                    false,
            });

    const translatedText =
        response.output_text
            ?.trim();

    if (!translatedText) {
        throw new Error(
            'Failed to obtain a Japanese translation of the Reddit post.',
        );
    }

    return translatedText;
}
