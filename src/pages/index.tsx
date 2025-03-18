import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import { setEmail, setToken } from "../redux/auth";
import { useDispatch } from "react-redux";
import { BACKEND_URL, FAILURE_PREFIX, LOGIN_FAILED, LOGIN_SUCCESS_PREFIX } from '../constants/string';

const WelcomePage = () => {
  const [userEmail, setUserEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const dispatch = useDispatch();

  const handleLogin = () => {
    fetch(`${BACKEND_URL}/acount/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userEmail,
        password,
      }),
    })
      .then((res) => res.json())
      .then((res) => {
        if (Number(res.code) === 0) {
          dispatch(setToken(res.token));
          dispatch(setEmail(userEmail));
          alert(LOGIN_SUCCESS_PREFIX + userEmail);
          router.push('/chat');
        } else {
          alert("登陆失败：" + res.info)
        }
      })
      .catch((err) => alert(FAILURE_PREFIX + err));
  };

  const handleRegister = () => {
    router.push('/register');
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
          placeholder="邮箱"
          value={userEmail}
          onChange={(e) => setUserEmail(e.target.value)}
          className="w-full p-3 mb-4 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-600 text-black"
        />
        <input
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 mb-6 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-600 text-black"
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
