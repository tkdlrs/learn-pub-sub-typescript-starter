import amqp, { type Channel } from 'amqplib';

export enum SimpleQueueType {
    Durable,
    Transient,
}
//

//
export async function declareAndBind(
    conn: amqp.ChannelModel,
    exchange: string,
    queueName: string,
    key: string,
    queueType: SimpleQueueType,
): Promise<[Channel, amqp.Replies.AssertQueue]> {
    const channel = await conn.createChannel();
    //
    const queueOptions = {
        durable: false,
        autoDelete: false,
        exclusive: false,
    };
    if (queueType === 0) {
        queueOptions['durable'] = true;
    } else if (queueType === 1) {
        queueOptions['autoDelete'] = true;
        queueOptions['exclusive'] = true;
    }
    //
    const q = await channel.assertQueue(queueName, queueOptions);
    channel.bindQueue(q.queue, exchange, key);

    //
    return [channel, q];
}
