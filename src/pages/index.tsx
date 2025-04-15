import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { FAILURE_PREFIX, LOGIN_FAILED, LOGIN_SUCCESS_PREFIX } from '../constants/string';
import { Typography, Card, Input, Button, message, Spin, Divider } from 'antd';
import { motion } from 'framer-motion';
import Cookies from 'js-cookie';
import { encrypt } from '../utils/crypto';
import { MailOutlined, LockOutlined, LoginOutlined, UserAddOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const WelcomePage = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [userEmail, setUserEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [showAlert, setShowAlert] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    // 检查 cookies 中是否已存在 jwtToken
    const jwtToken = Cookies.get('jwtToken');
    if (jwtToken) {
      setIsAuthenticated(true);
      router.push('/chat').then(() => setShowAlert(true));
    } else {
      setIsAuthenticated(false);
    }
    // 短暂延迟以显示加载动画
    setTimeout(() => {
      setInitialLoading(false);
    }, 800);
  }, [router]);

  useEffect(() => {
    if (showAlert) {
      alert('您已登录，确认后将返回聊天界面');
      setShowAlert(false);
    }
  }, [showAlert]);

  const handleLogin = async () => {
    // 表单验证
    if (!userEmail.trim()) {
      messageApi.error('请输入邮箱');
      return;
    }
    
    if (!password) {
      messageApi.error('请输入密码');
      return;
    }

    setLoading(true);
    try {
      const encrypt_password = await encrypt(password);
      const response = await fetch(`/api/account/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          "email": userEmail,
          "password": encrypt_password
        }),
      });
      
      const res = await response.json();
      
      if (Number(res.code) === 0) {
        // 将 JWT Token 存储到 Cookie 中
        Cookies.set('jwtToken', res.token, { expires: 3 }); // 设置有效期为 3 天
        Cookies.set('userEmail', userEmail, { expires: 3 }); // 设置有效期为 3 天
        
        messageApi.open({
          type: 'success',
          content: LOGIN_SUCCESS_PREFIX + userEmail + " 正在跳转至聊天界面..."
        });
        
        // 添加延迟，使用户能看到成功消息
        setTimeout(() => {
          router.push('/chat');
        }, 1000);
      } else {
        messageApi.error(LOGIN_FAILED + res.info);
      }
    } catch (err) {
      messageApi.error(FAILURE_PREFIX + "登录请求失败，请检查网络连接");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    router.push('/register');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
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
        className="h-screen w-screen flex flex-col items-center justify-center"
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
            background: `url("/login.png")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(1px)',
            opacity: 0.6,
            zIndex: 0,
          }}
        />
        
        {/* 装饰圆形 */}
        <motion.div 
          style={{
            position: 'absolute',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: 'linear-gradient(45deg, rgba(59, 130, 246, 0.3), rgba(124, 58, 237, 0.3))',
            top: '-50px',
            left: '-50px',
            filter: 'blur(30px)',
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
        
        <motion.div 
          style={{
            position: 'absolute',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'linear-gradient(45deg, rgba(124, 58, 237, 0.2), rgba(59, 130, 246, 0.2))',
            bottom: '-100px',
            right: '-100px',
            filter: 'blur(40px)',
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

        {/* 内容容器 */}
        <div style={{ zIndex: 2, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* 标题部分 */}
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <Title
                level={1}
                style={{
                  fontSize: '2.8rem',
                  fontWeight: 800,
                  marginBottom: '0.5rem',
                  background: 'linear-gradient(to right, #8A2BE2, #4169E1)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  textShadow: '0 2px 10px rgba(138, 43, 226, 0.2)',
                }}
              >
                即时通讯系统
              </Title>
              <Text style={{ 
                fontSize: '1.1rem', 
                color: '#6B7280',
                display: 'block',
                marginTop: '0.5rem',
              }}>
                安全、高效、便捷的沟通平台
              </Text>
            </div>
          </motion.div>

          {/* 卡片部分 */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            style={{ width: '100%', maxWidth: '400px' }}
          >
            <Card
              style={{
                borderRadius: '16px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                border: 'none',
                overflow: 'hidden',
              }}
              bodyStyle={{ padding: '2rem' }}
            >
              <Title level={3} style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#333' }}>
                欢迎回来
              </Title>

              <div style={{ marginBottom: '1.5rem' }}>
                <Text style={{ display: 'block', marginBottom: '0.5rem', color: '#4B5563', fontWeight: 500 }}>
                  邮箱
                </Text>
                <Input
                  size="large"
                  placeholder="请输入邮箱地址"
                  prefix={<MailOutlined style={{ color: '#8A2BE2' }} />}
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  style={{
                    borderRadius: '8px',
                    height: '48px',
                    borderColor: 'rgba(138, 43, 226, 0.3)',
                  }}
                />
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <Text style={{ display: 'block', marginBottom: '0.5rem', color: '#4B5563', fontWeight: 500 }}>
                  密码
                </Text>
                <Input.Password
                  size="large"
                  placeholder="请输入密码"
                  prefix={<LockOutlined style={{ color: '#8A2BE2' }} />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  style={{
                    borderRadius: '8px',
                    height: '48px',
                    borderColor: 'rgba(138, 43, 226, 0.3)',
                  }}
                />
              </div>

              <Button
                type="primary"
                size="large"
                icon={<LoginOutlined />}
                onClick={handleLogin}
                loading={loading}
                block
                style={{
                  height: '48px',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  background: 'linear-gradient(45deg, #8A2BE2, #4169E1)',
                  border: 'none',
                  boxShadow: '0 4px 10px rgba(138, 43, 226, 0.2)',
                }}
              >
                登录
              </Button>

              <Divider style={{ margin: '1.5rem 0', color: '#9CA3AF' }}>
                <Text style={{ color: '#6B7280', fontSize: '0.9rem' }}>还没有账号？</Text>
              </Divider>

              <Button
                size="large"
                icon={<UserAddOutlined />}
                onClick={handleRegister}
                block
                style={{
                  height: '48px',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  borderColor: '#8A2BE2',
                  color: '#8A2BE2',
                }}
              >
                注册新账号
              </Button>
            </Card>
          </motion.div>

          {/* 页脚部分 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1 }}
            style={{ marginTop: '2rem', textAlign: 'center', zIndex: 2 }}
          >
            <Text style={{ color: '#6B7280' }}>
              © {new Date().getFullYear()} 即时通讯系统 · 安全可靠的沟通平台
            </Text>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default WelcomePage;