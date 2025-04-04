import React, { useState, useEffect } from "react";
import { Drawer, Input, List, Avatar, Typography, Button, message, Modal } from "antd";
import { UserAddOutlined } from "@ant-design/icons";
import Cookies from "js-cookie";
import SearchUserDrawer from "./SearchUserDrawer";

const { Title } = Typography;

interface Friend {
  id: string;
  email: string;
  name: string;
  avatar: string;
}

interface FriendRequest {
  sender_user_id: string;
  user_email: string;
  user_name: string;
  avatar: string;
  message: string;
  created_at: string;
  status: number;
}

interface FriendsListDrawerProps {
  visible: boolean;
  onClose: () => void;
}

const FriendsListDrawer: React.FC<FriendsListDrawerProps> = ({ visible, onClose }) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [isRequestsModalVisible, setIsRequestsModalVisible] = useState(false);
  const [isSearchDrawerVisible, setIsSearchDrawerVisible] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    if (visible) {
      fetchFriends();
      fetchFriendRequests();
    }
  }, [visible]);

  const fetchFriends = async () => {
    const token = Cookies.get("jwtToken");
    if (!token) {
      messageApi.error("未登录，请先登录");
      return;
    }

    try {
      const response = await fetch("/api/friends", {
        method: "GET",
        headers: {
          Authorization: `${token}`,
        },
      });

      const res = await response.json();

      if (res.code === 0) {
        const sortedFriends = res.friends.sort((a: Friend, b: Friend) =>
          a.name.localeCompare(b.name, "zh-CN")
        );
        setFriends(sortedFriends);
      } else {
        messageApi.error(res.info || "获取好友列表失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    }
  };

  const fetchFriendRequests = async () => {
    const token = Cookies.get("jwtToken");
    if (!token) {
      messageApi.error("未登录，请先登录");
      return;
    }

    try {
      const response = await fetch("/api/friend_requests", {
        method: "GET",
        headers: {
          Authorization: `${token}`,
        },
      });

      const res = await response.json();

      if (res.code === 0) {
        setFriendRequests(res.requests);
      } else if (res.code === -7) {
        setFriendRequests([]); // 没有好友申请
      } else {
        messageApi.error(res.info || "获取好友申请失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    }
  };

  const handleAcceptRequest = async (senderId: string) => {
    const token = Cookies.get("jwtToken");
    if (!token) {
      messageApi.error("未登录，请先登录");
      return;
    }

    try {
      const response = await fetch("/api/friend_request_handle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
        body: JSON.stringify({
          sender_user_id: senderId,
          receiver_user_id: Cookies.get("userId"),
        }),
      });

      const res = await response.json();

      if (res.code === 0) {
        messageApi.success(res.message || "已接受好友申请");
        fetchFriendRequests();
        fetchFriends();
      } else {
        messageApi.error(res.info || "接受好友申请失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    }
  };

  const handleRejectRequest = async (senderId: string) => {
    const token = Cookies.get("jwtToken");
    if (!token) {
      messageApi.error("未登录，请先登录");
      return;
    }

    try {
      const response = await fetch("/api/friend_request_handle", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
        body: JSON.stringify({
          sender_user_id: senderId,
          receiver_user_id: Cookies.get("userId"),
        }),
      });

      const res = await response.json();

      if (res.code === 0) {
        messageApi.success(res.message || "已拒绝好友申请");
        fetchFriendRequests();
      } else {
        messageApi.error(res.info || "拒绝好友申请失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    }
  };

  return (
    <>
      {contextHolder}
      <Drawer
        title={<span style={{ color: "#4caf50", fontWeight: "bold" }}>好友列表</span>}
        placement="left"
        onClose={onClose}
        open={visible}
        width="38vw"
        bodyStyle={{
          background: "linear-gradient(135deg, #f0f8ff, #e6f7ff)",
          borderRadius: "16px 0 0 16px",
          padding: "16px",
        }}
        headerStyle={{
          background: "#4caf50",
          color: "#fff",
          borderRadius: "16px 0 0 0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: "16px" }}>
          <Input.Search
            placeholder="搜索好友"
            style={{
              flex: 1,
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            }}
          />
          <Button
            type="text"
            shape="circle"
            icon={<UserAddOutlined style={{ fontSize: "18px", color: "#fff" }} />}
            onClick={() => setIsSearchDrawerVisible(true)}
            style={{
              marginLeft: "8px",
              backgroundColor: "#4caf50",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            }}
          />
        </div>

        <Button
          type="primary"
          style={{
            width: "100%",
            marginBottom: "16px",
            backgroundColor: "#4caf50",
            borderColor: "#4caf50",
            borderRadius: "8px",
          }}
          onClick={() => setIsRequestsModalVisible(true)}
        >
          新的朋友
        </Button>

        <List
          dataSource={friends}
          renderItem={(item) => (
            <List.Item
              style={{
                borderRadius: "8px",
                marginBottom: "8px",
                background: "#fff",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              }}
            >
              <List.Item.Meta
                avatar={<Avatar src={item.avatar} />}
                title={item.name}
                description={item.email}
              />
            </List.Item>
          )}
        />
      </Drawer>

      <Modal
        title={<span style={{ color: "#4caf50", fontWeight: "bold" }}>好友申请</span>}
        visible={isRequestsModalVisible}
        onCancel={() => setIsRequestsModalVisible(false)}
        footer={undefined}
        bodyStyle={{
          background: "linear-gradient(135deg, #f9f9f9, #e6f7ff)",
          padding: "16px",
          borderRadius: "8px",
        }}
      >
        <List
          dataSource={friendRequests}
          renderItem={(request) => (
            <List.Item
              style={{
                borderRadius: "8px",
                marginBottom: "8px",
                background: "#fff",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              }}
              actions={[
                <Button
                  type="link"
                  style={{ color: "#4caf50" }}
                  onClick={() => handleAcceptRequest(request.sender_user_id)}
                >
                  接受
                </Button>,
                <Button
                  type="link"
                  danger
                  onClick={() => handleRejectRequest(request.sender_user_id)}
                >
                  拒绝
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={<Avatar src={request.avatar} />}
                title={request.user_name}
                description={request.message || "无附加消息"}
              />
            </List.Item>
          )}
        />
      </Modal>

      <SearchUserDrawer
        visible={isSearchDrawerVisible}
        onClose={() => setIsSearchDrawerVisible(false)}
      />
    </>
  );
};

export default FriendsListDrawer;