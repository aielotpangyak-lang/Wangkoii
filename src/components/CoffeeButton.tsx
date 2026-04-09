import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Coffee, ChevronRight, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CoffeeButton() {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();

  return (
    <motion.div
      drag
      dragMomentum={false}
      className="fixed bottom-24 right-6 z-50 flex items-center cursor-grab active:cursor-grabbing"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
    >
      <div className="flex items-center bg-white border border-border rounded-2xl shadow-lg overflow-hidden">
        <button
          onClick={() => navigate('/support')}
          className="flex items-center gap-3 p-3 hover:bg-muted transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-sm shrink-0">
            <Coffee className="w-5 h-5" />
          </div>
          
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <p className="text-xs font-black text-foreground uppercase tracking-widest pr-2">Buy me a Coffee</p>
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="h-16 px-2 border-l border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          {isExpanded ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </motion.div>
  );
}
