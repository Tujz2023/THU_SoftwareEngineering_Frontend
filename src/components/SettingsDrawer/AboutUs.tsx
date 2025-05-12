import React, { useState } from 'react';
import { Typography, Card, Avatar, Row, Col, Divider, Space, Tooltip, message } from 'antd';
import { GithubOutlined, MailOutlined, LinkedinOutlined, GlobalOutlined, CopyOutlined } from '@ant-design/icons';
import hanwenAvatar from '../../constants/hanwen_zhang.jpg';
import binglinAvatar from '../../constants/binglin_liu.jpg';
import zihanAvatar from '../../constants/zihan_guo.jpg';
import jinzheAvatar from '../../constants/jinzhe_tu.jpg';
const { Title, Text, Paragraph } = Typography;

const AboutUs: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();

  // 团队成员信息
  const teamMembers = [
    {
      name: 'Binglin Liu',
      role: '组长/后端开发',
      email: 'lbl23@mails.tsinghua.edu.cn',
      avatar: binglinAvatar,
      github: 'https://github.com/anticyc',
    },
    {
      name: 'Hanwen Zhang',
      role: '后端开发',
      email: 'zhanghw23@mails.tsinghua.edu.cn',
      avatar: hanwenAvatar,
      github: 'https://github.com/Hanwen23',
    },
    {
      name: 'Zihan Guo',
      role: '前端开发',
      email: 'guozihan23@mails.tsinghua.edu.cn',
      avatar: zihanAvatar,
      github: 'https://github.com/guozh23',
    },
    {
      name: 'Jinzhe Tu',
      role: '前后端测试/维护',
      email: 'tujz23@mails.tsinghua.edu.cn',
      avatar: jinzheAvatar,
      github: 'https://github.com/Tujz2023',
    },
  ];

  // 复制邮箱功能
  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email).then(() => {
      messageApi.success('邮箱已复制到剪贴板');
    }).catch(() => {
      messageApi.error('复制失败，请手动复制');
    });
  };

  return (
    <div className="about-us-container">
      {contextHolder}
      
      {/* 项目介绍卡片 */}
      <Card 
        style={{ 
          marginBottom: '1.5rem', 
          borderRadius: '1rem',
          boxShadow: '0 4px 12px rgba(138, 43, 226, 0.07)',
          border: '1px solid rgba(138, 43, 226, 0.1)',
          overflow: 'hidden',
          width: '100%'
        }}
      >
        <div style={{ 
          background: 'linear-gradient(135deg, rgba(138, 43, 226, 0.05), rgba(138, 43, 226, 0.15))',
          margin: '-24px -24px 20px',
          padding: '1.5rem 1rem',
          borderBottom: '1px solid rgba(138, 43, 226, 0.1)',
          textAlign: 'center',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '120%',
            height: '120%',
            pointerEvents: 'none'
          }} />
          
          <Title level={2} style={{ color: '#6A1B9A', margin: '0 0 8px', fontWeight: 600, position: 'relative', zIndex: 2, fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}>即时通讯系统</Title>
          <Text style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1rem)', color: '#333', fontWeight: 500, position: 'relative', zIndex: 2 }}>一款简洁、高效的多人实时通讯平台</Text>
        </div>
        
        <Paragraph style={{ fontSize: 'clamp(0.875rem, 2.5vw, 0.938rem)', lineHeight: '1.8' }}>
          我们的即时通讯系统旨在提供一个安全、高效且用户友好的通信环境，支持文本、图片的即时传输。
          无论是私人交流还是团队协作，都能满足您的需求。我们注重用户体验和数据隐私，为您带来流畅的沟通体验。
        </Paragraph>
        
        <div style={{ 
          display: 'flex', 
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          background: 'rgba(138, 43, 226, 0.03)',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          marginTop: '1rem',
          gap: '0.5rem'
        }}>
          <div style={{ minWidth: '30%', marginBottom: '0.5rem' }}>
            <Text strong style={{ display: 'block', color: '#8A2BE2' }}>版本</Text>
            <Text>v1.0.0</Text>
          </div>
          <div style={{ minWidth: '30%', marginBottom: '0.5rem' }}>
            <Text strong style={{ display: 'block', color: '#8A2BE2' }}>发布日期</Text>
            <Text>2025年5月</Text>
          </div>
          <div style={{ minWidth: '30%', marginBottom: '0.5rem' }}>
            <Text strong style={{ display: 'block', color: '#8A2BE2' }}>技术栈</Text>
            <Text>React + Django</Text>
          </div>
        </div>
      </Card>

      {/* 团队成员卡片 */}
      <Card
        title={
          <div style={{ color: '#8A2BE2' }}>
            <span>开发团队</span>
          </div>
        }
        style={{ 
          borderRadius: '1rem',
          boxShadow: '0 4px 12px rgba(138, 43, 226, 0.07)',
          border: '1px solid rgba(138, 43, 226, 0.1)',
          width: '100%'
        }}
        styles={{
          header: { 
            borderBottom: '1px solid rgba(138, 43, 226, 0.1)',
            padding: '1rem 1.5rem'
          },
          body: { padding: '1rem' }
        }}
      >
        <Row gutter={[16, 16]}>
          {teamMembers.map((member, index) => (
            <Col xs={24} sm={24} md={12} key={index}>
              <div style={{ 
                padding: 'clamp(0.75rem, 2vw, 1rem)',
                borderRadius: '0.75rem',
                background: 'rgba(255, 255, 255, 0.8)',
                border: '1px solid rgba(138, 43, 226, 0.1)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                height: '100%',
                transition: 'transform 0.3s, box-shadow 0.3s',
                cursor: 'default',
                position: 'relative',
                paddingBottom: '3rem'
              }}
              className="member-card"
              >
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '0.75rem',
                  flexWrap: 'wrap'
                }}>
                  <Avatar
                    src={member.avatar.src} 
                    size={window.innerWidth < 400 ? 50 : 60} 
                    style={{ border: '2px solid rgba(138, 43, 226, 0.2)' }} 
                  />
                  <div style={{ marginLeft: '1rem', flex: '1 1 auto' }}>
                    <Title level={5} style={{ margin: '0 0 4px', color: '#8A2BE2', fontSize: 'clamp(0.9rem, 2.5vw, 1rem)' }}>{member.name}</Title>
                    <div style={{ 
                      fontSize: 'clamp(0.75rem, 2vw, 0.813rem)', 
                      padding: '2px 10px', 
                      background: 'rgba(138, 43, 226, 0.08)',
                      borderRadius: '12px',
                      display: 'inline-block',
                      color: '#8A2BE2',
                      fontWeight: 500
                    }}>
                      {member.role}
                    </div>
                  </div>
                </div>

                <Divider style={{ margin: '0.75rem 0', borderColor: 'rgba(138, 43, 226, 0.1)' }} />
                
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                  <MailOutlined style={{ color: '#8A2BE2', marginRight: '0.5rem', flexShrink: 0 }} />
                  <Text 
                    style={{ 
                      flex: '1 1 auto',
                      cursor: 'pointer',
                      fontSize: 'clamp(0.75rem, 2.2vw, 0.875rem)',
                      wordBreak: 'break-all'
                    }}
                    onClick={() => copyEmail(member.email)}
                  >
                    {member.email}
                  </Text>
                  <Tooltip title="复制邮箱">
                    <CopyOutlined 
                      style={{ color: '#8A2BE2', cursor: 'pointer', marginLeft: '0.5rem', flexShrink: 0 }} 
                      onClick={() => copyEmail(member.email)}
                    />
                  </Tooltip>
                </div>
                
                <div style={{ 
                  position: 'absolute',
                  bottom: '0.75rem',
                  right: '0.75rem',
                  display: 'flex',
                  justifyContent: 'flex-end'
                }}>
                  <Space>
                    <Tooltip title="访问 GitHub">
                      <a 
                        href={member.github} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{
                          width: '2rem',
                          height: '2rem',
                          borderRadius: '50%',
                          background: 'rgba(138, 43, 226, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#8A2BE2',
                          transition: 'all 0.3s'
                        }}
                        className="social-icon"
                      >
                        <GithubOutlined />
                      </a>
                    </Tooltip>
                  </Space>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 联系我们卡片 */}
      <Card
        style={{ 
          marginTop: '1.5rem', 
          borderRadius: '1rem',
          boxShadow: '0 4px 12px rgba(138, 43, 226, 0.07)',
          border: '1px solid rgba(138, 43, 226, 0.1)',
          width: '100%'
        }}
      >
        <Title level={5} style={{ color: '#8A2BE2', marginTop: 0 }}>联系我们</Title>
        <Paragraph style={{ fontSize: 'clamp(0.875rem, 2.5vw, 0.938rem)' }}>
          如果您有任何问题、建议或合作意向，欢迎通过以下方式联系我们：
        </Paragraph>
        
        <div style={{ 
          background: 'linear-gradient(135deg, rgba(138, 43, 226, 0.05), rgba(138, 43, 226, 0.1))',
          padding: '1rem',
          borderRadius: '0.5rem',
          marginTop: '1rem'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-start',
            marginBottom: '0.75rem',
            flexWrap: 'wrap'
          }}>
            <MailOutlined style={{ 
              fontSize: '1.125rem', 
              color: '#8A2BE2', 
              marginRight: '0.75rem',
              marginTop: '0.25rem',
              flexShrink: 0 
            }} />
            <div style={{ flex: 1 }}>
              <Text style={{ fontSize: 'clamp(0.875rem, 2.5vw, 0.938rem)' }}>项目邮箱：</Text>
              <Text 
                strong 
                style={{ 
                  marginLeft: '0.5rem', 
                  cursor: 'pointer',
                  fontSize: 'clamp(0.875rem, 2.5vw, 0.938rem)',
                  wordBreak: 'break-all',
                  display: 'inline-flex',
                  alignItems: 'center'
                }}
                onClick={() => copyEmail('chatapp@example.com')}
              >
                chatapp@example.com
                <CopyOutlined style={{ marginLeft: '0.5rem', fontSize: '0.875rem', color: '#8A2BE2' }} />
              </Text>
            </div>
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-start',
            flexWrap: 'wrap'
          }}>
            <GlobalOutlined style={{ 
              fontSize: '1.125rem', 
              color: '#8A2BE2', 
              marginRight: '0.75rem',
              marginTop: '0.25rem',
              flexShrink: 0
            }} />
            <div style={{ flex: 1 }}>
              <Text style={{ fontSize: 'clamp(0.875rem, 2.5vw, 0.938rem)' }}>项目网站：</Text>
              <a 
                href="https://example.com" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  marginLeft: '0.5rem', 
                  color: '#8A2BE2', 
                  fontWeight: 500,
                  fontSize: 'clamp(0.875rem, 2.5vw, 0.938rem)',
                  wordBreak: 'break-all'
                }}
              >
                www.example.com
              </a>
            </div>
          </div>
        </div>
      </Card>

      <style jsx global>{`
        .about-us-container {
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          padding: 0;
        }
        
        .member-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 16px rgba(138, 43, 226, 0.15);
        }
        
        .social-icon:hover {
          background: rgba(138, 43, 226, 0.2);
          transform: scale(1.1);
        }

        @media (max-width: 575px) {
          .ant-card-body {
            padding: 16px 12px;
          }
          
          .ant-card-head {
            padding: 0 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default AboutUs;