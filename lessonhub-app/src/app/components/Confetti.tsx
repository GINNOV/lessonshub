// file: src/app/components/Confetti.tsx
'use client';

import { useState, useEffect } from 'react';
import ReactConfetti from 'react-confetti';

export default function Confetti() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return (
    <ReactConfetti
      width={window.innerWidth}
      height={window.innerHeight}
      recycle={false}
      numberOfPieces={400}
      tweenDuration={10000}
    />
  );
}