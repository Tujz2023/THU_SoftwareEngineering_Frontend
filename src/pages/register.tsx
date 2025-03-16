import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';

const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const router = useRouter();

  const handleRegister = () => {
    if (password !== confirmPassword) {
      alert('密码和确认密码不匹配');
      return;
    }
    alert(`注册成功：用户名 - ${username}，邮箱 - ${email}`);
    router.push('/');
  };

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-400 to-blue-500">
      <motion.h1
        className="text-5xl font-extrabold mb-12 bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-green-300"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        📝 注册新用户
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
          className="w-full p-3 mb-4 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-400"
        />
        <input
          type="email"
          placeholder="邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 mb-4 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-400"
        />
        <input
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 mb-4 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-400"
        />
        <input
          type="password"
          placeholder="确认密码"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full p-3 mb-6 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-400"
        />

        <button
          onClick={handleRegister}
          className="bg-green-500 text-white py-2 px-6 rounded-2xl hover:bg-green-600 transition-transform transform hover:scale-105"
        >
          注册
        </button>
      </motion.div>
    </div>
  );
};

export default RegisterPage;