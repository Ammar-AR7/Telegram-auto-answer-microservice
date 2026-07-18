# Telegram Auto-Answer Microservice

A complete, deployment-ready Next.js Serverless API project to be hosted on Vercel. This API acts as a Telegram Bot Webhook that receives messages, manages a simple 2-step conversational state, and saves tasks to a Notion Database.

## Features
- Acts as a webhook for Telegram Bots.
- Manages conversational state using Notion.
- Built on Next.js Serverless functions (App Router).

## Environment Variables
To run this project, you will need to add the following environment variables to your Vercel project (and your local `.env` if developing locally):

- `TELEGRAM_BOT_TOKEN`: The token provided by BotFather on Telegram.
- `NOTION_SECRET_TOKEN`: The Integration Token for your Notion workspace.
- `NOTION_DATABASE_ID`: The ID of the Notion database where tasks will be saved.

## Project Structure
```
.
├── app/
│   └── api/
│       └── webhook/
│           └── route.ts  # The main API route handling incoming Telegram webhooks
├── node_modules/         # Dependencies (auto-generated)
├── .gitignore            # Git ignore file
├── package.json          # Project metadata and dependencies
├── README.md             # Project documentation (this file)
└── tsconfig.json         # TypeScript configuration
```

## How to Set the Webhook on Telegram
To register your Vercel URL with Telegram using the `setWebhook` method, follow these steps:

1. Deploy the project to Vercel and obtain the production URL (e.g., `https://your-project.vercel.app`).
2. Open your web browser or an API client (like Postman).
3. Make an HTTP GET request to the following URL (replace `<YOUR_BOT_TOKEN>` with your actual Telegram bot token, and `<YOUR_VERCEL_URL>` with your Vercel domain):

   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=<YOUR_VERCEL_URL>/api/webhook
   ```

   Example:
   ```
   https://api.telegram.org/bot123456789:ABCdefGHIjklmNOP/setWebhook?url=https://my-telegram-bot.vercel.app/api/webhook
   ```

4. You should see a JSON response confirming that the webhook was successfully set:
   ```json
   {
     "ok": true,
     "result": true,
     "description": "Webhook was set"
   }
   ```
5. Send a message to your bot on Telegram to test it!

## Notion Database Schema
Ensure your Notion Database has the following properties:
- **Name**: Title property (mandatory in Notion). Represents the task name.
- **Video URL**: URL property.
- **Time Range**: Rich text property.
- **Telegram Chat ID**: Number property.
- **Status**: Select property with the following options: 'Waiting for Time', 'Pending', 'Done', 'Failed'.
