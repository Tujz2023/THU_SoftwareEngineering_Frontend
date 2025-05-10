import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Typography, Card, Input, Button, Alert, message, Spin, Divider } from 'antd';
import { motion } from 'framer-motion';
import Cookies from 'js-cookie';
import { encrypt, decrypt } from '../utils/crypto';
import { UserOutlined, MailOutlined, LockOutlined, SafetyOutlined, LoginOutlined, UserAddOutlined, CheckCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const RegisterPage = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [username, setUsername] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [savedVerifyCode, setSavedVerifyCode] = useState('');
  const [verifyCodeExpiry, setVerifyCodeExpiry] = useState<Date | undefined>(undefined);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  useEffect(() => {
      // 检查 cookies 中是否已存在 jwtToken
      const jwtToken = Cookies.get('jwtToken');
      if (jwtToken) {
        setInitialLoading(false);
        setIsAuthenticated(true);
        router.push('/chat').then(() => setShowAlert(true));
      } else {
        setIsAuthenticated(false);
        // 短暂延迟以显示加载动画
        setTimeout(() => {
          setInitialLoading(false);
        }, 800);
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
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setIsSendingCode(false);
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

    setIsSendingCode(true);
    setCountdown(60);
    
    const csrfToken = Cookies.get('csrftoken');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken;
    }
    else {
      messageApi.error('CSRF错误');
      return ;
    }
    await fetch('api/verify', {
      method: 'POST',
      headers,
      body: JSON.stringify({ email: userEmail }),
      credentials: 'include',
    })
      .then((res) => res.json())
      .then(async (res) => {
        if (res.code === 0) {
          const decrypted_code = await decrypt(res.verify_code);
          // console.log(decrypted_code);
          setSavedVerifyCode(decrypted_code);
          setVerifyCodeExpiry(new Date(Date.now() + 5 * 60 * 1000));
          messageApi.open({
            type: 'success',
            content: "验证码发送成功，5分钟内有效"
          });
        } else {
          messageApi.open({
            type: 'error',
            content: res.info || "验证码发送失败，请稍后重试"
          });
          setCountdown(0);
          setIsSendingCode(false);
        }
      })
      .catch(() => {
        messageApi.open({
          type: 'error',
          content: "网络错误，请稍后重试"
        });
        // setCountdown(0);
        // setIsSendingCode(false);
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
    const csrfToken = Cookies.get('csrftoken');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken;
    }
    else {
      messageApi.error('CSRF错误');
      return ;
    }
    await fetch(`/api/account/reg`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        "email": userEmail,
        "password": encrypt_password,
        "name": username,
      }),
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((res) => {
        if (Number(res.code) === 0) {
          // 注册成功后将 JWT Token 存储到 Cookie 中
          Cookies.set('jwtToken', res.token, { expires: 1 });
          Cookies.set('userEmail', userEmail, { expires: 1 });
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

  if (initialLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-r from-blue-50 to-indigo-50">
        <div style={{ textAlign: 'center' }}>
          <Spin size="large" />
          <Text style={{ display: 'block', marginTop: '16px', color: '#8A2BE2' }}>正在加载...</Text>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-r from-blue-50 to-indigo-50">
        <Spin size="large" />
        <Text style={{ marginTop: '16px', color: '#8A2BE2' }}>您已登录，正在跳转...</Text>
      </div>
    );
  }
  
  return (
    <>
      {contextHolder}
      <div 
        className="h-screen w-screen flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(124, 58, 237, 0.1) 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 背景装饰元素 */}
        <div 
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            background: `url("/register.jpg")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(1px)',
            opacity: 0.7,
            zIndex: 0,
          }}
        />
        
        {/* 装饰元素 - 左上角圆形 */}
        <motion.div 
          style={{
            position: 'absolute',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: 'linear-gradient(45deg, rgba(59, 130, 246, 0.3), rgba(124, 58, 237, 0.3))',
            top: '-50px',
            left: '-50px',
            filter: 'blur(40px)',
            zIndex: 1,
          }}
          animate={{
            x: [0, 20, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* 装饰元素 - 右下角圆形 */}
        <motion.div 
          style={{
            position: 'absolute',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'linear-gradient(45deg, rgba(124, 58, 237, 0.2), rgba(59, 130, 246, 0.2))',
            bottom: '-100px',
            right: '-100px',
            filter: 'blur(50px)',
            zIndex: 1,
          }}
          animate={{
            x: [0, -30, 0],
            y: [0, -40, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* 注册卡片 */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          style={{ zIndex: 2, position: 'relative' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Title
              level={1}
              style={{
                fontSize: '2.5rem',
                fontWeight: 800,
                marginBottom: '1.5rem',
                background: 'linear-gradient(to right, rgb(255, 242, 2), rgb(250, 191, 73))',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                textShadow: '0px 2px 10px rgba(255, 223, 134, 0.5)',
              }}
            >
              注册新用户
            </Title>

            <Card
              style={{
                width: '380px',
                padding: '0',
                borderRadius: '16px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(12px)',
                border: 'none',
                overflow: 'hidden',
              }}
              styles={{
                body: {
                  padding: '2rem'
                }
              }}
            >
              {errorMessage && (
                <Alert
                  message={errorMessage}
                  type="error"
                  showIcon
                  closable
                  onClose={() => setErrorMessage('')}
                  style={{ 
                    marginBottom: '1.5rem', 
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 77, 79, 0.2)',
                  }}
                />
              )}

              <div style={{ marginBottom: '1rem' }}>
                <Input
                  size="large"
                  placeholder="用户名"
                  prefix={<UserOutlined style={{ color: '#8A2BE2' }} />}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    borderRadius: '10px',
                    height: '46px',
                    marginBottom: '1rem',
                    borderColor: 'rgba(138, 43, 226, 0.3)',
                  }}
                />
                
                <Input
                  size="large"
                  placeholder="邮箱"
                  prefix={<MailOutlined style={{ color: '#8A2BE2' }} />}
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  style={{
                    borderRadius: '10px',
                    height: '46px',
                    marginBottom: '1rem',
                    borderColor: 'rgba(138, 43, 226, 0.3)',
                  }}
                />
                
                <Input.Password
                  size="large"
                  placeholder="密码"
                  prefix={<LockOutlined style={{ color: '#8A2BE2' }} />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    borderRadius: '10px',
                    height: '46px',
                    marginBottom: '1rem',
                    borderColor: 'rgba(138, 43, 226, 0.3)',
                  }}
                />
                
                <Input.Password
                  size="large"
                  placeholder="确认密码"
                  prefix={<LockOutlined style={{ color: '#8A2BE2' }} />}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    borderRadius: '10px',
                    height: '46px',
                    marginBottom: '1rem',
                    borderColor: 'rgba(138, 43, 226, 0.3)',
                  }}
                />
                
                <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
                  <Input
                    size="large"
                    placeholder="验证码"
                    prefix={<SafetyOutlined style={{ color: '#8A2BE2' }} />}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    style={{
                      borderRadius: '10px',
                      height: '46px',
                      flex: 1,
                      borderColor: 'rgba(138, 43, 226, 0.3)',
                    }}
                  />
                  <Button
                    type="primary"
                    disabled={isSendingCode}
                    onClick={handleSendVerifyCode}
                    style={{
                      height: '46px',
                      borderRadius: '10px',
                      minWidth: '120px',
                      background: isSendingCode ? '#B0B0B0' : 'linear-gradient(45deg, #8A2BE2, #4169E1)',
                      border: 'none',
                      boxShadow: isSendingCode ? 'none' : '0 4px 10px rgba(138, 43, 226, 0.2)',
                    }}
                  >
                    {isSendingCode ? `已发送(${countdown}s)` : '发送验证码'}
                  </Button>
                </div>
              </div>

              <Button
                type="primary"
                size="large"
                icon={<UserAddOutlined />}
                onClick={handleRegister}
                block
                style={{
                  height: '46px',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  background: 'linear-gradient(45deg, #8A2BE2, #4169E1)',
                  border: 'none',
                  boxShadow: '0 4px 10px rgba(138, 43, 226, 0.2)',
                  marginBottom: '1rem',
                }}
              >
                注册
              </Button>

              <Divider style={{ margin: '1.25rem 0', color: '#9CA3AF' }}>
                <Text style={{ color: '#6B7280', fontSize: '0.9rem' }}>已有账号？</Text>
              </Divider>

              <Button
                size="large"
                icon={<LoginOutlined />}
                onClick={handleBackToLogin}
                block
                style={{
                  height: '46px',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  borderColor: '#8A2BE2',
                  color: '#8A2BE2',
                }}
              >
                返回登录
              </Button>
            </Card>
          </div>
        </motion.div>

        {/* 账号规则卡片 */}
        <motion.div
          initial={{ x: 0, opacity: 0 }}
          animate={{ x: 330, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          style={{ zIndex: 2 }}
        >
          <Card
            style={{
              position: 'absolute',
              top: '50%',
              right: '5%',
              transform: 'translateY(-50%)',
              width: '280px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(138, 43, 226, 0.1)',
              boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
            }}
            styles={{
                body: {
                  padding: '1.5rem'
                }
              }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', color: '#8A2BE2' }}>
              <InfoCircleOutlined style={{ fontSize: '1.2rem', marginRight: '0.5rem' }} />
              <Title level={4} style={{ margin: 0, color: '#8A2BE2' }}>账号规则</Title>
            </div>
            
            <ul style={{ padding: '0 0 0 1rem', margin: 0 }}>
              <li style={{ marginBottom: '0.75rem', color: '#4B5563' }}>
                <Text style={{ fontSize: '0.95rem' }}>
                  用户名可包含任何 UTF-8 字符，长度 ≤ 20
                </Text>
              </li>
              <li style={{ color: '#4B5563' }}>
                <Text style={{ fontSize: '0.95rem' }}>
                  密码只能由字母、数字及下划线组成，长度 ≤ 12
                </Text>
              </li>
            </ul>
          </Card>
        </motion.div>

        {/* 页脚部分 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          style={{ 
            position: 'absolute', 
            bottom: '20px', 
            textAlign: 'center', 
            width: '100%',
            zIndex: 2 
          }}
        >
          <Text style={{ color: '#fff' }}>
            © {new Date().getFullYear()} 即时通讯系统 · 安全可靠的沟通平台
          </Text>
        </motion.div>
      </div>
    </>
  );
};

export default RegisterPage;