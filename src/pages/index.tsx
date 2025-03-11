import { useState } from 'react';
import { motion } from 'framer-motion';

const WelcomePage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    alert(`登录尝试：用户名 - ${username}，密码 - ${password}`);
  };

  const handleRegister = () => {
    alert('前往注册页面（功能暂未实现）');
  };

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-400 to-blue-500">
      <motion.h1
        className="text-5xl font-extrabold mb-12 bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-blue-300"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        🚀 欢迎来到即时通讯系统 🎉
      </motion.h1>

      <motion.div
        className="bg-white p-10 rounded-3xl shadow-2xl w-96 flex flex-col items-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <input
          type="text"
          placeholder="用户名"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-3 mb-4 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <input
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 mb-6 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <div className="flex justify-between w-full">
          <button
            onClick={handleLogin}
            className="bg-blue-500 text-white py-2 px-6 rounded-2xl hover:bg-blue-600 transition-transform transform hover:scale-105"
          >
            登录
          </button>
          <button
            onClick={handleRegister}
            className="text-blue-500 hover:underline"
          >
            还没有用户名？点击注册
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default WelcomePage;
