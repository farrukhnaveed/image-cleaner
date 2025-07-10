
# 🧹 Image Cleaner Kafka Consumer

A Node.js Kafka consumer that listens for image deletion instructions and removes images from AWS S3 — useful for cleaning up static or 360 product images.

---

## 📦 Features

- ✅ Consumes messages from Kafka
- 🧠 Supports `static` and `360` image types
- 🔥 Deletes images from Amazon S3
- 📄 Logs all actions to console and file (`logs/activity.log`)
- 🐳 Dockerized and ready to deploy
- 🧪 Includes test producer for sending sample messages

---

## 🛠 Project Structure

```
image-cleaner/
├── kafka-image-cleaner.js     # Main consumer script
├── kafka-producer.js          # (Optional) Test producer script
├── Dockerfile                 # Docker setup
├── docker-compose.yml         # Service environment (app)
├── package.json               # Dependencies
├── logs/
│   └── activity.log           # Runtime logs
```

---

## 🚀 Getting Started

### 1. Clone the Repo

```bash
git clone https://github.com/your-username/image-cleaner.git
cd image-cleaner
```

### 2. Configure AWS Credentials

You can either:

- Set env vars in `docker-compose.yml`:
  ```yaml
  environment:
    AWS_ACCESS_KEY_ID: your_key
    AWS_SECRET_ACCESS_KEY: your_secret
    AWS_REGION: your_region
  ```

- Or mount your local AWS credentials:
  ```yaml
  volumes:
    - ~/.aws:/root/.aws
  ```

---

## 🐳 Run with Docker Compose

```bash
docker-compose up --build
```

- Starts the image-cleaner consumer

---

## 📩 Sending Test Messages

Run the test producer:

```bash
node kafka-producer.js
```

### Example Message

```json
{
  "image_uri": "s3://your-bucket/images/product123",
  "type": "360",
  "frames": 5
}
```

For static image:

```json
{
  "image_uri": "s3://your-bucket/images/product123.jpg",
  "type": "static"
}
```

---

## 📝 Logs

- All actions are printed to the console
- Also written to `logs/activity.log`

---

## ✅ Requirements

- Node.js 18+
- Docker & Docker Compose
- Kafka + Zookeeper (not included in compose setup)
- AWS credentials with `s3:DeleteObject` permission

---

## 📌 TODO / Improvements

- Retry failed deletes
- Support other image formats (e.g., PNG)
- CI/CD with GitHub Actions
- Alerting on failures

---

## 📄 License

MIT — free to use, modify, and distribute.
