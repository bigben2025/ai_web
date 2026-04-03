import { NextRequest } from 'next/server';
import { getAllConversationsWithMessages } from '@/lib/db';
import { sendWeeklySummary } from '@/lib/notify';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  // Verify Vercel cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const allConversations = await getAllConversationsWithMessages();

  // Filter to last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recent = allConversations.filter(
    (c) => new Date(c.created_at + 'Z') >= sevenDaysAgo
  );

  const hot = recent.filter((c) => c.prospect_status === 'hot').length;
  const warm = recent.filter((c) => c.prospect_status === 'warm').length;

  await sendWeeklySummary({
    total: recent.length,
    hot,
    warm,
    leads: recent
      .filter((c) => c.prospect_status === 'hot' || c.prospect_status === 'warm')
      .map((c) => ({
        name: c.user_name,
        phone: c.user_phone,
        location: c.user_location,
        prospect_status: c.prospect_status,
        created_at: c.created_at,
      })),
  });

  return new Response(JSON.stringify({ ok: true, sent: recent.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
