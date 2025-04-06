import React, { useState, useEffect } from "react";
import { Drawer, Input, List, Avatar, Typography, Button, message, Modal } from "antd";
import { UserAddOutlined } from "@ant-design/icons"; // 引入图标
import Cookies from "js-cookie";
import SearchUserDrawer from "./SearchUserDrawer";
import FriendRequestDetails from "./FriendRequestDetails";

const { Title } = Typography;

interface Friend {
  id: string;
  email: string;
  name: string;
  avatar: string;
  deleted?: boolean;
}

interface FriendRequest {
  sender_user_id: string;
  receiver_user_id: string; 
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

const drawerStyles = {
  body: {
    background: "linear-gradient(135deg, #f0f8ff, #e6f7ff)",
    borderRadius: "16px 0 0 16px",
    padding: "16px",
  },
  header: {
    background: "#4caf50",
    color: "#fff",
    borderRadius: "16px 0 0 0",
  },
};

const modalStyles = {
  body: {
    background: "linear-gradient(135deg, #f9f9f9, #e6f7ff)",
    padding: "16px",
    borderRadius: "8px",
  },
};

const FriendsListDrawer: React.FC<FriendsListDrawerProps> = ({ visible, onClose }) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<Friend[]>([]); // 新增状态，用于存储过滤后的好友列表
  const [searchKeyword, setSearchKeyword] = useState(""); // 新增状态，用于存储搜索关键字
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [isRequestsModalVisible, setIsRequestsModalVisible] = useState(false);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<FriendRequest | null>(null);
  const [isSearchDrawerVisible, setIsSearchDrawerVisible] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [isFriendModalVisible, setIsFriendModalVisible] = useState(false);
  const [friendDetails, setFriendDetails] = useState<any>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false); // 控制删除确认 Modal 的显示
  const [friendToDelete, setFriendToDelete] = useState<Friend | null>(null); // 当前要删除的好友

  useEffect(() => {
    if (visible) {
      fetchFriends();
      fetchFriendRequests();
    }
  }, [visible]);

  useEffect(() => {
    // 根据搜索关键字过滤好友列表
    const filtered = friends.filter(
      (friend) =>
        friend.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        friend.email.toLowerCase().includes(searchKeyword.toLowerCase())
    );
    setFilteredFriends(filtered);
  }, [searchKeyword, friends]); // 当搜索关键字或好友列表变化时重新过滤

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
        setFilteredFriends(sortedFriends); // 初始化过滤后的好友列表
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
        setFriendRequests([]);
      } else {
        messageApi.error(res.info || "获取好友申请失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    }
  };

  const handleAcceptRequest = async (senderId: string, receiverId: string) => {
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
          receiver_user_id: receiverId,
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

  const handleRejectRequest = async (senderId: string, receiverId: string) => {
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
          receiver_user_id: receiverId,
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

  const handleViewDetails = (request: FriendRequest) => {
    setSelectedRequest(request);
    setIsDetailsModalVisible(true);
  };

  const fetchFriendDetails = async (friendId: string) => {
    const token = Cookies.get("jwtToken");
    if (!token) {
      messageApi.error("未登录，请先登录");
      return;
    }

    try {
      const response = await fetch(`/api/manage_friends?friend_id=${friendId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
      });

      const res = await response.json();

      if (res.code === 0) {
        setFriendDetails(res);
        setIsFriendModalVisible(true);
      } else {
        messageApi.error(res.info || "获取好友详情失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    }
  };

  const handleDeleteFriend = async (friendId: string) => {
    const token = Cookies.get("jwtToken");
    if (!token) {
      messageApi.error("未登录，请先登录");
      return;
    }

    try {
      const response = await fetch("/api/manage_friends", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
        body: JSON.stringify({ friend_id: friendId }),
      });

      const res = await response.json();

      if (res.code === 0) {
        messageApi.success(res.message || "删除好友成功");
        setIsDeleteModalVisible(false);
        setIsFriendModalVisible(false);
        fetchFriends(); // 刷新好友列表
      } else {
        messageApi.error(res.info || "删除好友失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    }
  };

  const showDeleteModal = (friend: Friend) => {
    setFriendToDelete(friend);
    setIsDeleteModalVisible(true);
  };

  const handleCancelDelete = () => {
    setIsDeleteModalVisible(false);
    setFriendToDelete(null);
  };

  const handleViewFriendDetails = (friend: Friend) => {
    setSelectedFriend(friend);
    fetchFriendDetails(friend.id);
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
        styles={{
          body: drawerStyles.body,
          header: drawerStyles.header,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: "16px" }}>
          <Input.Search
            placeholder="搜索好友"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)} // 更新搜索关键字
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
          dataSource={filteredFriends} // 使用过滤后的好友列表
          renderItem={(friend) => (
            <List.Item
              style={{
                borderRadius: "8px",
                marginBottom: "8px",
                background: "#fff",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                padding: "12px",
                cursor: "pointer",
              }}
              onClick={() => handleViewFriendDetails(friend)}
            >
              <List.Item.Meta
                avatar={
                  <Avatar
                    src={friend.avatar}
                    size={48}
                    style={{
                      border: "2px solid #4caf50",
                      padding: "2px",
                      borderRadius: "50%",
                    }}
                  />
                }
                title={
                  <span style={{ fontWeight: "bold", fontSize: "16px" }}>
                    {friend.name}{" "}
                    {friend.deleted && (
                      <span style={{ color: "#f5222d", fontSize: "12px", marginLeft: "8px" }}>
                        （已注销）
                      </span>
                    )}
                  </span>
                }
                description={<span style={{ color: "#888", fontSize: "14px" }}>{friend.email}</span>}
              />
            </List.Item>
          )}
        />
      </Drawer>

      {/* 删除确认 Modal */}
      <Modal
        title={<span style={{ color: "#faad14", fontWeight: "bold" }}>确认删除好友</span>}
        open={isDeleteModalVisible}
        onCancel={handleCancelDelete}
        footer={[
          <Button key="cancel" onClick={handleCancelDelete}>
            取消
          </Button>,
          <Button
            key="confirm"
            type="primary"
            danger
            onClick={() => friendToDelete && handleDeleteFriend(friendToDelete.id)}
          >
            确认删除
          </Button>,
        ]}
        styles={{
          body: modalStyles.body,
        }}
      >
        <p>删除后将无法恢复，确定要删除该好友吗？</p>
      </Modal>

      {/* 好友申请 Modal */}
      <Modal
        title={<span style={{ color: "#4caf50", fontWeight: "bold" }}>好友申请</span>}
        open={isRequestsModalVisible}
        onCancel={() => setIsRequestsModalVisible(false)}
        footer={[]}
        styles={{
          body: modalStyles.body,
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
                  onClick={() => handleViewDetails(request)}
                >
                  查看详情
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

      {/* 好友详情 Modal */}
      <Modal
        title={<span style={{ color: "#4caf50", fontWeight: "bold" }}>好友详情</span>}
        open={isFriendModalVisible}
        onCancel={() => setIsFriendModalVisible(false)}
        footer={[
          <Button
            key="delete"
            type="primary"
            danger
            onClick={() => selectedFriend && showDeleteModal(selectedFriend)} // 调用删除确认窗口
          >
            删除好友
          </Button>,
        ]}
        styles={{
          body: modalStyles.body,
        }}
      >
        {friendDetails ? (
          <div>
            <Avatar
              src={friendDetails.avatar}
              size={64}
              style={{
                border: "2px solid #4caf50",
                padding: "2px",
                borderRadius: "50%",
                marginBottom: "16px",
              }}
            />
            <Title level={4}>{friendDetails.name}</Title>
            <p>邮箱: {friendDetails.email}</p>
            <p>分组: {friendDetails.groups.map((group: any) => group.name).join(", ") || "无"}</p>
            {friendDetails.deleted && <p style={{ color: "#f5222d" }}>（已注销）</p>}
          </div>
        ) : (
          <p>加载中...</p>
        )}
      </Modal>

      <FriendRequestDetails
        visible={isDetailsModalVisible}
        onClose={() => setIsDetailsModalVisible(false)}
        request={selectedRequest}
        onAccept={(senderId, receiverId) => handleAcceptRequest(senderId, receiverId)}
        onReject={(senderId, receiverId) => handleRejectRequest(senderId, receiverId)}
      />

      <SearchUserDrawer
        visible={isSearchDrawerVisible}
        onClose={() => setIsSearchDrawerVisible(false)}
      />
    </>
  );
};

export default FriendsListDrawer;