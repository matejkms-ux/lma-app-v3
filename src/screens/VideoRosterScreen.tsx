import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRoster } from '../data/api';
import type { User } from '../data/mock';
import { colors, fonts, radius } from '../tokens';

/**
 * VideoRosterScreen — pick an adventurer to open their live room, mirroring the
 * Companion (LC) app's card roster. Each card enters /session/<topic>?host=1.
 * topic = username with the language suffix dropped, lowercased (e.g.
 * WONCHAKL2401-ja → wonchakl2401), matching the per-learner room scheme.
 */
const toSessionId = (u?: string) => (u || '').replace(/-[a-z]{2}$/i, '').toLowerCase();

export default function VideoRosterScreen() {
  const nav = useNavigate();
  const [users, setUsers] = useState<User[] | null>(null);

  useEffect(() => {
    let live = true;
    getRoster().then((r) => {
      if (live) setUsers(r.filter((u) => u.username && !String(u.id).startsWith('qa-')));
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: colors.emerald, color: colors.cream, fontFamily: fonts.sans }}>
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '40px 28px 64px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.42em', color: colors.teal }}>L · M · A</span>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.22em', color: colors.cream, background: colors.coral, padding: '5px 10px', borderRadius: 999 }}>
            VIDEO
          </span>
        </div>

        <h1 style={{ fontFamily: fonts.serif, fontStyle: 'italic', fontWeight: 500, fontSize: 40, lineHeight: 1.05, marginTop: 34 }}>
          Start a session
        </h1>
        <p style={{ color: colors.teal, fontSize: 15, marginTop: 10 }}>Pick an adventurer to open their live room.</p>

        {!users ? (
          <p style={{ marginTop: 48, fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 20, color: colors.teal }}>
            Loading adventurers…
          </p>
        ) : users.length === 0 ? (
          <p style={{ marginTop: 48, fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 20, color: colors.teal }}>
            No adventurers found.
          </p>
        ) : (
          <div style={{ marginTop: 36, display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {users.map((u) => {
              const display = u.calledName || u.firstName || u.name || u.username;
              const sid = toSessionId(u.username);
              return (
                <button
                  key={u.id}
                  onClick={() => nav(`/session/${encodeURIComponent(sid)}?host=1`)}
                  style={{
                    textAlign: 'left',
                    cursor: 'pointer',
                    background: colors.emerald2,
                    border: `1px solid ${colors.teal}29`,
                    borderRadius: radius.card,
                    padding: 22,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    color: 'inherit',
                  }}
                >
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontFamily: fonts.serif, fontSize: 26, lineHeight: 1.1 }}>{display}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.14em', color: colors.teal }}>
                      {(u.language || '').toUpperCase()}
                    </span>
                  </span>
                  <span style={{ color: colors.coral, fontWeight: 600, fontSize: 14 }}>Start session →</span>
                </button>
              );
            })}
          </div>
        )}

        <p style={{ marginTop: 48, fontSize: 12, color: colors.tealDim ?? colors.teal, lineHeight: 1.6 }}>
          Host view. The adventurer joins the same room from their own link.
        </p>
      </div>
    </div>
  );
}
