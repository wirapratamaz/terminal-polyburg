'use client';

import { useEffect, useState } from 'react';
import VisualEditsMessenger from '../visual-edits/VisualEditsMessenger';

export default function ClientOnlyVisualEdits() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return <VisualEditsMessenger />;
}