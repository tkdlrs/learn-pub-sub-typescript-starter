import amqp from 'amqplib';
import {
    clientWelcome,
    commandStatus,
    getInput,
    printClientHelp,
    printQuit,
} from '../internal/gamelogic/gamelogic.js';
import { SimpleQueueType, subscribeJSON } from '../internal/pubsub/consume.js';
import {
    ArmyMovesPrefix,
    ExchangePerilDirect,
    ExchangePerilTopic,
    PauseKey,
} from '../internal/routing/routing.js';
import { GameState } from '../internal/gamelogic/gamestate.js';
import { commandSpawn } from '../internal/gamelogic/spawn.js';
import { commandMove } from '../internal/gamelogic/move.js';
import { handlerMove, handlerPause } from './handlers.js';
import { publishJSON } from '../internal/pubsub/publish.js';
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
        handlerMove(gs),
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
                console.log(`Spamming not allowed yet!`);
                break;
            default:
                console.log(`Unknown command: "${command}"`);
                continue;
        }
    }
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
