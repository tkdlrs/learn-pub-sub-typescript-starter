import amqp from 'amqplib';
import process from 'node:process';
//
async function main() {
    console.log('Starting Peril server...');
    const rabbitConnString = 'amqp://guest:guest@localhost:5672/';
    const conn = await amqp.connect(rabbitConnString);
    //
    console.log(`Connection was successful`);
    //
    process.on('SIGINT', () => {
        console.log(`Received SIGINT. Program is shutting down.`);
        conn.close();
    });
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
