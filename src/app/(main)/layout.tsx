'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const tabs = [
  { href: '/daily-tasks', label: 'Daily Tasks' },
  { href: '/notes', label: 'Notes' },
  { href: '/task-date', label: 'Task & Date' },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
        <h1 className="font-semibold text-lg">DailyDeck</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-neutral-400 hover:text-white"
        >
          Log out
        </button>
      </header>

      <nav className="border-b border-neutral-800 px-4 flex gap-1">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 text-sm border-b-2 -mb-px ${
              pathname === tab.href
                ? 'border-white text-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <main className="p-4 max-w-5xl mx-auto">{children}</main>
    </div>
  );
}
