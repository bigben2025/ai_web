import { Resend } from 'resend';

export async function sendHotLeadAlert(lead: {
  name: string | null;
  phone: string | null;
  location: string | null;
  service_interest: string | null;
  summary: string | null;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.NOTIFICATION_EMAIL;
  if (!apiKey || !toEmail) return; // silently skip if not configured

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from: 'Care Assistant <notifications@conciergecarefl.com>',
    to: toEmail,
    subject: `🔥 Hot Lead: ${lead.name || 'New Visitor'}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
        <h2 style="color:#dc2626;margin:0 0 16px">🔥 New Hot Lead</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px 0;color:#6b7280;width:140px">Name</td><td style="padding:8px 0;font-weight:600">${lead.name || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Phone</td><td style="padding:8px 0;font-weight:600">${lead.phone || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Location</td><td style="padding:8px 0">${lead.location || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Service</td><td style="padding:8px 0">${lead.service_interest || '—'}</td></tr>
          ${lead.summary ? `<tr><td style="padding:8px 0;color:#6b7280">Summary</td><td style="padding:8px 0;font-style:italic">"${lead.summary}"</td></tr>` : ''}
        </table>
        <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://your-app.vercel.app'}/admin" style="display:inline-block;margin-top:20px;background:#0d9488;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">View in Dashboard</a>
      </div>
    `,
  });
}

export async function sendWeeklySummary(stats: {
  total: number;
  hot: number;
  warm: number;
  leads: Array<{ name: string | null; phone: string | null; location: string | null; prospect_status: string | null; created_at: string }>;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.NOTIFICATION_EMAIL;
  if (!apiKey || !toEmail) return;

  const resend = new Resend(apiKey);
  const weekOf = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const rows = stats.leads
    .map(
      (l) => `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6">${l.name || 'Anonymous'}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6">${l.phone || '—'}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6">${l.location || '—'}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6">${l.prospect_status === 'hot' ? '🔥 Hot' : l.prospect_status === 'warm' ? '🌤 Warm' : '—'}</td>
      </tr>`
    )
    .join('');

  await resend.emails.send({
    from: 'Care Assistant <notifications@conciergecarefl.com>',
    to: toEmail,
    subject: `Weekly Lead Summary — Week of ${weekOf}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#0d9488;margin:0 0 8px">Weekly Lead Summary</h2>
        <p style="color:#6b7280;margin:0 0 24px">Week of ${weekOf}</p>
        <div style="display:flex;gap:16px;margin-bottom:24px">
          <div style="flex:1;background:#f0fdf4;border-radius:12px;padding:16px;text-align:center">
            <div style="font-size:28px;font-weight:700;color:#16a34a">${stats.total}</div>
            <div style="color:#6b7280;font-size:13px">Total Chats</div>
          </div>
          <div style="flex:1;background:#fef2f2;border-radius:12px;padding:16px;text-align:center">
            <div style="font-size:28px;font-weight:700;color:#dc2626">${stats.hot}</div>
            <div style="color:#6b7280;font-size:13px">Hot Leads</div>
          </div>
          <div style="flex:1;background:#fff7ed;border-radius:12px;padding:16px;text-align:center">
            <div style="font-size:28px;font-weight:700;color:#ea580c">${stats.warm}</div>
            <div style="color:#6b7280;font-size:13px">Warm Leads</div>
          </div>
        </div>
        ${rows ? `
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead>
            <tr style="background:#f9fafb">
              <th style="padding:8px;text-align:left;color:#6b7280;font-weight:600">Name</th>
              <th style="padding:8px;text-align:left;color:#6b7280;font-weight:600">Phone</th>
              <th style="padding:8px;text-align:left;color:#6b7280;font-weight:600">Location</th>
              <th style="padding:8px;text-align:left;color:#6b7280;font-weight:600">Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>` : '<p style="color:#6b7280">No leads this week.</p>'}
        <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://your-app.vercel.app'}/admin" style="display:inline-block;margin-top:24px;background:#0d9488;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Open Dashboard</a>
      </div>
    `,
  });
}
