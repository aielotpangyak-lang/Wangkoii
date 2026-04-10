import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';

export default function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    // If we are at the root, or if the history stack is empty, go to home
    if (location.key === 'default') {
      navigate('/');
    } else {
      navigate(-1);
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={handleBack}
      className="rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="w-6 h-6" />
    </Button>
  );
}
