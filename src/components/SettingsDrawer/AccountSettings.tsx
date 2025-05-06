import React, { useState, useEffect } from 'react';
import { Avatar, Typography, Button, Modal, Upload, message, Form, Input, Card, Divider, Row, Col, Tooltip, Spin } from "antd";
import { SafetyOutlined, UserOutlined, MailOutlined, InfoCircleOutlined, LockOutlined, LogoutOutlined, DeleteOutlined, EditOutlined, KeyOutlined, UploadOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import Cookies from "js-cookie";
import { useRouter } from "next/router";
import { encrypt, decrypt } from '../../utils/crypto';

const { Text, Title, Paragraph } = Typography;

interface AccountSettingsProps {
  userInfo: any;
}

const AccountSettings: React.FC<AccountSettingsProps & { fetchUserInfo: () => void }> = ({ userInfo, fetchUserInfo }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const router = useRouter();
  const token = Cookies.get("jwtToken");
  const [verifyCode, setVerifyCode] = useState('');
  const [savedVerifyCode, setSavedVerifyCode] = useState('');
  const [verifyCodeExpiry, setVerifyCodeExpiry] = useState<Date | undefined>(undefined);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [userEmail, setUserEmail] = useState('');

  const handleLogout = () => {
    Cookies.remove("jwtToken");
    Cookies.remove("userEmail");
    messageApi.open({
      type: 'success',
      content: "已退出登录，正在跳转至登录界面..."
    }).then(() => {router.push('/')});
  };

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setIsSendingCode(false);
    }
  }, [countdown]);

  const handleDeleteAccount = () => {
    fetch("/api/account/delete", {
      method: "DELETE",
      headers: {
        Authorization: `${token}`,
      },
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.code === 0) {
          Cookies.remove("jwtToken");
          Cookies.remove("userEmail");
          messageApi.open({
            type: 'success',
            content: res.message || "注销成功，正在跳转至聊天界面..."
          }).then(() => {router.push('/')});
        } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
            Cookies.remove("jwtToken");
            Cookies.remove("userEmail");
            messageApi.open({
              type: "error",
              content: "JWT token无效或过期，正在跳转回登录界面...",
            }).then(() => {
              router.push("/");
            });
        } else {
          messageApi.open({
            type: 'error',
            content: res.info || "注销失败"
          });
        }
      })
      .catch((err) => {
        messageApi.open({
          type: 'error',
          content: `网络错误，请稍后重试: ${err}`
        });
      })
      .finally(() => {
        setIsModalVisible(false);
      });
  };

  const getBase64 = (img: File, callback: (base64: string) => void): void => {
    const reader = new FileReader();
    reader.addEventListener('load', () => callback(reader.result as string));
    reader.readAsDataURL(img);
  };

  const beforeUpload = (file: File) => {
    const isJPG = file.type === 'image/jpeg';
    if (!isJPG) {
      messageApi.open({
        type: 'error',
        content: "只能上传 JPG 格式的图片"
      });
      return false;
    }

    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      messageApi.open({
        type: 'error',
        content: "图片大小需要小于2MB"
      })
      return false;
    }

    setUploading(true);
    getBase64(file, (base64) => {
      const base64Length = base64.length - (base64.indexOf(',') + 1);
      const isBase64Lt2M = base64Length < 2 * 1024 * 1024;
      if (!isBase64Lt2M) {
        messageApi.open({
          type: 'error',
          content: "转换后的图片大小超过 2MB"
        })
        setUploading(false);
        return;
      }

      form.setFieldsValue({ avatar: base64 });
      setUploading(false);
      messageApi.open({
        type: 'success',
        content: "上传成功"
      });
    });

    return false;
  };

  const handleEditInfo = async (values: any) => {
    if (userEmail.trim()) {
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
    }
    
    try {
    const payload = {
      "origin_password": await encrypt(values.origin_password),
      ...((values.name && values.name !== "") && { "name": values.name }),
      ...((values.password && values.password !== "") && { "password": await encrypt(values.password) }),
      ...((values.email && values.email !== "") && { "email": values.email }),
      ...((values.user_info && values.user_info !== "") && { "user_info": values.user_info }),
      ...((values.avatar && values.avatar !== "") && { "avatar": values.avatar }),
    };
    
    if ((! payload.name) && (! payload.password) && (! payload.email) && (! payload.user_info) && (! payload.avatar)) {
      messageApi.open({
        type: 'error',
        content: '您好歹改点东西吧...'
      });
      return;
    }
    
    await fetch("/api/account/info", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${token}`,
      },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.code === 0) {
          messageApi.open({
            type: 'success',
            content: res.message || "修改成功"
          });
          setIsEditModalVisible(false);
          setIsPasswordModalVisible(false);
          setVerifyCodeExpiry(undefined);
          setIsSendingCode(false);
          setCountdown(0);
          setUserEmail('');
          setVerifyCode('');
          setSavedVerifyCode('');
          fetchUserInfo();
        } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
          Cookies.remove("jwtToken");
          Cookies.remove("userEmail");
          messageApi.open({
            type: "error",
            content: "JWT token无效或过期，正在跳转回登录界面...",
          }).then(() => {
            router.push("/");
          });
        } else {
          messageApi.open({
            type: 'error',
            content: res.info || "信息修改失败"
          });
        }
      });
    } catch(error) {
      console.error('Error ', error);
    }
  };

  const handleSendVerifyCode = async () => {

    setIsSendingCode(true);
    setCountdown(60);
    
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

  if (!userInfo) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: '16px' }}>
        <Spin size="large" />
        <Text type="secondary">加载中...</Text>
      </div>
    );
  }

  return (
    <>
      {contextHolder}
      <div className="account-settings-container" style={{ height: '100%' }}>
        {/* 个人信息卡片 */}
        <Card 
          className="profile-card"
          style={{ 
            marginBottom: '24px', 
            borderRadius: '16px', 
            boxShadow: '0 4px 12px rgba(138, 43, 226, 0.07)',
            border: '1px solid rgba(138, 43, 226, 0.1)'
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "24px", position: 'relative' }}>
            <div 
              style={{ 
                position: 'relative', 
                display: 'inline-block', 
                marginBottom: '16px',
                background: 'linear-gradient(135deg, #f0e6ff, #e5dbff)',
                padding: '8px',
                borderRadius: '50%',
                boxShadow: '0 4px 12px rgba(138, 43, 226, 0.15)'
              }}
            >
              <Avatar 
                src={userInfo.avatar} 
                size={100} 
                style={{ 
                  border: '3px solid white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              />
              <div 
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  right: '6px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: userInfo.deleted ? '#ff4d4f' : '#52c41a',
                  border: '2px solid white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
              />
            </div>
            
            <Title level={3} style={{ margin: '0 0 4px 0', color: '#8A2BE2' }}>
              {userInfo.name}
            </Title>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <MailOutlined style={{ color: '#8A2BE2', opacity: 0.8 }} />
              <Text type="secondary">{userInfo.email}</Text>
            </div>
            
            <div style={{ 
              marginTop: '16px', 
              display: 'inline-block', 
              padding: '4px 12px', 
              borderRadius: '20px',
              background: userInfo.deleted ? 'rgba(255, 77, 79, 0.1)' : 'rgba(82, 196, 26, 0.1)',
              color: userInfo.deleted ? '#ff4d4f' : '#52c41a',
              border: userInfo.deleted ? '1px solid rgba(255, 77, 79, 0.3)' : '1px solid rgba(82, 196, 26, 0.3)',
            }}>
              {userInfo.deleted ? (
                <><ExclamationCircleOutlined /> 账号已注销</>
              ) : (
                <><CheckCircleOutlined /> 账号正常</>
              )}
            </div>
          </div>
          
          <Divider style={{ margin: '16px 0', borderColor: 'rgba(138, 43, 226, 0.1)' }} />
          
          <div style={{ marginBottom: '20px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: '8px',
              color: '#8A2BE2'
            }}>
              <InfoCircleOutlined style={{ marginRight: '8px' }} />
              <Text strong>个人简介</Text>
            </div>
            <Paragraph 
              style={{ 
                padding: '12px 16px', 
                background: 'rgba(138, 43, 226, 0.03)', 
                borderRadius: '8px',
                border: '1px solid rgba(138, 43, 226, 0.07)',
                color: '#666',
                margin: 0
              }}
            >
              {userInfo.user_info || "暂无个人简介，点击下方的修改信息按钮添加吧！"}
            </Paragraph>
          </div>
        </Card>
        
        {/* 账号操作卡片 */}
        <Card 
          title={
            <div style={{ color: '#8A2BE2', display: 'flex', alignItems: 'center' }}>
              <KeyOutlined style={{ marginRight: '8px' }} />
              <span>账号操作</span>
            </div>
          }
          style={{ 
            borderRadius: '16px', 
            boxShadow: '0 4px 12px rgba(138, 43, 226, 0.07)',
            border: '1px solid rgba(138, 43, 226, 0.1)'
          }}
        >
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Button 
                type="primary" 
                icon={<EditOutlined />}
                style={{ 
                  width: '100%', 
                  height: '44px',
                  background: '#8A2BE2',
                  borderColor: '#8A2BE2',
                  boxShadow: '0 4px 8px rgba(138, 43, 226, 0.2)',
                  borderRadius: '8px'
                }}
                onClick={() => {
                  setIsEditModalVisible(true); 
                  form.resetFields(); 
                }}
              >
                修改信息
              </Button>
            </Col>
            <Col span={12}>
              <Button 
                type="primary" 
                icon={<LockOutlined />}
                style={{ 
                  width: '100%', 
                  height: '44px',
                  background: '#8A2BE2',
                  borderColor: '#8A2BE2',
                  boxShadow: '0 4px 8px rgba(138, 43, 226, 0.2)',
                  borderRadius: '8px'
                }}
                onClick={() => {
                  setIsPasswordModalVisible(true); 
                  passwordForm.resetFields();
                }}
              >
                修改密码
              </Button>
            </Col>
            <Col span={12}>
              <Button 
                type="primary" 
                danger 
                icon={<LogoutOutlined />}
                style={{ 
                  width: '100%', 
                  height: '44px',
                  boxShadow: '0 4px 8px rgba(255, 77, 79, 0.2)',
                  borderRadius: '8px'
                }}
                onClick={handleLogout}
              >
                退出登录
              </Button>
            </Col>
            <Col span={12}>
              <Button
                danger
                icon={<DeleteOutlined />}
                style={{ 
                  width: '100%', 
                  height: '44px',
                  borderRadius: '8px',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.05)'
                }}
                onClick={() => setIsModalVisible(true)}
              >
                注销账户
              </Button>
            </Col>
          </Row>
        </Card>

        {/* 修改信息模态框 */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', color: '#8A2BE2' }}>
              <EditOutlined style={{ marginRight: '8px' }} />
              <span>修改个人信息</span>
            </div>
          }
          open={isEditModalVisible}
          onCancel={() => {
            setIsEditModalVisible(false);
            setUserEmail('');
            setVerifyCode('');
            setSavedVerifyCode('');
            form.resetFields();
          }}
          onOk={() => form.submit()}
          okText="保存"
          cancelText="取消"
          okButtonProps={{ 
            style: { background: '#8A2BE2', borderColor: '#8A2BE2' }
          }}
          styles={{
            mask: { backdropFilter: 'blur(2px)', background: 'rgba(0,0,0,0.4)' },
            header: { borderBottom: '1px solid rgba(138, 43, 226, 0.1)' },
            footer: { borderTop: '1px solid rgba(138, 43, 226, 0.1)' }
          }}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={(values) => {
              handleEditInfo(values);
            }}
          >
            <Form.Item 
              label={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <UploadOutlined style={{ marginRight: '8px', color: '#8A2BE2' }} />
                  <span>头像上传</span>
                </div>
              } 
              name="avatar"
            >
              <Upload
              name="avatar"
              listType="picture-card"
              className="avatar-uploader"
              showUploadList={false}
              beforeUpload={beforeUpload}
              style={{ width: '100%' }}
              >
                {form.getFieldValue('avatar') ? (
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    <img src={form.getFieldValue('avatar')} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                    <div style={{ 
                      position: 'absolute', 
                      bottom: 0, 
                      left: 0,
                      right: 0,
                      background: 'rgba(0,0,0,0.6)',
                      padding: '4px',
                      color: 'white',
                      fontSize: '12px',
                      textAlign: 'center'
                    }}>
                      点击更换
                    </div>
                  </div>
                ) : (
                  <div style={{ 
                    padding: '10px', 
                    textAlign: 'center', 
                    color: '#8A2BE2',
                  }}>
                    {uploading ? (
                      <div>
                        <Spin size="small" style={{ marginBottom: '8px' }} />
                        <div>上传中...</div>
                      </div>
                    ) : (
                      <div>
                        { <UploadOutlined style={{ fontSize: '24px', marginBottom: '8px' }} /> }
                        <div>点击上传</div>
                        <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                          仅支持 JPG 格式，小于 2MB
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Upload>
            </Form.Item>
            
            <Form.Item 
              label={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <UserOutlined style={{ marginRight: '8px', color: '#8A2BE2' }} />
                  <span>用户名</span>
                </div>
              } 
              name="name"
            >
              <Input 
                placeholder="请输入用户名" 
                style={{ borderRadius: '8px' }} 
                prefix={<UserOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />}
              />
            </Form.Item>
            
            <Form.Item 
              label={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <MailOutlined style={{ marginRight: '8px', color: '#8A2BE2' }} />
                  <span>邮箱</span>
                </div>
              } 
              name="email"
            >
              <Input 
                placeholder="请输入邮箱" 
                style={{ borderRadius: '8px' }} 
                prefix={<MailOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />}
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
              />
            </Form.Item>

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <Input
                placeholder="验证码"
                prefix={<SafetyOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />}
                value={verifyCode}
                disabled={!userEmail.trim()}
                onChange={(e) => setVerifyCode(e.target.value)}
                style={{
                  borderRadius: '10px',
                  height: '32px',
                  flex: 1,
                  marginRight: '8px'
                }}
              />
              <Button
                type="primary"
                disabled={isSendingCode || (!userEmail.trim())}
                onClick={handleSendVerifyCode}
                style={{
                  height: '32px',
                  borderRadius: '10px',
                  minWidth: '120px',
                  background: (isSendingCode || (!userEmail.trim())) ? '#B0B0B0' : 'linear-gradient(45deg, #8A2BE2, #4169E1)',
                  border: 'none',
                  boxShadow: (isSendingCode || (!userEmail.trim())) ? 'none' : '0 4px 10px rgba(138, 43, 226, 0.2)',
                  color: '#FFFFFF',
                  fontSize: '12px'
                }}
              >
                {isSendingCode ? `已发送(${countdown}s)` : '发送验证码'}
              </Button>
            </div>

            <Form.Item 
              label={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <InfoCircleOutlined style={{ marginRight: '8px', color: '#8A2BE2' }} />
                  <span>个人简介</span>
                </div>
              } 
              name="user_info"
            >
              <Input.TextArea 
                placeholder="请输入个人简介" 
                style={{ borderRadius: '8px', minHeight: '100px' }}
              />
            </Form.Item>
            
            <Form.Item
              label={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <LockOutlined style={{ marginRight: '8px', color: '#8A2BE2' }} />
                  <span>当前密码</span>
                </div>
              }
              name="origin_password"
              rules={[{ required: true, message: "修改信息需要输入当前密码" }]}
            >
              <Input.Password 
                placeholder="请输入当前密码" 
                style={{ borderRadius: '8px' }} 
                prefix={<LockOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />}
              />
            </Form.Item>
          </Form>
        </Modal>

        {/* 修改密码模态框 */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', color: '#8A2BE2' }}>
              <LockOutlined style={{ marginRight: '8px' }} />
              <span>修改密码</span>
            </div>
          }
          open={isPasswordModalVisible}
          onCancel={() => {
            setIsPasswordModalVisible(false);
            passwordForm.resetFields();
          }}
          onOk={() => passwordForm.submit()}
          okText="保存"
          cancelText="取消"
          okButtonProps={{ 
            style: { background: '#8A2BE2', borderColor: '#8A2BE2' }
          }}
          styles={{
            mask: { backdropFilter: 'blur(2px)', background: 'rgba(0,0,0,0.4)' },
            header: { borderBottom: '1px solid rgba(138, 43, 226, 0.1)' },
            footer: { borderTop: '1px solid rgba(138, 43, 226, 0.1)' }
          }}
        >
          <Form
            form={passwordForm}
            layout="vertical"
            onFinish={(values) => handleEditInfo({ 
              ...values, 
              name: userInfo.name, 
              email: userInfo.email, 
              user_info: userInfo.user_info, 
              avatar: userInfo.avatar 
            })}
          >
            <Form.Item 
              label={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <LockOutlined style={{ marginRight: '8px', color: '#8A2BE2' }} />
                  <span>当前密码</span>
                </div>
              } 
              name="origin_password" 
              rules={[{ required: true, message: "请输入当前密码" }]}
            >
              <Input.Password 
                placeholder="请输入当前密码" 
                style={{ borderRadius: '8px' }} 
                prefix={<LockOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />}
              />
            </Form.Item>
            
            <Form.Item 
              label={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <LockOutlined style={{ marginRight: '8px', color: '#8A2BE2' }} />
                  <span>新密码</span>
                </div>
              } 
              name="password" 
              rules={[{ required: true, message: "请输入新密码" }]}
            >
              <Input.Password 
                placeholder="请输入新密码" 
                style={{ borderRadius: '8px' }} 
                prefix={<LockOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />}
              />
            </Form.Item>
            
            <div style={{ 
              padding: '12px', 
              background: 'rgba(250, 219, 20, 0.1)', 
              borderRadius: '8px',
              border: '1px solid rgba(250, 219, 20, 0.3)',
              marginTop: '16px'
            }}>
              <Text type="warning">
                <InfoCircleOutlined style={{ marginRight: '8px' }} />
                请使用包含字母、数字和特殊字符的强密码，以提高账号安全性。
              </Text>
            </div>
          </Form>
        </Modal>

        {/* 注销账户确认对话框 */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', color: '#ff4d4f' }}>
              <ExclamationCircleOutlined style={{ marginRight: '8px' }} />
              <span>确认注销账户</span>
            </div>
          }
          open={isModalVisible}
          onOk={handleDeleteAccount}
          onCancel={() => setIsModalVisible(false)}
          okText="确认注销"
          cancelText="取消"
          okButtonProps={{ danger: true }}
          styles={{
            mask: { backdropFilter: 'blur(2px)', background: 'rgba(0,0,0,0.4)' },
            header: { borderBottom: '1px solid #ffccc7' },
            footer: { borderTop: '1px solid #ffccc7' },
            body: { padding: '24px 24px 12px' }
          }}
        >
          <div style={{ 
            padding: '16px',
            background: 'rgba(255, 77, 79, 0.05)', 
            borderRadius: '8px',
            border: '1px solid rgba(255, 77, 79, 0.2)',
            marginBottom: '16px'
          }}>
            <Text strong style={{ color: '#ff4d4f', display: 'block', marginBottom: '8px' }}>
              注销账户提示：
            </Text>
            <Paragraph style={{ margin: 0 }}>
              您的账户将被标记为已注销状态，但不会有任何其他后果。您的个人资料、消息记录和好友关系都将保留。
            </Paragraph>
          </div>
          <Paragraph type="secondary">您确定要注销账户吗？</Paragraph>
        </Modal>
      </div>
    </>
  );
};

export default AccountSettings;