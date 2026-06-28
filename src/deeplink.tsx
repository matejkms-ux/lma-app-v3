import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from './session';
import { USERS } from './data/mock';

/**
 * Cross-app deep link. Sibling constellation apps (e.g. the Watching App's
 * "Do the lesson") hand us a learner + lesson via the URL:
 *
 *   ?u=<id|username>&lesson=<lesson_code>
 *
 * We resolve the learner by id OR username — other apps key on the username
 * (e.g. `MEHRAD2606-pt`), not our internal id (`u7`) — sign them in, jump
 * straight into that lesson, then strip the query so a reload doesn't replay the
 * hand-off. No params → no-op (normal boot / name-select).
 */
export function DeepLink() {
  const navigate = useNavigate();
  const { selectUser } = useSession();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const params = new URLSearchParams(window.location.search);
    const u = params.get('u');
    const lesson = params.get('lesson');
    if (!u && !lesson) return;

    if (u) {
      const key = u.toLowerCase();
      const match = USERS.find((x) => x.id.toLowerCase() === key || x.username?.toLowerCase() === key);
      if (match) selectUser(match);
    }

    // Drop the query so a refresh/back doesn't re-trigger the hand-off.
    window.history.replaceState({}, '', window.location.pathname);

    if (lesson) navigate('/practice', { state: { lessonCode: lesson } });
    else if (u) navigate('/home');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
