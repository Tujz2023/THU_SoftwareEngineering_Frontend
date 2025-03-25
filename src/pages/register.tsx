import { useState } from 'react';
import { useRouter } from 'next/router';
import { useDispatch } from 'react-redux';
import { setEmail, setToken } from '../redux/auth';
import { Typography, Card, Input, Button, Alert } from 'antd';

const { Title, Text } = Typography;

const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();
  const dispatch = useDispatch();

  const handleRegister = () => {
    if (password !== confirmPassword) {
      setErrorMessage('密码和确认密码不匹配');
      return;
    }

    fetch(`/api/account/reg`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userEmail,
        password,
        name: username,
      }),
    })
      .then((res) => res.json())
      .then((res) => {
        if (Number(res.code) === 0) {
          // 注册成功后直接登录
          dispatch(setToken(res.token)); // 保存 JWT 令牌到 Redux
          dispatch(setEmail(userEmail)); // 保存用户邮箱到 Redux
          alert('注册成功，已自动登录');
          router.push('/chat');
        } else {
          setErrorMessage(res.info);
        }
      })
      .catch((err) => setErrorMessage(`注册失败: ${err}`));
  };

  return (
    <div
      className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-green-400 to-blue-500"
      style={{ position: 'relative', padding: '50px 20px' }} // 添加 position: relative 以便定位右侧卡片
    >
      {/* 注册组件 */}
      <div className="flex flex-col items-center">
        <Title
          level={1}
          className="text-5xl font-extrabold mb-12 bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-green-300"
          style={{
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            backgroundImage: 'linear-gradient(to right, #facc15, #4ade80)',
          }}
        >
          📝 注册新用户
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
          {errorMessage && (
            <Alert
              message={errorMessage}
              type="error"
              showIcon
              closable
              onClose={() => setErrorMessage('')}
              style={{ marginBottom: '1rem' }}
            />
          )}
          <Input
            type="text"
            placeholder="用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mb-4"
            style={{
              padding: '0.75rem',
              borderRadius: '1rem',
              marginBottom: '1rem',
            }}
          />
          <Input
            type="email"
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
            className="mb-4"
            style={{
              padding: '0.75rem',
              borderRadius: '1rem',
              marginBottom: '1rem',
            }}
          />
          <Input.Password
            placeholder="确认密码"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mb-6"
            style={{
              padding: '0.75rem',
              borderRadius: '1rem',
              marginBottom: '1.5rem',
            }}
          />

          <Button
            type="primary"
            onClick={handleRegister}
            style={{
              backgroundColor: '#4ade80',
              borderColor: '#4ade80',
              padding: '0.5rem 1.5rem',
              borderRadius: '1rem',
              width: '100%',
            }}
          >
            注册
          </Button>
        </Card>
      </div>

      {/* 账号规则卡片 */}
      <Card
        className="absolute"
        style={{
          position: 'absolute',
          top: '50%',
          right: '5%',
          transform: 'translateY(-50%)', // 垂直居中
          background: '#fff',
          padding: '1.5rem',
          borderRadius: '1rem',
          boxShadow: '0 5px 15px rgba(0, 0, 0, 0.1)',
          width: '20rem',
          textAlign: 'left',
          color: '#4b5563',
        }}
      >
        <Title level={4} style={{ color: '#16a34a', marginBottom: '0.5rem' }}>
          📌 账号规则
        </Title>
        <Text style={{ display: 'block', marginBottom: '0.5rem' }}>
          ✅ 用户名可包含任何 UTF-8 字符，长度 ≤ 20
        </Text>
        <Text style={{ display: 'block' }}>
          ✅ 密码只能由字母、数字及下划线组成，长度 ≤ 20
        </Text>
      </Card>
    </div>
  );
};

export default RegisterPage;