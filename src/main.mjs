import 'dotenv/config';

import {
    Client,
    GatewayIntentBits,
} from 'discord.js';

import {
    connectDatabase,
    disconnectDatabase,
} from './database/database.mjs';

import {
    initializeRedditNotificationRepository,
} from './redditNotifications/redditNotificationRepository.mjs';

import {
    startRedditNotificationManager,
    stopRedditNotificationManager,
} from './redditNotifications/redditNotificationManager.mjs';

const client =
    new Client({
        intents: [
            GatewayIntentBits.Guilds,
        ],
    });

let isShuttingDown =
    false;

/**
 * Starts the Discord bot and
 * Reddit notification integration.
 */
async function start() {
    await connectDatabase();

    await initializeRedditNotificationRepository();

    client.once(
        'clientReady',
        async () => {
            console.log(
                `Discord connected as ${client.user.tag}`,
            );

            await startRedditNotificationManager(
                client,
            );
        },
    );

    await client.login(
        process.env.DISCORD_TOKEN,
    );
}

/**
 * Gracefully shuts down the application.
 */
async function shutdown(
    signal,
) {
    if (isShuttingDown) {
        return;
    }

    isShuttingDown =
        true;

    console.log(
        `Shutting down: ${signal}`,
    );

    stopRedditNotificationManager();

    client.destroy();

    await disconnectDatabase()
        .catch(
            (error) => {
                console.error(
                    'Failed to close MongoDB connection:',
                    error,
                );
            },
        );

    process.exit(
        0,
    );
}

process.once(
    'SIGINT',
    () => {
        void shutdown(
            'SIGINT',
        );
    },
);

process.once(
    'SIGTERM',
    () => {
        void shutdown(
            'SIGTERM',
        );
    },
);

start()
    .catch(
        async (
            error,
        ) => {
            console.error(
                'Application startup failed:',
                error,
            );

            stopRedditNotificationManager();

            client.destroy();

            await disconnectDatabase()
                .catch(
                    () => {},
                );

            process.exitCode =
                1;
        },
    );
