import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const body = await req.json();
    const { campaign_id, smtp_user, smtp_pass, smtp_sender_name } = body;

    if (!campaign_id) {
      return NextResponse.json({ error: 'Missing campaign_id' }, { status: 400 });
    }
    if (!smtp_user || !smtp_pass) {
      return NextResponse.json({ error: 'Missing SMTP credentials' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || '' } }
    });

    // 1. Fetch campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();

    if (campaignError) {
      return NextResponse.json({ error: `Campaign fetch failed: ${campaignError.message}` }, { status: 404 });
    }
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    if (campaign.status === 'completed') {
      return NextResponse.json({ status: 'completed', message: 'Campaign already completed' });
    }

    // 2. Fetch next pending recipient
    const { data: nextRecipient, error: queueError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('campaign_id', campaign_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (queueError && queueError.code === 'PGRST116') {
      await supabase
        .from('email_campaigns')
        .update({ status: 'completed' })
        .eq('id', campaign_id);
      return NextResponse.json({ status: 'completed', message: 'All emails sent' });
    }
    if (queueError) throw queueError;

    // 3. Build transporter
    const cleanPass = smtp_pass.replace(/\s/g, '');
    const senderName = smtp_sender_name || smtp_user;
    const domain = smtp_user.split('@')[1] || 'gmail.com';

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: smtp_user,
        pass: cleanPass,
      },
      tls: { rejectUnauthorized: false }
    });

    // 4. Verify SMTP credentials
    try {
      await transporter.verify();
    } catch (verifyErr: any) {
      await supabase
        .from('email_queue')
        .update({ status: 'failed', error_message: `SMTP Auth Failed: ${verifyErr.message}` })
        .eq('id', nextRecipient.id);

      return NextResponse.json({ 
        status: 'smtp_error', 
        error: `SMTP Authentication Failed. Check your Gmail address and App Password. Error: ${verifyErr.message}` 
      });
    }

    // 5. Send as plain text only — no HTML, no bulk headers.
    // This is the single most effective way to land in Primary inbox.
    // Gmail's Promotions filter is triggered by: HTML templates, List-Unsubscribe,
    // Precedence:bulk, and marketing-style formatting. Plain text avoids all of them.
    try {
      await transporter.sendMail({
        from: `"${senderName}" <${smtp_user}>`,
        to: nextRecipient.recipient_email,
        replyTo: `"${senderName}" <${smtp_user}>`,
        subject: campaign.subject,
        // Plain text ONLY — no html property at all.
        // Having no html key forces Gmail to treat this as a personal email.
        text: campaign.body,
        headers: {
          // Unique Message-ID per recipient avoids duplicate/spam detection
          'Message-ID': `<${crypto.randomUUID()}@${domain}>`,
          // Do NOT add: List-Unsubscribe, Precedence:bulk, X-Mailer
          // Those headers are exactly what Gmail uses to route to Promotions.
        }
      });

      await supabase
        .from('email_queue')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', nextRecipient.id);

    } catch (emailError: any) {
      console.error('Email send error:', emailError);
      await supabase
        .from('email_queue')
        .update({ status: 'failed', error_message: emailError.message })
        .eq('id', nextRecipient.id);
    }

    return NextResponse.json({ 
      status: 'sent_one', 
      processed_email: nextRecipient.recipient_email 
    });

  } catch (error: any) {
    console.error('Send next error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
