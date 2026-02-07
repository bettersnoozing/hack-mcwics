import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface AnimatedTabContentProps {
  activeKey: string;
  children: ReactNode;
}

export function AnimatedTabContent({ activeKey, children }: AnimatedTabContentProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeKey}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
