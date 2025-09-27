import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function CounterButton() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex items-center justify-center p-6 bg-card border rounded-lg">
      <Button
        variant="default"
        onClick={() => setCount(count + 1)}
        className="text-lg px-6 py-3"
      >
        🚀 Clicked {count} times
      </Button>
    </div>
  );
}
