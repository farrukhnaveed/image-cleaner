require('dotenv').config(); 
const { Kafka } = require('kafkajs');

// Kafka config
const sasl_settings = {
    mechanism: process.env.KAFKA_SASL_MECHANISM,
    connectionTimeout: 10000,
    requestTimeout: 25000,
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD,
};
const ssl = process.env.KAFKA_SSL === 'enabled' ? true : false;
const sasl = process.env.KAFKA_SASL_MECHANISM === 'SCRAM-SHA-512' ? sasl_settings : false;
const kafka = new Kafka({
    clientId: process.env.KAFKA_GROUP_ID,
    brokers: [process.env.KAFKA_BROKER], // Kafka broker running in Docker
    ssl,
    sasl,
    connectionTimeout: 10000,
    requestTimeout: 25000,
    retry: {
      initialRetryTime: 400,
      retries: 8,
      factor: 2,   
    },
  });

const topic = process.env.KAFKA_TOPIC;

const producer = kafka.producer();

async function sendTestMessage() {
  await producer.connect();

  const message = {
    image_uri: 's3://your-bucket/images/product123',
    type: '360',
    frames: 3
  };

  await producer.send({
    topic,
    messages: [
      { value: JSON.stringify(message) }
    ],
  });

  console.log('✅ Test message sent!');
  await producer.disconnect();
}

sendTestMessage().catch(console.error);
