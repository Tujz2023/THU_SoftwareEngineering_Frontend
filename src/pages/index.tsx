import { useState } from 'react';
import { useRouter } from 'next/router';
import { setEmail, setToken } from "../redux/auth";
import { useDispatch } from "react-redux";
import { FAILURE_PREFIX, LOGIN_FAILED, LOGIN_SUCCESS_PREFIX } from '../constants/string';
import { Typography, Card, Input, Button } from 'antd';

const { Title, Text } = Typography;

const WelcomePage = () => {
  const [userEmail, setUserEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const dispatch = useDispatch();

  const handleLogin = () => {
    fetch(`/api/account/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        "email": userEmail,
        password
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
          alert(LOGIN_FAILED + res.info)
        }
      })
      .catch((err) => alert(FAILURE_PREFIX + err));
  };

  const handleRegister = () => {
    router.push('/register');
  };

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-400 to-blue-500">
      <Title
        level={1}
        className="text-5xl font-extrabold mb-12 bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-blue-300"
        style={{
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
          backgroundImage: 'linear-gradient(to right, #ec4899, #93c5fd)',
        }}
      >
        🚀 欢迎来到即时通讯系统 🎉
      </Title>

      <Card
        className="w-96"
        style={{
          padding: '2.5rem',
          borderRadius: '1.5rem',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
        }}
      >
        <Input
          type="text"
          placeholder="邮箱"
          value={userEmail}
          onChange={(e) => setUserEmail(e.target.value)}
          className="mb-4"
          style={{
            padding: '0.75rem',
            borderRadius: '1rem',
            marginBottom: '1rem',
          }}
        />
        <Input.Password
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-6"
          style={{
            padding: '0.75rem',
            borderRadius: '1rem',
            marginBottom: '1.5rem',
          }}
        />

        <div className="flex justify-between w-full">
          <Button
            type="primary"
            onClick={handleLogin}
            style={{
              backgroundColor: '#3b82f6',
              borderColor: '#3b82f6',
              padding: '0.5rem 1.5rem',
              borderRadius: '1rem',
            }}
          >
            登录
          </Button>
          <Button
            type="link"
            onClick={handleRegister}
            style={{
              color: '#3b82f6',
              textDecoration: 'underline',
            }}
          >
            还没有用户名？点击注册
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default WelcomePage;