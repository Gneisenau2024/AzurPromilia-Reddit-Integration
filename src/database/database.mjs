import {
    MongoClient,
} from 'mongodb';

let client =
    null;

let database =
    null;

/**
 * MongoDBへ接続します。
 *
 * Reddit投稿本文や翻訳文を保存するためではなく、
 * Discordへの重複通知を防ぐための
 * 最小限のメタデータ保存に使用します。
 */
export async function connectDatabase() {
    const mongoUri =
        process.env.MONGODB_URI;

    if (!mongoUri) {
        throw new Error(
            'MONGODB_URI is not configured.',
        );
    }

    if (database) {
        return database;
    }

    client =
        new MongoClient(
            mongoUri,
        );

    await client.connect();

    database =
        client.db(
            'azurPromiliaBot',
        );

    return database;
}

/**
 * 接続済みDatabaseを取得します。
 */
export function getDatabase() {
    if (!database) {
        throw new Error(
            'MongoDB is not connected.',
        );
    }

    return database;
}

/**
 * MongoDB接続を終了します。
 */
export async function disconnectDatabase() {
    if (!client) {
        return;
    }

    await client.close();

    client =
        null;

    database =
        null;
}
