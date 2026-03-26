import amqp from 'amqplib';
import process from 'node:process';
import { publishJSON } from '../internal/pubsub/publish.js';
import { ExchangePerilDirect, PauseKey } from '../internal/routing/routing.js';
import { getInput, printServerHelp } from '../internal/gamelogic/gamelogic.js';
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
    const publishCh = await conn.createConfirmChannel();
    //
    printServerHelp();
    aLoop: while (true) {
        const arrWords = await getInput();
        if (arrWords.length === 0) {
            continue;
        }
        //
        const firstWord = arrWords[0];
        console.log(`firstWord: ${firstWord}`);
        //
        switch (firstWord) {
            case 'pause':
                await pauseAction(publishCh);
                break;
            case 'resume':
                await resumeAction(publishCh);
                break;
            case 'quit':
                console.log('I am out of here');
                break aLoop;
            default:
                console.log(`I don't understand...`);
                break;
        }
        //
    }
    return;
    //

    //
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
