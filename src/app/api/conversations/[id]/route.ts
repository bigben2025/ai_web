import { NextRequest } from 'next/server';
import { updateFollowUpStatus } from '@/lib/db';

export const runtime = 'nodejs';

function checkAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7);
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  return token === adminPassword;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id } = await params;
  const body = await req.json();
  const { follow_up_status } = body;

  const valid = ['not_contacted', 'called', 'no_answer', 'appointment_set'];
  if (!follow_up_status || !valid.includes(follow_up_status)) {
    return new Response(JSON.stringify({ error: 'Invalid status' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await updateFollowUpStatus(id, follow_up_status);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
