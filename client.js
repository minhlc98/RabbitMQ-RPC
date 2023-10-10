const amqp = require('amqplib');
const uuid = require('uuid');
const EventEmitter = require('events');

const RABBITMQ_HOST = 'amqp://guest:guest@localhost:5672';

// pseudo-queue for direct reply-to
const REPLY_QUEUE = 'reply_queue';
const queue = 'example';

const createClient = async (host) => {
  const connection = await amqp.connect(host);
  const channel = await connection.createChannel();
  await channel.assertQueue(REPLY_QUEUE);
  channel.responseEmitter = new EventEmitter();
  channel.responseEmitter.setMaxListeners(0); // 0 is unlimit
  channel.consume(
    REPLY_QUEUE, 
    msg => {
      channel.responseEmitter.emit(
        msg.properties.correlationId,
        msg.content.toString(),
      );
      channel.ack(msg);
    }, 
    { noAck: false }
  );

  return channel;
}

const sendRPCMessage = (channel, message, rpcQueue) =>
  new Promise(resolve => {
    const correlationId = uuid.v4();
    channel.responseEmitter.once(correlationId, resolve);
    channel.sendToQueue(rpcQueue, Buffer.from(message), {
      correlationId,
      replyTo: REPLY_QUEUE,
    });
  });

const init = async () => {
  const channel = await createClient(RABBITMQ_HOST);
  const message = { uuid: uuid.v4() };

  console.log(`[ ${new Date()} ] Message sent: ${JSON.stringify(message)}`);

  const respone = await sendRPCMessage(channel, JSON.stringify(message), queue);

  console.log(`[ ${new Date()} ] Message received: ${respone}`);

  process.exit();
};

try {
  init();
} catch (e) {
  console.log(e);
}