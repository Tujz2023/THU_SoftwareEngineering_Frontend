import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Typography, Card, Input, Button, Alert, message } from 'antd';
import { motion } from 'framer-motion'; // 引入 framer-motion
import Cookies from 'js-cookie'; // 引入 js-cookie 库
import { encrypt, decrypt } from '../utils/crypto';

const { Title, Text } = Typography;

const RegisterPage = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [username, setUsername] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');//确认密码
  const [verifyCode, setVerifyCode] = useState(''); // 用户输入的验证码
  const [savedVerifyCode, setSavedVerifyCode] = useState(''); // 保存的验证码
  const [verifyCodeExpiry, setVerifyCodeExpiry] = useState<Date | undefined>(undefined); // 验证码有效期
  const [isSendingCode, setIsSendingCode] = useState(false); // 是否正在发送验证码
  const [countdown, setCountdown] = useState(0); // 倒计时
  const [errorMessage, setErrorMessage] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
      // 检查 cookies 中是否已存在 jwtToken
      const jwtToken = Cookies.get('jwtToken');
      if (jwtToken) {
        setIsAuthenticated(true);
        router.push('/chat').then(() => setShowAlert(true));
      } else {
        setIsAuthenticated(false);
      }
    }, [router]);

    useEffect(() => {
      if (showAlert) {
        alert('您已登录，确认后将返回聊天界面');
        setShowAlert(false);
      }
    }, [showAlert]);
  

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000); // 每秒减少 1
      return () => clearTimeout(timer); // 清除定时器
    } else {
      setIsSendingCode(false); // 倒计时结束后启用按钮
    }
  }, [countdown]);

  const handleSendVerifyCode = async () => {
    if (!userEmail) {
      messageApi.open({
          type: 'error',
          content: "请先填写邮箱"
        });
      return;
    }

    setIsSendingCode(true); // 禁用按钮
    setCountdown(60); // 设置倒计时为 60 秒
    await fetch('api/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: userEmail }),
    })
      .then((res) => res.json())
      .then(async (res) => {
        if (res.code === 0) {
          const decrypted_code = await decrypt(res.verify_code);
          console.log(decrypted_code);
          setSavedVerifyCode(decrypted_code); // 保存加密后的验证码
          setVerifyCodeExpiry(new Date(Date.now() + 5 * 60 * 1000)); // 设置验证码有效期为5分钟
          messageApi.open({
          type: 'success',
          content: "验证码发送成功，5分钟内有效"
        });
        } else {
          messageApi.open({
          type: 'error',
          content: res.info || "验证码发送失败，请稍后重试"
        });
          setCountdown(0); // 如果发送失败，重置倒计时
          setIsSendingCode(false); // 启用按钮
        }
      })
      .catch(() => {
        messageApi.open({
          type: 'error',
          content: "网络错误，请稍后重试"
        });
        // setCountdown(0); // 如果发送失败，重置倒计时
        // setIsSendingCode(false); // 启用按钮
      });
  };

  const handleRegister = async () => {
    
    if (!savedVerifyCode || !verifyCodeExpiry || new Date() > verifyCodeExpiry) {
      messageApi.open({
          type: 'error',
          content: "验证码已失效或还未生成，请重新获取"
      });
      return;
    }

    if (verifyCode !== savedVerifyCode) {
      messageApi.open({
          type: 'error',
          content: "验证码不正确"
      });
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('密码和确认密码不匹配');
      return;
    }

    const encrypt_password = await encrypt(password);
    await fetch(`/api/account/reg`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        "email": userEmail,
        "password": encrypt_password,
        "name": username,
      }),
    })
      .then((res) => res.json())
      .then((res) => {
        if (Number(res.code) === 0) {
          // 注册成功后将 JWT Token 存储到 Cookie 中
          Cookies.set('jwtToken', res.token, { expires: 3 }); // 设置有效期为 3 天
          Cookies.set('userEmail', userEmail, { expires: 3 }); // 设置有效期为 3 天
          messageApi.open({
          type: 'success',
          content: "注册成功，自动登录中..."
          }).then(() => {router.push('/chat')});
        } else {
          setErrorMessage(res.info);
        }
      })
      .catch((err) => setErrorMessage(`注册失败: ${err}`));
  };

  const handleBackToLogin = () => {
    router.push('/');
  };

  if (isAuthenticated) {
    return <p>您已登录，正在跳转...</p>;
  }
  
  return (
    <>
      {contextHolder}
    <motion.div
      className="h-screen w-screen flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      style={{
        backgroundImage: 'url("/register.jpg")', // 替换为你的背景图像路径
        backgroundSize: 'cover', // 确保图像覆盖整个背景
        backgroundPosition: 'center', // 居中显示背景图像
        backgroundRepeat: 'no-repeat', // 防止背景图像重复
      }}
    >
          {/* 注册组件 */}
      <motion.div
        className="flex flex-col items-center"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
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
            backgroundColor: 'rgba(255, 255, 255, 0.8)', // 设置背景颜色并调整透明度
            opacity: 0.9, // 设置整体透明度
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
            className="mb-4"
            style={{
              padding: '0.75rem',
              borderRadius: '1rem',
              marginBottom: '1rem',
            }}
          />
<div className="flex items-center mb-4">
            <Input
              type="text"
              placeholder="验证码"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              style={{
                flex: 1,
                marginRight: '0.5rem',
                padding: '0.75rem',
                borderRadius: '1rem',
              }}
            />
            <Button
              type="primary"
              onClick={handleSendVerifyCode}
              disabled={isSendingCode}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '1rem',
              }}
            >
              {isSendingCode ? `已发送(${countdown}s)` : '发送验证码'}
            </Button>
          </div>

          <Button
            type="primary"
            onClick={handleRegister}
            style={{
              backgroundColor: '#4ade80',
              borderColor: '#4ade80',
              padding: '0.5rem 1.5rem',
              borderRadius: '1rem',
              width: '100%',
              marginBottom: '1rem',
            }}
          >
            注册
          </Button>

          <Button
            type="default"
            onClick={handleBackToLogin}
            style={{
              backgroundColor: '#fff',
              borderColor: '#d1d5db',
              color: '#4b5563',
              padding: '0.5rem 1.5rem',
              borderRadius: '1rem',
              width: '100%',
            }}
          >
            返回登录
          </Button>
        </Card>
      </motion.div>

      {/* 账号规则卡片 */}
      <motion.div
        initial={{ x: 0, opacity: 0 }} // 从页面中间开始
        animate={{ x: 330, opacity: 1 }} // 滑动到右侧固定位置并显示
        transition={{ duration: 0.8, delay: 0.5 }} // 动画持续时间和延迟
      >
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
            backgroundColor: 'rgba(255, 255, 255, 0.8)', // 设置背景颜色并调整透明度
            opacity: 0.9, // 设置整体透明度
          }}
        >
          <Title level={4} style={{ color: '#16a34a', marginBottom: '0.5rem' }}>
            📌 账号规则
          </Title>
          <Text style={{ display: 'block', marginBottom: '0.5rem' }}>
            ✅ 用户名可包含任何 UTF-8 字符，长度 ≤ 20
          </Text>
          <Text style={{ display: 'block' }}>
            ✅ 密码只能由字母、数字及下划线组成，长度 ≤ 12
          </Text>
        </Card>
      </motion.div>
      </motion.div>
      </>
  );
};

export default RegisterPage;