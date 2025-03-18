import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';

const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const router = useRouter();

  const handleRegister = () => {
    if (password !== confirmPassword) {
      alert('密码和确认密码不匹配');
      return;
    }

    fetch(`/api/account/reg`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        "email": userEmail,
        password,
        "name": username
      }),
    })
      .then((res) => res.json())
      .then((res) => {
        if (Number(res.code) === 0) {
          alert(res.message);
          router.push('/');
        } else {
          alert(res.info);
        }
      })
      .catch((err) => alert(`注册失败: ${err}`));
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
          className="w-full p-3 mb-4 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-400 placeholder-gray-600 text-black"
        />
        <input
          type="email"
          placeholder="邮箱"
          value={userEmail}
          onChange={(e) => setUserEmail(e.target.value)}
          className="w-full p-3 mb-4 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-400 placeholder-gray-600 text-black"
        />
        <input
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 mb-4 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-400 placeholder-gray-600 text-black"
        />
        <input
          type="password"
          placeholder="确认密码"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full p-3 mb-6 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-400 placeholder-gray-600 text-black"
        />

        <button
          onClick={handleRegister}
          className="bg-green-500 text-white py-2 px-6 rounded-2xl hover:bg-green-600 transition-transform transform hover:scale-105"
        >
          注册
        </button>
      </motion.div>
      <motion.div
        className="absolute top-1/2 right-10 transform -translate-y-1/2 bg-white p-6 rounded-xl shadow-lg w-64 text-gray-700"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-lg font-bold mb-2 text-green-600">📌 账号规则</h2>
        <p className="text-sm mb-1">✅ 用户名可包含任何UTF-8字符，长度≤20</p>
        <p className="text-sm">✅ 密码只能由字母、数字及下划线组成，长度≤20</p>
      </motion.div>
    </div>
  );
};

export default RegisterPage;