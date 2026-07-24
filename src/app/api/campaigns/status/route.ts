import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const { searchParams } = new URL(req.url);
    const campaign_id = searchParams.get('campaign_id');

    if (!campaign_id) {
      return NextResponse.json({ error: 'Missing campaign_id' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || '' } }
    });

    // 1. Get campaign status
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('status, subject')
      .eq('id', campaign_id)
      .single();

    if (campaignError) throw campaignError;

    // 2. Get queue counts via aggregate query
    // Supabase JS doesn't have a direct "group by count" helper that returns all at once simply,
    // so we'll fetch just the statuses and reduce them locally (fine for < 10k rows)
    const { data: queue, error: queueError } = await supabase
      .from('email_queue')
      .select('status')
      .eq('campaign_id', campaign_id);

    if (queueError) throw queueError;

    let pending = 0;
    let sent = 0;
    let failed = 0;

    queue.forEach((q: any) => {
      if (q.status === 'pending') pending++;
      if (q.status === 'sent') sent++;
      if (q.status === 'failed') failed++;
    });

    return NextResponse.json({
      campaign_status: campaign.status,
      subject: campaign.subject,
      total: queue.length,
      pending,
      sent,
      failed
    });

  } catch (error: any) {
    console.error('Status fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
