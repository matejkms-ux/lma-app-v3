import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DeviceFrame } from '../components/DeviceFrame';
import { StatusBar } from '../components/StatusBar';
import { USERS, displayName } from '../data/mock';
import { getRoster } from '../data/api';
import { useAsync } from '../lib/useAsync';
import { useSession } from '../session';

/**
 * Entry — name select. No passwords; choosing your name is entry (v3 brief §4).
 * Pre-login, so there is no bottom nav here.
 */
export function EntryScreen() {
  const navigate = useNavigate();
  const { selectUser } = useSession();
  const [query, setQuery] = useState('');
  const { data: users } = useAsync(getRoster, USERS);

  const roster = users.filter((u) => {
    const q = query.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      (u.calledName?.toLowerCase().includes(q) ?? false) ||
      (u.firstName?.toLowerCase().includes(q) ?? false)
    );
  });

  const enter = (user: (typeof roster)[number]) => {
    selectUser(user);
    navigate('/lessons');
  };

  return (
    <DeviceFrame tone="dark">
      <StatusBar tone="dark" />

      <div className="px-7 pb-2 pt-9">
        <div className="text-[11px] font-bold tracking-[.42em] text-teal">L · M · A</div>
        <div className="mt-[18px] font-serif text-[36px] italic leading-[1.06] text-cream">
          Welcome back,
          <br />
          adventurer.
        </div>
        <div className="mt-2.5 text-sm text-teal">Choose your name to enter.</div>
      </div>

      <label className="mx-6 mb-2 mt-[18px] flex items-center gap-2.5 rounded-[14px] border border-teal/[.28] bg-teal/10 px-4 py-3">
        <span className="relative h-3.5 w-3.5 shrink-0 rounded-full border-[1.8px] border-teal">
          <span className="absolute -bottom-px -right-1 h-[1.8px] w-1.5 rotate-45 bg-teal" />
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find your name"
          className="w-full bg-transparent text-[13px] text-cream placeholder:text-teal focus:outline-none"
        />
      </label>

      <div className="scroll-region flex-1 px-6 pb-6 pt-1">
        {roster.map((u) => (
          <button
            key={u.id}
            onClick={() => enter(u)}
            className="flex w-full items-center gap-3.5 border-b border-teal/[.16] py-3.5 text-left"
          >
            <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-emerald2 font-serif text-xl text-teal">
              {(u.calledName ?? u.firstName ?? u.name)[0]}
            </span>
            <span className="flex-1">
              <span className="block font-serif text-[22px] leading-tight text-cream">{displayName(u)}</span>
              {u.username && (
                <span className="block text-[10.5px] font-semibold tracking-[.06em] text-teal/70">{u.username}</span>
              )}
            </span>
            <span className="text-[11px] font-semibold tracking-[.12em] text-teal">{u.language}</span>
            <span className="text-lg text-teal opacity-70">›</span>
          </button>
        ))}
        {roster.length === 0 && (
          <div className="py-8 text-center font-serif text-[15px] italic text-teal">No name like that on the roster.</div>
        )}
      </div>
    </DeviceFrame>
  );
}
