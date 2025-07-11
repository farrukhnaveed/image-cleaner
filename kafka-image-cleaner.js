require('dotenv').config(); // Load environment variables from .env file
const fs = require('fs');
const path = require('path');
const { Kafka } = require('kafkajs');
const AWS = require('aws-sdk');
const winston = require('winston');

// Make sure logs directory exists
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Configure winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: path.join(logDir, 'activity.log') }),
    new winston.transports.Console()
  ]
});

// AWS config (assumes credentials are already configured via env or shared config)
const s3 = new AWS.S3();

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
const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID });

async function deleteFromS3(bucket, key) {
  try {
    await s3.deleteObject({ Bucket: bucket, Key: key }).promise();
    logger.info(`Deleted: s3://${bucket}/${key}`);
  } catch (err) {
    logger.error(`Failed to delete: s3://${bucket}/${key} - ${err.message}`);
  }
}

async function processMessage(message) {
  let payload;
  try {
    payload = JSON.parse(message.value.toString());
  } catch (err) {
    logger.error('Invalid JSON message:', err);
    return;
  }

  const { image_uri, type, frames, dl_link } = payload;
  if (!image_uri || !type) {
    logger.error('Missing required keys in message:', payload);
    return;
  }

  const { bucket, keyPrefix } = parseS3Uri(image_uri);

  if (type === 'static') {
    await deleteFromS3(bucket, keyPrefix);
  } else if (type === '360') {
    let count = parseInt(frames);
    count = isNaN(count) ? 0 : count === 0 ? 1 : count; // Ensure at least one frame
    for (let i = 0; i < count; i++) {
      let key = path.posix.join(keyPrefix, `${i}.jpg`);
      await deleteFromS3(bucket, key);
      key = path.posix.join(keyPrefix, `${i}.webp`);
      await deleteFromS3(bucket, key);
    }
  } else {
    logger.error('Unknown type:', type);
  }

  // If dl_link is present and not null, delete the object in that link
  if (dl_link) {
    try {
      const { bucket: dlBucket, keyPrefix: dlKey } = parseS3Uri(dl_link);
      await deleteFromS3(dlBucket, dlKey);
    } catch (err) {
      logger.error(`Failed to process dl_link: ${err.message}`);
    }
  }
}

function parseS3Uri(uri) {
  // Expects format: s3://bucket-name/path/to/folder
  const match = uri.match(/^s3:\/\/([^/]+)\/(.+)$/);
  if (!match) throw new Error('Invalid S3 URI');
  return {
    bucket: match[1],
    keyPrefix: match[2],
  };
}

async function start() {
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      console.log(`📩 New message received from ${topic}`);
      await processMessage(message);
    },
  });

  console.log(`Kafka consumer running on topic "${topic}"`);
}

start().catch(logger.error);
