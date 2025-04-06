import React from "react";
import { Modal, Avatar, Typography, Button } from "antd";

const { Title, Text } = Typography;

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
  } | null;
}

const FriendRequestDetails: React.FC<FriendRequestDetailsProps> = ({ visible, onClose, onAccept, onReject, request }) => {
  if (!request) return null;

  const statusText: { [key: number]: string } = {
    0: "等待处理",
    1: "已同意",
    2: "已拒绝",
    3: "已成为好友",
  };

  return (
    <Modal
      title={<span style={{ color: "#4caf50", fontWeight: "bold" }}>好友申请详情</span>}
      open={visible}
      onCancel={onClose}
      footer={
        request.status === 0
          ? [
              <Button
                key="accept"
                type="primary"
                style={{ backgroundColor: "#4caf50", borderColor: "#4caf50" }}
                onClick={() => onAccept(request.sender_user_id, request.receiver_user_id)}
              >
                接受
              </Button>,
              <Button
                key="reject"
                type="default"
                danger
                onClick={() => onReject(request.sender_user_id, request.receiver_user_id)}
              >
                拒绝
              </Button>,
            ]
          : null
      }
    >
      <div style={{ textAlign: "center" }}>
        <Avatar
          src={request.avatar}
          size={80}
          style={{
            marginBottom: "16px",
            border: "2px solid #4caf50",
          }}
        />
        <Title level={4}>{request.user_name}</Title>
        <Text type="secondary">{request.user_email}</Text>
        <div style={{ marginTop: "16px" }}>
          <Text>申请消息：</Text>
          <Text>{request.message || "无附加消息"}</Text>
        </div>
        <div style={{ marginTop: "16px" }}>
          <Text>申请时间：</Text>
          <Text>{new Date(request.created_at).toLocaleString()}</Text>
        </div>
        <div style={{ marginTop: "16px" }}>
          <Text>状态：</Text>
          <Text>{statusText[request.status]}</Text>
        </div>
      </div>
    </Modal>
  );
};

export default FriendRequestDetails;