const amqp = require('amqplib');

const { v4: uuidv4 } = require('uuid');

const RABBITMQ_HOST = 'amqp://guest:guest@localhost:5672';

const queue = 'example';

const start = async () => {
  const connection = await amqp.connect(RABBITMQ_HOST);
  const channel = await connection.createChannel();
  await channel.assertQueue(queue);
  await channel.consume(
    queue, 
    function (msg) {
      console.log(`[ ${new Date()} ] Message received: ${JSON.stringify(JSON.parse(msg.content.toString()))}`);
      if (msg !== null) {
        const response = {
          uuid: uuidv4(),
        };

        console.log(`[ ${new Date()} ] Message sent: ${JSON.stringify(response)}`);

        channel.sendToQueue(
          msg.properties.replyTo,
          Buffer.from(JSON.stringify(response)),
          {
            correlationId: msg.properties.correlationId,
          },
        );

        channel.ack(msg);
      }
    },
    { noAck: false }
  );
};

start().catch(console.error);