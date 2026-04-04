import type { ConfirmChannel } from 'amqplib';
import { encode } from '@msgpack/msgpack';

export async function publishJSON<T>(
    ch: ConfirmChannel,
    exchange: string,
    routingKey: string,
    value: T,
): Promise<void> {
    // Serialize the value to JSON bytes
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
//
export async function publishMsgPack<T>(
    ch: ConfirmChannel,
    exchange: string,
    routingKey: string,
    value: T,
): Promise<void> {
    // Serialize the value to MessagePack/ binary
    const body = encode(value);
    //
    return new Promise((resolve, reject) => {
        ch.publish(
            exchange,
            routingKey,
            Buffer.from(body),
            {
                contentType: 'application/x-msgpack',
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
