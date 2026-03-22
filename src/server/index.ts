import amqp from 'amqplib';
import process from 'node:process';
import { publishJSON } from '../internal/pubsub/publishjson.js';
import { ExchangePerilDirect, PauseKey } from '../internal/routing/routing.js';
//
async function main() {
    console.log('Starting Peril server...');
    //
    const rabbitConnString = 'amqp://guest:guest@localhost:5672/';
    const conn = await amqp.connect(rabbitConnString);
    const confirmCannel = await conn.createConfirmChannel();
    console.log(`Peril game server connect to RabbitMQ was successful`);
    //
    publishJSON(confirmCannel, ExchangePerilDirect, PauseKey, {
        isPaused: true,
    });
    //
    //
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
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
