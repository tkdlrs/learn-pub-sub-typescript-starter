import amqp, { type ConfirmChannel } from 'amqplib';
import {
    clientWelcome,
    commandStatus,
    getInput,
    getMaliciousLog,
    printClientHelp,
    printQuit,
} from '../internal/gamelogic/gamelogic.js';
import {
    declareAndBind,
    SimpleQueueType,
    subscribeJSON,
} from '../internal/pubsub/consume.js';
import {
    ArmyMovesPrefix,
    ExchangePerilDirect,
    ExchangePerilTopic,
    GameLogSlug,
    PauseKey,
    WarRecognitionsPrefix,
} from '../internal/routing/routing.js';
import { GameState } from '../internal/gamelogic/gamestate.js';
import { commandSpawn } from '../internal/gamelogic/spawn.js';
import { commandMove } from '../internal/gamelogic/move.js';
import { handlerMove, handlerPause, handlerWar } from './handlers.js';
import { publishJSON, publishMsgPack } from '../internal/pubsub/publish.js';
import type { GameLog } from '../internal/gamelogic/logs.js';
//
async function main() {
    const rabbitConnString = 'amqp://guest:guest@localhost:5672/';
    const conn = await amqp.connect(rabbitConnString);
    console.log('Peril game client connected to RabbitMQ!');
    //
    ['SIGINT', 'SIGTERM'].forEach((signal) => {
        process.on(signal, async () => {
            try {
                await conn.close();
                console.log('RabbitMQ connection closed.');
            } catch (err) {
                console.error('Error closing RabbitMQ connection:', err);
            } finally {
                process.exit(0);
            }
        });
    });
    //
    const username = await clientWelcome();
    const gs = new GameState(username);
    const publishCh = await conn.createConfirmChannel();
    //
    await subscribeJSON(
        conn,
        ExchangePerilTopic,
        `${ArmyMovesPrefix}.${username}`,
        `${ArmyMovesPrefix}.*`,
        SimpleQueueType.Transient,
        handlerMove(gs, publishCh),
    );
    //
    await subscribeJSON(
        conn,
        ExchangePerilDirect,
        `${PauseKey}.${username}`,
        PauseKey,
        SimpleQueueType.Transient,
        handlerPause(gs),
    );
    //
    await subscribeJSON(
        conn,
        ExchangePerilTopic,
        WarRecognitionsPrefix,
        `${WarRecognitionsPrefix}.*`,
        SimpleQueueType.Durable,
        handlerWar(gs, publishCh),
    );
    //

    // REPL
    while (true) {
        const words = await getInput();
        if (words.length === 0) {
            continue;
        }
        //
        const command = words[0];
        //
        switch (command) {
            case 'move':
                try {
                    const move = commandMove(gs, words);
                    publishJSON(
                        publishCh,
                        ExchangePerilTopic,
                        `${ArmyMovesPrefix}.${username}`,
                        move,
                    );
                } catch (err) {
                    console.log((err as Error).message);
                }
                break;
            case 'status':
                commandStatus(gs);
                break;
            case 'spawn':
                try {
                    commandSpawn(gs, words);
                } catch (err) {
                    console.log((err as Error).message);
                }
                break;
            case 'help':
                printClientHelp();
                break;
            case 'quit':
                printQuit();
                process.exit(0);
            case 'spam':
                try {
                    const count = Number(words[1]);
                    if (!count || isNaN(count)) {
                        throw new Error(
                            `A number was not provided for Count  `,
                        );
                    }
                    //
                    for (let i = 0; i < count; i++) {
                        //
                        const badLog = getMaliciousLog();
                        publishJSON(
                            publishCh,
                            ExchangePerilTopic,
                            `${GameLogSlug}.${username}`,
                            badLog,
                        );
                    }
                } catch (err) {
                    console.log((err as Error).message);
                }
                break;
            default:
                console.log(`Unknown command: "${command}"`);
                continue;
        }
    }
}
//
export async function publishGameLog(
    ch: amqp.ConfirmChannel,
    username: string,
    message: string,
): Promise<void> {
    const log: GameLog = {
        username,
        message,
        currentTime: new Date(),
    };
    //
    return publishMsgPack(
        ch,
        ExchangePerilTopic,
        `${GameLogSlug}.${username}`,
        log,
    );
}
//
main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
//
