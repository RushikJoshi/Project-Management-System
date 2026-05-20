import React from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-surface-50 flex flex-col lg:flex-row">
      {/* Left branding panel - Now White */}
      <div className="hidden lg:flex lg:w-1/2 bg-white relative overflow-hidden flex-col items-center justify-center p-12">
        <div className="relative z-10 text-center max-w-2xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-2"
          >
            <img
              src="/logo_1 - Copy.jpeg"
              className="w-full max-w-[450px] h-auto object-contain mx-auto"
              alt="Gitakshmi Technologies"
            />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="font-display font-bold text-4xl leading-tight mb-4 text-surface-900"
          >
            Project Management System
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-surface-500 text-lg leading-relaxed max-w-md mx-auto"
          >
            Streamline your team's workflow with visual boards, smart tracking, and real-time collaboration.
          </motion.p>
        </div>
      </div>

      {/* Right form panel - Clean & Simple */}
      <div className="flex-1 flex items-center justify-center p-8 bg-brand-600 relative overflow-hidden">
        <div className="w-full max-w-md relative z-10">
          {/* Mobile logo - Now on blue */}
          <div className="flex items-center justify-center mb-10 lg:hidden">
            <div className="bg-white rounded-2xl p-4 shadow-xl">
              <img src="/logo_1 - Copy.jpeg" className="h-10 w-auto object-contain" alt="Logo" />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-surface-100"
          >
            <Outlet />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
