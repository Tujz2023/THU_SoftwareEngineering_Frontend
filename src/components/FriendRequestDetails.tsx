import React from "react";
import { Avatar, Typography, Button } from "antd";

const { Title, Text } = Typography;

interface FriendRequestDetailsProps {
  request: {
    sender_user_id: string;
    user_email: string;
    user_name: string;
    avatar: string;
    message: string;
    created_at: string;
  };
  onAccept: (senderId: string) => void;
  onReject: (senderId: string) => void;
  onBack: () => void;
}

const FriendRequestDetails: React.FC<FriendRequestDetailsProps> = ({
  request,
  onAccept,
  onReject,
  onBack,
}) => {
  return (
    <div>
      <Avatar src={request.avatar} size={64} style={{ marginBottom: "16px" }} />
      <Title level={4}>{request.user_name}</Title>
      <Text>Email: {request.user_email}</Text>
      <br />
      <Text>申请消息: {request.message || "无附加消息"}</Text>
      <br />
      <Text>申请时间: {new Date(request.created_at).toLocaleString()}</Text>
      <div style={{ marginTop: "16px" }}>
        <Button type="primary" onClick={() => onAccept(request.sender_user_id)} style={{ marginRight: "8px" }}>
          同意
        </Button>
        <Button danger onClick={() => onReject(request.sender_user_id)}>
          拒绝
        </Button>
      </div>
      <a onClick={onBack} style={{ display: "block", marginTop: "16px" }}>
        返回好友申请列表
      </a>
    </div>
  );
};

export default FriendRequestDetails;