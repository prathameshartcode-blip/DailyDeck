'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Send, Play, Pause, AlertCircle, CheckCircle2, Lock, KeyRound } from 'lucide-react';

export default function CampaignsPage() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, [supabase]);

  // SMTP Settings State
  const [smtpEmail, setSmtpEmail] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpSenderName, setSmtpSenderName] = useState('');
  const [showSmtpSettings, setShowSmtpSettings] = useState(false);

  // Load SMTP settings from local storage on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('smtpEmail');
    const savedPassword = localStorage.getItem('smtpPassword');
    const savedName = localStorage.getItem('smtpSenderName');
    if (savedEmail) setSmtpEmail(savedEmail);
    if (savedPassword) setSmtpPassword(savedPassword);
    if (savedName) setSmtpSenderName(savedName);
  }, []);

  // Save SMTP settings to local storage when they change
  useEffect(() => {
    if (smtpEmail) localStorage.setItem('smtpEmail', smtpEmail);
    if (smtpPassword) localStorage.setItem('smtpPassword', smtpPassword);
    if (smtpSenderName) localStorage.setItem('smtpSenderName', smtpSenderName);
  }, [smtpEmail, smtpPassword, smtpSenderName]);

  // Form State
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipients, setRecipients] = useState('');
  
  // Campaign State
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [isRelayActive, setIsRelayActive] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Progress State
  const [status, setStatus] = useState({ total: 0, pending: 0, sent: 0, failed: 0, campaign_status: '' });
  const [lastEmailSent, setLastEmailSent] = useState<string>('');
  const [relayError, setRelayError] = useState<string | null>(null);
  
  // Timer ref to prevent overlapping relays
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // Polling interval ref so we can stop it when campaign completes
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Poll status every 3 seconds if active
  useEffect(() => {
    if (!activeCampaignId) return;

    const fetchStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`/api/campaigns/status?campaign_id=${activeCampaignId}`, {
          headers: { Authorization: `Bearer ${session?.access_token}` }
        });
        const data = await res.json();
        if (data.error) return;
        setStatus({
          total: data.total,
          pending: data.pending,
          sent: data.sent,
          failed: data.failed,
          campaign_status: data.campaign_status
        });
        
        if (data.campaign_status === 'completed') {
          setIsRelayActive(false);
          // Stop polling — campaign is done, no need to keep calling the API
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      } catch (err) {
        console.error('Failed to fetch status:', err);
      }
    };

    fetchStatus(); // initial
    pollRef.current = setInterval(fetchStatus, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeCampaignId]);

  // Client-Side Relay Loop
  useEffect(() => {
    if (!isRelayActive || !activeCampaignId) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const sendNext = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/campaigns/send-next', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({ 
            campaign_id: activeCampaignId,
            smtp_user: smtpEmail,
            smtp_pass: smtpPassword,
            smtp_sender_name: smtpSenderName || smtpEmail
          })
        });
        
        const data = await res.json();

        // Hard stop: SMTP auth failure or server error
        if (data.status === 'smtp_error' || data.error) {
          setRelayError(data.error || 'An unknown server error occurred.');
          setIsRelayActive(false);
          return;
        }
        
        if (data.status === 'completed') {
          setIsRelayActive(false);
          return;
        }

        if (data.status === 'sent_one') {
          setLastEmailSent(data.processed_email);
          setRelayError(null); // clear any previous error on success
        }

        // Wait 6 seconds before triggering the next one
        if (isRelayActive) {
          timerRef.current = setTimeout(sendNext, 6000);
        }
      } catch (error) {
        console.error('Relay error:', error);
        // On network error, wait a bit longer then try again
        if (isRelayActive) {
          timerRef.current = setTimeout(sendNext, 10000);
        }
      }
    };

    // Start the loop
    sendNext();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isRelayActive, activeCampaignId, smtpEmail, smtpPassword]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim() || !recipients.trim() || !user) return;
    if (!smtpEmail || !smtpPassword) {
      alert("Please configure your Gmail SMTP settings first.");
      setShowSmtpSettings(true);
      return;
    }
    
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/campaigns/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          subject,
          content: body,
          recipients,
          user_id: user.id,
          reply_to: smtpEmail
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setActiveCampaignId(data.campaign_id);
        setIsRelayActive(true); // Kick off the relay
      } else {
        alert(data.error || 'Failed to create campaign');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while creating campaign');
    } finally {
      setCreating(false);
    }
  };

  const percentComplete = status.total > 0 ? Math.round(((status.sent + status.failed) / status.total) * 100) : 0;
  const isSmtpConfigured = smtpEmail.length > 0 && smtpPassword.length > 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans relative">
      {/* Dev Stats Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#242930] gap-2 font-mono text-xs text-zinc-400">
        <div className="flex items-center gap-1">
          <span className="text-[#89295E] font-bold">&gt;</span>
          <span>bulk_mail_relay:</span>
          <span className="text-zinc-200 ml-1">
            {isRelayActive ? 'RUNNING' : 'IDLE'}
          </span>
        </div>
        <button 
          onClick={() => setShowSmtpSettings(!showSmtpSettings)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${
            isSmtpConfigured ? 'text-[#7FE7C4] hover:bg-[#7FE7C4]/10' : 'text-[#E8B54D] hover:bg-[#E8B54D]/10'
          }`}
        >
          <Lock className="w-3 h-3" />
          <span className="text-[10px] uppercase tracking-widest font-bold">
            {isSmtpConfigured ? 'SMTP CONFIGURED' : 'CONFIGURE SMTP'}
          </span>
        </button>
      </div>

      {/* SMTP Settings Panel */}
      {showSmtpSettings && (
        <div className="bg-[#1F2329] p-4 border border-[#242930] rounded-xl flex flex-col gap-4 mb-4">
          <div className="flex items-center gap-2 font-mono text-xs text-zinc-400 uppercase font-bold tracking-wider">
            <KeyRound className="w-4 h-4 text-[#E8B54D]" />
            Local SMTP Settings (Bring Your Own Key)
          </div>
          <p className="text-xs text-zinc-500 font-mono">
            Credentials are securely stored in your browser's local storage and injected directly into the active memory of the relay process. They are never saved to the database.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Sender Name</label>
              <input
                type="text"
                value={smtpSenderName}
                onChange={(e) => setSmtpSenderName(e.target.value)}
                placeholder="e.g. John from Acme"
                className="w-full bg-[#15181D] px-3 py-2 rounded border border-[#242930] outline-none focus:border-[#E8B54D]/50 text-sm text-zinc-200 font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Gmail Address</label>
              <input
                type="email"
                value={smtpEmail}
                onChange={(e) => setSmtpEmail(e.target.value)}
                placeholder="you@gmail.com"
                className="w-full bg-[#15181D] px-3 py-2 rounded border border-[#242930] outline-none focus:border-[#E8B54D]/50 text-sm text-zinc-200 font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Gmail App Password</label>
              <input
                type="password"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                placeholder="16-character app password"
                className="w-full bg-[#15181D] px-3 py-2 rounded border border-[#242930] outline-none focus:border-[#E8B54D]/50 text-sm text-zinc-200 font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {!activeCampaignId ? (
        // CAMPAIGN CREATION FORM
        <form onSubmit={handleCreate} className="bg-[#15181D] p-5 border border-[#242930] rounded-xl space-y-5">
          <div className="flex items-center gap-2 font-mono text-xs text-zinc-400 uppercase font-bold tracking-wider mb-2 pb-3 border-b border-[#242930]">
            <Send className="w-4 h-4 text-[#89295E]" />
            New Email Campaign
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email Subject..."
                className="w-full bg-[#1F2329] px-3 py-2.5 rounded border border-[#242930] outline-none focus:border-zinc-700 text-sm text-zinc-200 placeholder:text-zinc-600 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Body Content</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your email body here..."
                className="w-full h-40 bg-[#1F2329] px-3 py-2.5 rounded border border-[#242930] outline-none focus:border-zinc-700 text-sm text-zinc-200 placeholder:text-zinc-600 font-sans resize-none leading-relaxed"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider mb-1.5 flex justify-between">
                <span>Recipients (Comma Separated)</span>
                <span className="text-[#E8B54D]">Paste up to 4,000 emails</span>
              </label>
              <textarea
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                placeholder="email1@test.com, email2@test.com..."
                className="w-full h-24 bg-[#1F2329] px-3 py-2.5 rounded border border-[#242930] outline-none focus:border-zinc-700 text-sm text-zinc-400 placeholder:text-zinc-700 font-mono resize-none leading-relaxed"
                required
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={creating || !isSmtpConfigured}
              className="w-full py-3 rounded bg-[#89295E] hover:bg-[#a03672] text-white text-xs font-bold font-mono tracking-widest uppercase transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {!isSmtpConfigured ? 'CONFIGURE SMTP FIRST' : creating ? 'INITIALIZING...' : 'START CAMPAIGN QUEUE'}
            </button>
          </div>
        </form>
      ) : (
        // PROGRESS MONITOR
        <div className="bg-[#15181D] p-6 border border-[#242930] rounded-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#242930]">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Campaign Status</span>
              <h2 className="text-xl font-bold text-zinc-200 truncate pr-4 max-w-md">{subject || 'Untitled'}</h2>
            </div>
            
            <div className="flex gap-2">
              {status.campaign_status !== 'completed' && (
                <button
                  onClick={() => setIsRelayActive(!isRelayActive)}
                  className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-mono font-bold uppercase tracking-wider transition-colors ${
                    isRelayActive 
                      ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20' 
                      : 'bg-[#7FE7C4]/10 text-[#7FE7C4] hover:bg-[#7FE7C4]/20 border border-[#7FE7C4]/20'
                  }`}
                >
                  {isRelayActive ? <><Pause className="w-3.5 h-3.5" /> Pause Relay</> : <><Play className="w-3.5 h-3.5" /> Resume Relay</>}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between font-mono text-[10px] uppercase font-bold tracking-wider">
              <span className="text-zinc-400">Progress: {percentComplete}%</span>
              <span className="text-zinc-500">{status.sent + status.failed} / {status.total} processed</span>
            </div>
            
            <div className="w-full h-3 bg-[#1F2329] rounded-full overflow-hidden border border-[#242930]">
              <div 
                className="h-full bg-[#89295E] transition-all duration-1000 ease-out"
                style={{ width: `${percentComplete}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className="bg-[#1F2329] border border-[#242930] rounded p-3 flex flex-col items-center">
                <span className="text-[10px] font-mono text-zinc-500 uppercase font-bold tracking-wider mb-1">Sent</span>
                <span className="text-xl font-bold text-[#7FE7C4]">{status.sent}</span>
              </div>
              <div className="bg-[#1F2329] border border-[#242930] rounded p-3 flex flex-col items-center">
                <span className="text-[10px] font-mono text-zinc-500 uppercase font-bold tracking-wider mb-1">Pending</span>
                <span className="text-xl font-bold text-[#E8B54D]">{status.pending}</span>
              </div>
              <div className="bg-[#1F2329] border border-[#242930] rounded p-3 flex flex-col items-center">
                <span className="text-[10px] font-mono text-zinc-500 uppercase font-bold tracking-wider mb-1">Failed</span>
                <span className="text-xl font-bold text-red-400">{status.failed}</span>
              </div>
            </div>
          </div>

          {/* Activity Log terminal style */}
          <div className="mt-6 bg-[#0D0F12] border border-[#242930] rounded p-3 font-mono text-[10px] space-y-1">
            <div className="text-zinc-500 uppercase font-bold tracking-widest mb-2 border-b border-[#242930] pb-2">
              Live Relay Feed
            </div>
            {relayError ? (
              <div className="text-red-400 flex flex-col gap-1">
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  RELAY STOPPED — ERROR
                </div>
                <p className="text-red-300/80 pl-5 leading-relaxed break-all">{relayError}</p>
              </div>
            ) : isRelayActive ? (
              <div className="text-[#E8B54D] animate-pulse flex items-center gap-2">
                <span className="w-2 h-2 bg-[#E8B54D] rounded-full" />
                Processing queue... (6s pace)
              </div>
            ) : status.campaign_status === 'completed' ? (
              <div className="text-[#7FE7C4] flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3" />
                Campaign finished.
              </div>
            ) : (
              <div className="text-red-400 flex items-center gap-2">
                <Pause className="w-3 h-3" />
                Relay paused. Click resume to continue.
              </div>
            )}
            {lastEmailSent && (
              <div className="text-zinc-400 mt-2">
                <span className="text-[#7FE7C4]">&gt; sent_success:</span> {lastEmailSent}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
