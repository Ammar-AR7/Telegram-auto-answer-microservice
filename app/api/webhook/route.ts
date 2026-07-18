import { NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_SECRET_TOKEN });
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

async function sendTelegramMessage(chatId: number, text: string) {
  if (!TELEGRAM_BOT_TOKEN) return;
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text }),
    });
  } catch (error) {
    console.error('Error sending message to Telegram:', error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Ensure it's a message
    if (!body.message || !body.message.text) {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    const chatId = body.message.chat.id;
    const text = body.message.text.trim();

    // Check if it's a YouTube link
    if (text.includes('youtube.com') || text.includes('youtu.be')) {
      if (!NOTION_DATABASE_ID) {
        throw new Error('NOTION_DATABASE_ID is not configured.');
      }

      const taskName = `Task - ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`;

      await notion.pages.create({
        parent: { database_id: NOTION_DATABASE_ID },
        properties: {
          'Name': {
            title: [
              {
                text: {
                  content: taskName,
                },
              },
            ],
          },
          'Video URL': {
            url: text,
          },
          'Telegram Chat ID': {
            number: chatId,
          },
          'Status': {
            select: {
              name: 'Waiting for Time',
            },
          },
        },
      });

      await sendTelegramMessage(chatId, "تم استلام الرابط بنجاح! 🔗 يرجى تحديد النطاق الزمني، ويمكنك إدخال عدة نطاقات مفصولة بفاصلة (مثال: 01:10-01:15, 03:00-03:10)");

      return NextResponse.json({ status: 'success' }, { status: 200 });
    }

    // Check if it's a time range (contains '-' and is NOT a URL)
    if (text.includes('-') && !text.includes('http')) {
      if (!NOTION_DATABASE_ID) {
        throw new Error('NOTION_DATABASE_ID is not configured.');
      }

      // Validate the time range format using strict regex
      // Supports MM:SS or HH:MM:SS format
      // Single range: 01:10-01:15
      // Multiple ranges: 01:10-01:15, 03:00-03:10
      const timeFormat = '(?:\\d{1,2}:)?\\d{1,2}:\\d{2}';
      const rangeFormat = `${timeFormat}\\s*-\\s*${timeFormat}`;
      const fullRegex = new RegExp(`^\\s*${rangeFormat}\\s*(,\\s*${rangeFormat}\\s*)*$`);

      if (!fullRegex.test(text)) {
        await sendTelegramMessage(chatId, "❌ عذراً، التنسيق غير صحيح. يرجى إدخال الوقت بأرقام واضحة (مثال: 01:10-01:15) أو فترات متعددة (مثال: 01:10-01:15, 03:00-03:10) والمحاولة مرة أخرى.");
        return NextResponse.json({ status: 'invalid format' }, { status: 200 });
      }

      // Query Notion for the most recent row for this user waiting for time
      const response = await notion.databases.query({
        database_id: NOTION_DATABASE_ID,
        filter: {
          and: [
            {
              property: 'Telegram Chat ID',
              number: {
                equals: chatId,
              },
            },
            {
              property: 'Status',
              select: {
                equals: 'Waiting for Time',
              },
            },
          ],
        },
        sorts: [
          {
            timestamp: 'created_time',
            direction: 'descending',
          },
        ],
        page_size: 1,
      });

      if (response.results.length > 0) {
        const pageId = response.results[0].id;

        await notion.pages.update({
          page_id: pageId,
          properties: {
            'Time Range': {
              rich_text: [
                {
                  text: {
                    content: text,
                  },
                },
              ],
            },
            'Status': {
              select: {
                name: 'Pending',
              },
            },
          },
        });

        await sendTelegramMessage(chatId, "✅ تم تسجيل المهمة وحفظها في قاعدة البيانات. سيتم التنفيذ فور تشغيل الخادم المحلي.");
      } else {
        await sendTelegramMessage(chatId, "عذرًا، يرجى إرسال رابط فيديو أولاً قبل تحديد النطاق الزمني.");
      }

      return NextResponse.json({ status: 'success' }, { status: 200 });
    }

    // Unrecognized message
    await sendTelegramMessage(chatId, "عذرًا، لم أفهم الرسالة. يرجى إرسال رابط يوتيوب صالح أو نطاق زمني للمهمة السابقة.");
    return NextResponse.json({ status: 'success' }, { status: 200 });

  } catch (error) {
    console.error('Error in Webhook POST:', error);
    // Always return 200 to Telegram so it stops retrying
    return NextResponse.json({ status: 'error' }, { status: 200 });
  }
}
