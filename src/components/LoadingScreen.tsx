'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Securing your session...' }) => {
  return (
    <div className="loading-overlay">
      <motion.div 
        className="loading-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="premium-spinner-container">
          <div className="premium-spinner"></div>
          <div className="spinner-center"></div>
        </div>
        
        <motion.div 
          className="loading-brand"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          PharmaCare
        </motion.div>
        
        <div className="loading-message">{message}</div>
      </motion.div>
    </div>
  );
};

export default LoadingScreen;
