import React, { useState } from 'react';
import AdminDashboard from './components/AdminDashboard';
import { motion } from 'framer-motion';

// Exemplo de como usar o dashboard admin
const AdminApp = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Acesso Restrito</h1>
          <p className="text-gray-400 mb-6">Faça login para acessar o painel administrativo</p>
          <button className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600">
            Fazer Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <AdminDashboard />
    </motion.div>
  );
};

export default AdminApp;
