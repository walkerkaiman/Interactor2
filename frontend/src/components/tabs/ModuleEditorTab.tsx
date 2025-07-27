import React from 'react';
import { motion } from 'framer-motion';
import { NodeEditor } from '@/components/editor/NodeEditor';

export const ModuleEditorTab: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full"
    >
      <NodeEditor />
    </motion.div>
  );
}; 