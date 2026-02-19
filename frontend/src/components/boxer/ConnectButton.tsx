import React, { useState } from 'react';
import { UserPlus, Clock, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui';

type ConnectState = 'idle' | 'pending' | 'connected';

interface ConnectButtonProps {
  onConnect: () => void;
  initialState?: ConnectState;
}

export const ConnectButton: React.FC<ConnectButtonProps> = ({
  onConnect,
  initialState = 'idle',
}) => {
  const [state, setState] = useState<ConnectState>(initialState);

  const handleClick = () => {
    onConnect();
    setState('pending');
  };

  if (state === 'connected') {
    return (
      <Button variant="outline" disabled className="text-green-600 border-green-600">
        <UserCheck className="h-4 w-4 mr-2" />
        Connected
      </Button>
    );
  }

  if (state === 'pending') {
    return (
      <Button variant="secondary" disabled>
        <Clock className="h-4 w-4 mr-2" />
        Request Sent
      </Button>
    );
  }

  return (
    <Button onClick={handleClick}>
      <UserPlus className="h-4 w-4 mr-2" />
      Connect
    </Button>
  );
};
