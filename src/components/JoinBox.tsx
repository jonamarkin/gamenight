'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/** Room-code box on the landing page. Hands the code to /play, where the name is asked. */
export function JoinBox() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const clean = code.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  return (
    <form
      className="joinbox"
      onSubmit={(e) => {
        e.preventDefault();
        if (clean.length >= 3) router.push(`/play?code=${encodeURIComponent(clean)}`);
      }}
    >
      <label className="sr-only" htmlFor="hero-code">Room code</label>
      <input id="hero-code" value={code} placeholder="Got a room code?" autoCapitalize="characters" autoComplete="off" onChange={(e) => setCode(e.target.value)} />
      <button type="submit" disabled={clean.length < 3}>Join</button>
    </form>
  );
}
