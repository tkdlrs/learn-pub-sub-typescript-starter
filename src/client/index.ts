import amqp from 'amqplib';
import { clientWelcome } from '../internal/gamelogic/gamelogic.js';
import {
    declareAndBind,
    SimpleQueueType,
} from '../internal/pubsub/decareAndBind.js';
import { ExchangePerilDirect, PauseKey } from '../internal/routing/routing.js';
//
async function main() {
    console.log('Starting Peril client...');
    //
    const rabbitConnString = 'amqp://guest:guest@localhost:5672/';
    const conn = await amqp.connect(rabbitConnString);
    //
    const username = await clientWelcome();
    //
    declareAndBind(
        conn,
        ExchangePerilDirect,
        `pause.${username}`,
        PauseKey,
        SimpleQueueType.Transient,
    );
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
