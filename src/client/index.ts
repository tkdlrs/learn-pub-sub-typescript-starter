import amqp from 'amqplib';
import {
    clientWelcome,
    commandStatus,
    getInput,
    printClientHelp,
    printQuit,
} from '../internal/gamelogic/gamelogic.js';
import { declareAndBind, SimpleQueueType } from '../internal/pubsub/consume.js';
import { ExchangePerilDirect, PauseKey } from '../internal/routing/routing.js';
import { GameState } from '../internal/gamelogic/gamestate.js';
import { commandSpawn } from '../internal/gamelogic/spawn.js';
import { commandMove } from '../internal/gamelogic/move.js';
//

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
    //
    await declareAndBind(
        conn,
        ExchangePerilDirect,
        `${PauseKey}.${username}`,
        PauseKey,
        SimpleQueueType.Transient,
    );
    //
    const gameState = new GameState(username);
    //
    outerloop: while (true) {
        const words = await getInput();
        if (words.length === 0) {
            continue;
        }
        //
        const command = words[0];
        //
        switch (command) {
            case 'spawn':
                console.log(`Calling "commandSpawn"`);
                commandSpawn(gameState, words);
                break;
            case 'move':
                console.log(`Calling "commandMove"`);
                commandMove(gameState, words);
                console.log(`move appears to be a success`);
                break;
            case 'status':
                console.log(`Calling "commandStatus"`);
                commandStatus(gameState);
                break;
            case 'help':
                console.log(`Calling "printClientHelp"`);
                printClientHelp();
                break;
            case 'spam':
                console.log(`Spamming not allowed yet!`);
                break;
            case 'quit':
                console.log(`Calling "printQuit"`);
                printQuit();
                process.exit(0);
                break;
            default:
                console.log(`error: WTF "${command}" is not a command.`);
                continue outerloop;
                break;
        }
    }
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
