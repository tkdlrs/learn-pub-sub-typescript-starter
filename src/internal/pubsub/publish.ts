import type { ConfirmChannel } from 'amqplib';

export async function publishJSON<T>(
    ch: ConfirmChannel,
    exchange: string,
    routingKey: string,
    value: T,
): Promise<void> {
    // Serialize the vlaue to JSON bytes
    const content = Buffer.from(JSON.stringify(value));
    // Use channel publish method to publish message to the exchange with the routing key
    return new Promise((resolve, reject) => {
        ch.publish(
            exchange,
            routingKey,
            content,
            {
                contentType: 'application/json',
            },
            (err) => {
                if (err !== null) {
                    reject(new Error('Message was NACKed by the broker'));
                } else {
                    resolve();
                }
            },
        );
    });
}
