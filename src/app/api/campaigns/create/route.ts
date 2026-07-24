import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client to bypass RLS for server-side operations
// In production, ensure these use the service_role key if bypassing RLS is needed,
// but for this internal tool, passing the auth header or using anon key with user_id works.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const body = await req.json();
    const { subject, content, recipients, user_id } = body;

    if (!subject || !content || !recipients || !user_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || '' } }
    });

    // 1. Create Campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .insert({
        subject,
        body: content,
        user_id,
        status: 'in_progress'
      })
      .select()
      .single();

    if (campaignError) throw campaignError;

    // 2. Parse Recipients (handles comma, newline, spaces)
    const emailList = recipients
      .split(/[\n,]+/)
      .map((e: string) => e.trim())
      .filter((e: string) => e.length > 0 && e.includes('@'));

    if (emailList.length === 0) {
      return NextResponse.json({ error: 'No valid email addresses found' }, { status: 400 });
    }

    // 3. Bulk Insert into Queue
    const queueData = emailList.map((email: string) => ({
      campaign_id: campaign.id,
      user_id,
      recipient_email: email,
      status: 'pending'
    }));

    // Supabase allows bulk inserts up to ~10,000 rows easily.
    const { error: queueError } = await supabase
      .from('email_queue')
      .insert(queueData);

    if (queueError) throw queueError;

    return NextResponse.json({ 
      success: true, 
      campaign_id: campaign.id,
      total_recipients: emailList.length 
    });

  } catch (error: any) {
    console.error('Create campaign error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
