import amqp from 'amqplib';
import process from 'node:process';
import { publishJSON } from '../internal/pubsub/publish.js';
import {
    ExchangePerilDirect,
    ExchangePerilTopic,
    GameLogSlug,
    PauseKey,
} from '../internal/routing/routing.js';
import { getInput, printServerHelp } from '../internal/gamelogic/gamelogic.js';
import { declareAndBind, SimpleQueueType } from '../internal/pubsub/consume.js';
//
async function pauseAction(channel: amqp.ConfirmChannel): Promise<void> {
    try {
        await publishJSON(channel, ExchangePerilDirect, PauseKey, {
            isPaused: true,
        });
    } catch (err) {
        console.error(`Error publishing message: ${err}`);
    }
    return;
} //
async function resumeAction(channel: amqp.ConfirmChannel): Promise<void> {
    try {
        await publishJSON(channel, ExchangePerilDirect, PauseKey, {
            isPaused: false,
        });
    } catch (err) {
        console.error(`Error publishing message: ${err}`);
    }
    return;
}
//
async function main() {
    const rabbitConnString = 'amqp://guest:guest@localhost:5672/';
    const conn = await amqp.connect(rabbitConnString);
    console.log(`Peril game server connected to RabbitMQ!`);
    //
    ['SIGINT', 'SIGTERM'].forEach((signal) => {
        process.on(signal, async () => {
            try {
                await conn.close();
                console.log(
                    `RabbitMQ connection closed. Program shutting down.`,
                );
            } catch (err) {
                console.error(`Error closing RabbitMQ connection: ${err}`);
            } finally {
                process.exit(0);
            }
        });
    });
    //
    await declareAndBind(
        conn,
        ExchangePerilTopic,
        GameLogSlug,
        `game_logs.*`,
        SimpleQueueType.Durable,
    );

    //
    const publishCh = await conn.createConfirmChannel();
    //
    printServerHelp();
    while (true) {
        const words = await getInput();
        if (words.length === 0) {
            continue;
        }
        //
        const command = words[0];
        //
        switch (command) {
            case 'pause':
                console.log(`Publishing paused game state`);
                await pauseAction(publishCh);
                break;
            case 'resume':
                console.log(`Publishing resumed game state`);
                await resumeAction(publishCh);
                break;
            case 'quit':
                console.log(`Goodbye!`);
                process.exit(0);
                break;
            default:
                console.log(`Unknown command`);
                break;
        }
        //
    }
    //
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
