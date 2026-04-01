import amqp, { type Channel } from 'amqplib';

export enum SimpleQueueType {
    Durable,
    Transient,
}
//
export async function declareAndBind(
    conn: amqp.ChannelModel,
    exchange: string,
    queueName: string,
    key: string,
    queueType: SimpleQueueType,
): Promise<[Channel, amqp.Replies.AssertQueue]> {
    const ch = await conn.createChannel();
    //
    const q = await ch.assertQueue(queueName, {
        durable: queueType === SimpleQueueType.Durable,
        exclusive: queueType !== SimpleQueueType.Durable,
        autoDelete: queueType !== SimpleQueueType.Durable,
    });
    //
    await ch.bindQueue(q.queue, exchange, key);
    //
    return [ch, q];
}
//
export enum AckType {
    Ack,
    NackRequeue,
    NackDiscard,
}
//
export async function subscribeJSON<T>(
    conn: amqp.ChannelModel,
    exhange: string,
    queueName: string,
    key: string,
    queueType: SimpleQueueType,
    handler: (data: T) => AckType,
): Promise<void> {
    const [ch, queue] = await declareAndBind(
        conn,
        exhange,
        queueName,
        key,
        queueType,
    );
    //
    await ch.consume(queue.queue, function (msg: amqp.ConsumeMessage | null) {
        if (!msg) return;
        //
        let data: T;
        try {
            data = JSON.parse(msg.content.toString());
        } catch (err) {
            console.error(`Could not unmarshal message: ${err}`);
            return;
        }
        //
        try {
            const result = handler(data);
            switch (result) {
                case AckType.Ack:
                    ch.ack(msg);
                    console.log('Ack');
                    break;
                case AckType.NackDiscard:
                    ch.nack(msg, false, false);
                    console.log('NackDiscard');
                    break;
                case AckType.NackRequeue:
                    ch.nack(msg, false, true);
                    console.log('NackRequeue');
                    break;
                default:
                    const unreachable: never = result;
                    console.error(`Unexpected ack type: ${unreachable}`);
                    return;
            }
        } catch (err) {
            console.error(`Error handling message: ${err}`);
            ch.nack(msg, false, false);
            return;
        }
    });
}
