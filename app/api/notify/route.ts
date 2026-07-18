import { NextResponse } from 'next/server';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegramMessage(chatId: number, text: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN is not set');
    return false;
  }
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text }),
    });
    return response.ok;
  } catch (error) {
    console.error('Error sending message to Telegram:', error);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { chat_id, status, video_title } = body;

    if (!chat_id || !status || !video_title) {
      return NextResponse.json(
        { error: 'Missing required fields: chat_id, status, or video_title' },
        { status: 400 }
      );
    }

    let messageText = '';
    if (status === 'success') {
      messageText = `🎉 تمت معالجة المقطع بنجاح: ${video_title}\nالإطارات جاهزة في مجلدك المحلي!`;
    } else if (status === 'failed') {
      messageText = `❌ حدث خطأ أثناء معالجة المقطع: ${video_title}\nيرجى التأكد من الرابط أو النطاق الزمني.`;
    } else {
      return NextResponse.json(
        { error: 'Invalid status. Must be "success" or "failed".' },
        { status: 400 }
      );
    }

    const success = await sendTelegramMessage(chat_id, messageText);

    if (success) {
      return NextResponse.json({ status: 'success' }, { status: 200 });
    } else {
      return NextResponse.json(
        { error: 'Failed to send Telegram message' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in Notify POST:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
