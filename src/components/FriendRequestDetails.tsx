import React from "react";
import { Modal, Avatar, Typography, Button, Badge, Space, Divider, Tag } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, UserAddOutlined, MessageOutlined, CalendarOutlined } from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;

interface FriendRequestDetailsProps {
  visible: boolean;
  onClose: () => void;
  onAccept: (senderId: string, receiverId: string) => void;
  onReject: (senderId: string, receiverId: string) => void;
  request: {
    sender_user_id: string;
    receiver_user_id: string;
    user_name: string;
    user_email: string;
    avatar: string;
    message: string;
    created_at: string;
    status: number;
  } | undefined;
}

const FriendRequestDetails: React.FC<FriendRequestDetailsProps> = ({ visible, onClose, onAccept, onReject, request }) => {
  if (!request) return undefined;

  const statusConfig: { [key: number]: { text: string; color: string; icon: React.ReactNode } } = {
    0: { text: "等待处理", color: "#faad14", icon: <ClockCircleOutlined /> },
    1: { text: "已同意", color: "#8A2BE2", icon: <CheckCircleOutlined /> },
    2: { text: "已拒绝", color: "#ff4d4f", icon: <CloseCircleOutlined /> },
    3: { text: "已成为好友", color: "#52c41a", icon: <UserAddOutlined /> },
  };

  // 格式化日期时间
  const formatDateTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', color: "#8A2BE2" }}>
          <UserAddOutlined style={{ marginRight: 8, fontSize: 18 }} />
          <span style={{ fontWeight: "bold" }}>好友申请详情</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={
        request.status === 0
          ? [
              <Button
                key="reject"
                danger
                icon={<CloseCircleOutlined />}
                style={{ 
                  borderRadius: '6px', 
                  boxShadow: '0 2px 6px rgba(255, 77, 79, 0.2)'
                }}
                onClick={() => onReject(request.sender_user_id, request.receiver_user_id)}
              >
                拒绝
              </Button>,
              <Button
                key="accept"
                type="primary"
                icon={<CheckCircleOutlined />}
                style={{ 
                  backgroundColor: "#8A2BE2", 
                  borderColor: "#8A2BE2", 
                  borderRadius: '6px',
                  boxShadow: '0 2px 6px rgba(138, 43, 226, 0.2)'
                }}
                onClick={() => onAccept(request.sender_user_id, request.receiver_user_id)}
              >
                接受
              </Button>,
            ]
          : [
              <Button 
                key="close" 
                onClick={onClose}
                style={{ 
                  borderRadius: '6px'
                }}
              >
                关闭
              </Button>
            ]
      }
      styles={{
        header: {
          borderBottom: '1px solid rgba(138, 43, 226, 0.1)',
          padding: '16px 24px'
        },
        body: {
          padding: '24px'
        },
        footer: {
          borderTop: '1px solid rgba(138, 43, 226, 0.1)',
          padding: '12px 24px'
        },
        mask: {
          backdropFilter: 'blur(2px)',
          background: 'rgba(0,0,0,0.4)'
        }
      }}
      maskClosable={true}
      width={400}
    >
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        background: 'rgba(138, 43, 226, 0.02)', 
        borderRadius: '12px', 
        padding: '20px',
        border: '1px solid rgba(138, 43, 226, 0.07)'
      }}>
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <Avatar
            src={request.avatar}
            size={96}
            style={{
              border: '3px solid #fff',
              boxShadow: '0 3px 10px rgba(138, 43, 226, 0.2)',
            }}
          />
          <Badge
            count={statusConfig[request.status].icon}
            style={{ 
              backgroundColor: statusConfig[request.status].color,
              color: '#fff',
              fontSize: '14px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
              padding: '6px'
            }}
            offset={[-6, 0]}
          />
        </div>
        
        <Title level={4} style={{ margin: '0 0 4px', color: '#8A2BE2' }}>
          {request.user_name}
        </Title>
        
        <Text type="secondary" style={{ fontSize: '14px', marginBottom: '16px' }}>
          {request.user_email}
        </Text>
        
        <Tag
          color={statusConfig[request.status].color}
          icon={statusConfig[request.status].icon}
          style={{ 
            marginBottom: '20px', 
            fontSize: '14px',
            padding: '4px 12px',
            borderRadius: '12px'
          }}
        >
          {statusConfig[request.status].text}
        </Tag>

        <Divider 
          style={{ margin: '0 0 16px', width: '100%', borderColor: 'rgba(138, 43, 226, 0.1)' }} 
          dashed 
        />
        
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '12px' }}>
            <MessageOutlined style={{ color: '#8A2BE2', fontSize: '16px', marginRight: '10px', marginTop: '3px' }} />
            <div style={{ flex: 1 }}>
              <Text strong style={{ marginBottom: '4px', display: 'block', color: '#555' }}>
                申请消息
              </Text>
              <Paragraph
                style={{
                  margin: 0,
                  padding: '10px 12px',
                  background: 'rgba(255, 255, 255, 0.8)',
                  borderRadius: '8px',
                  border: '1px solid rgba(138, 43, 226, 0.1)',
                  color: request.message ? '#333' : '#999',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                {request.message || "无附加消息"}
              </Paragraph>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <CalendarOutlined style={{ color: '#8A2BE2', fontSize: '16px', marginRight: '10px' }} />
            <div>
              <Text strong style={{ marginRight: '8px', color: '#555' }}>
                申请时间:
              </Text>
              <Text style={{ color: '#666' }}>
                {formatDateTime(request.created_at)}
              </Text>
            </div>
          </div>
        </Space>
      </div>
    </Modal>
  );
};

export default FriendRequestDetails;