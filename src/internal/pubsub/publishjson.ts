import type { ConfirmChannel } from 'amqplib';

export async function publishJSON<T>(
    ch: ConfirmChannel,
    exchange: string,
    routingKey: string,
    value: T,
): Promise<void> {
    // Serialize the vlaue to JSON bytes
    const buff = Buffer.from(JSON.stringify(value));
    // Use channel publish method to publish message to the exchange with the routing key
    ch.publish(exchange, routingKey, buff, { contentType: 'application/json' });
    //
    return;
}
