import React, { useState, useEffect, Dispatch, SetStateAction } from "react";
import { useRouter } from "next/router";
import { Drawer, Input, List, Avatar, Typography, Button, message, Modal, Badge, Empty, Divider, Spin, Tag } from "antd";
import { UserAddOutlined, RedoOutlined, SearchOutlined, MessageOutlined, DeleteOutlined, InfoCircleOutlined, MailOutlined, TeamOutlined, ExclamationCircleOutlined, UserOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import Cookies from "js-cookie";
import SearchUserDrawer from "./SearchUserDrawer";
import FriendRequestDetails from "./FriendRequestDetails";
import { FriendRequest } from "../utils/types";
import { Friend } from "../utils/types";

const { Title, Text, Paragraph } = Typography;

interface FriendsListDrawerProps {
  visible: boolean;
  onClose: () => void;
  fetchFriendRequests: () => Promise<void>;
  friendRequests: FriendRequest[];
  unhandleRequests: number;
  websocket: boolean;
  setWebsocket: Dispatch<SetStateAction<boolean>>;
  gotoConversation: (friendId: number) => void;
}

const FriendsListDrawer: React.FC<FriendsListDrawerProps> = ({ 
  visible, 
  onClose, 
  fetchFriendRequests, 
  friendRequests, 
  unhandleRequests, 
  websocket, 
  setWebsocket,
  gotoConversation,
}) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<Friend[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [isRequestsModalVisible, setIsRequestsModalVisible] = useState(false);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<FriendRequest | undefined>(undefined);
  const [isSearchDrawerVisible, setIsSearchDrawerVisible] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | undefined>(undefined);
  const [isFriendModalVisible, setIsFriendModalVisible] = useState(false);
  const [friendDetails, setFriendDetails] = useState<any>(undefined);
  const [messageApi, contextHolder] = message.useMessage();
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [friendToDelete, setFriendToDelete] = useState<Friend | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (visible) {
      fetchFriends();
    }
  }, [visible]);

  useEffect(() => {
    if (searchKeyword) {
      const filtered = friends.filter(
        (friend) =>
          friend.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
          friend.email.toLowerCase().includes(searchKeyword.toLowerCase())
      );
      setFilteredFriends(filtered);
    } else {
      setFilteredFriends(friends);
    }
  }, [searchKeyword, friends]);

  useEffect(() => {
    if (websocket === true) {
      fetchFriends();
      setWebsocket(false);
    }
  }, [websocket]);

  const fetchFriends = async () => {
    const token = Cookies.get("jwtToken");
    setLoading(true);

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
        setFilteredFriends(sortedFriends);
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
        messageApi.error(res.info || "获取好友列表失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (senderId: number, receiverId: number) => {
    const token = Cookies.get("jwtToken");

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
        setIsDetailsModalVisible(false);
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
        messageApi.error(res.info || "接受好友申请失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    }
  };

  const handleRejectRequest = async (senderId: number, receiverId: number) => {
    const token = Cookies.get("jwtToken");

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
        setIsDetailsModalVisible(false);
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

  // useEffect(() => {
  //   if (isFriendModalVisible) {
  //     console.log("true here");
  //   }
  // }, [isFriendModalVisible]);

  const fetchFriendDetails = async (friendId: number) => {
    const token = Cookies.get("jwtToken");

    setFriendDetails(undefined); // 清除之前的数据

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
        messageApi.error(res.info || "获取好友详情失败");
        fetchFriends();
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    }
  };

  const handleDeleteFriend = async (friendId: number) => {
    const token = Cookies.get("jwtToken");

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
        fetchFriends();
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
    setFriendToDelete(undefined);
  };

  useEffect(() => {
    if (selectedFriend) {
      fetchFriendDetails(selectedFriend.id)
    }
  }, [selectedFriend]);

  const handleViewFriendDetails = (friend: Friend) => {
    setSelectedFriend(friend);
    // fetchFriendDetails(friend.id);
  };

  const handleFriendListDrawerClose = () => {
    setSearchKeyword("");
    onClose();
  };

  const handleGotoConversation = (friend: Friend | undefined) => {
    if (friend === undefined) {
      messageApi.error('请选择一个好友')
    }
    else {
      setSelectedFriend(undefined);
      setIsFriendModalVisible(false);
      handleFriendListDrawerClose();
      gotoConversation(friend.id);
    }
  }

  const getStatusBadge = (status: number) => {
    const statusConfig: { [key: number]: { text: string; color: string; icon: React.ReactNode } } = {
      0: { text: "等待处理", color: "#faad14", icon: <ClockCircleOutlined /> },
      1: { text: "已同意", color: "#8A2BE2", icon: <CheckCircleOutlined /> },
      2: { text: "已拒绝", color: "#ff4d4f", icon: <CloseCircleOutlined /> },
      3: { text: "已成为好友", color: "#52c41a", icon: <UserAddOutlined /> },
    };
    
    return statusConfig[status] || { text: "未知", color: "#999", icon: <InfoCircleOutlined /> };
  };

  return (
    <>
      {contextHolder}

      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <UserOutlined style={{ marginRight: 8, color: 'white' }} />
            <span style={{ color: "#fff", fontWeight: "bold" }}>好友管理</span>
          </div>
        }
        placement="left"
        onClose={handleFriendListDrawerClose}
        open={visible}
        width="38vw"
        styles={{
          body: {
            background: "linear-gradient(135deg, #f9f9ff, #f0f0ff)",
            borderRadius: "0 0 0 16px",
            padding: "16px",
          },
          header: {
            background: "linear-gradient(90deg, #8A2BE2, #7B1FA2)",
            color: "#fff",
            borderRadius: "16px 0 0 0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          },
          mask: {
            backdropFilter: "blur(2px)",
            background: "rgba(0,0,0,0.4)",
          },
          wrapper: {
            boxShadow: "0 0 20px rgba(0,0,0,0.15)",
          }
        }}
        maskClosable={true}
        closeIcon={<div style={{ color: "white", fontSize: "16px" }}>✕</div>}
      >
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          marginBottom: "16px", 
          background: "#fff", 
          padding: "12px", 
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(138, 43, 226, 0.1)",
        }}>
          <Input
            placeholder="搜索好友"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            prefix={<SearchOutlined style={{ color: '#8A2BE2' }} />}
            style={{
              flex: 1,
              borderRadius: "8px",
              border: "1px solid rgba(138, 43, 226, 0.2)",
            }}
          />
          <Button
            type="primary"
            shape="circle"
            icon={<RedoOutlined />}
            onClick={() => {
              fetchFriends();
              setSearchKeyword("");
            }}
            style={{
              marginLeft: "8px",
              backgroundColor: "#8A2BE2",
              borderColor: "#8A2BE2",
              boxShadow: "0 2px 6px rgba(138, 43, 226, 0.2)",
            }}
          />
          <Button
            type="primary"
            shape="circle"
            icon={<UserAddOutlined />}
            onClick={() => setIsSearchDrawerVisible(true)}
            style={{
              marginLeft: "8px",
              backgroundColor: "#8A2BE2",
              borderColor: "#8A2BE2",
              boxShadow: "0 2px 6px rgba(138, 43, 226, 0.2)",
            }}
          />
        </div>
        
        <div style={{ marginBottom: "16px" }}>
          <Button
            type="primary"
            style={{
              width: "100%",
              backgroundColor: "#8A2BE2",
              borderColor: "#8A2BE2",
              borderRadius: "8px",
              height: "44px",
              boxShadow: "0 2px 8px rgba(138, 43, 226, 0.2)",
            }}
            onClick={() => {
              setIsRequestsModalVisible(true);
              fetchFriendRequests();
            }}
            icon={<UserAddOutlined />}
          >
            好友请求
            {unhandleRequests > 0 && (
              <Badge
                count={unhandleRequests}
                style={{
                  backgroundColor: "#ff4d4f",
                  boxShadow: "0 0 0 2px white",
                  marginLeft: "8px",
                }}
              />
            )}
          </Button>
        </div>

        <div style={{ 
          background: "#fff", 
          borderRadius: "8px", 
          padding: "16px",
          boxShadow: "0 2px 8px rgba(138, 43, 226, 0.1)",
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <Text strong style={{ color: '#8A2BE2', fontSize: '16px' }}>
              好友列表 ({friends.length})
            </Text>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <Spin size="large" />
            </div>
          ) : filteredFriends.length > 0 ? (
            <List
              style={{ flex: 1, overflowY: 'auto' }}
              dataSource={filteredFriends}
              renderItem={(friend) => (
                <List.Item
                  style={{
                    borderRadius: "8px",
                    marginBottom: "12px",
                    background: friend.deleted ? 
                      "linear-gradient(to right, rgba(255, 77, 79, 0.02), rgba(255, 77, 79, 0.05))" :
                      "linear-gradient(to right, rgba(138, 43, 226, 0.03), rgba(138, 43, 226, 0.07))",
                    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.05)",
                    padding: "12px",
                    cursor: "pointer",
                    border: friend.deleted ? 
                      "1px solid rgba(255, 77, 79, 0.1)" :
                      "1px solid rgba(138, 43, 226, 0.1)",
                    transition: "all 0.3s ease",
                  }}
                  onClick={() => handleViewFriendDetails(friend)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = friend.deleted ?
                      "0 4px 12px rgba(255, 77, 79, 0.1)" :
                      "0 4px 12px rgba(138, 43, 226, 0.15)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.05)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <List.Item.Meta
                    avatar={
                      <div style={{ position: 'relative' }}>
                        <Avatar
                          src={friend.avatar}
                          size={48}
                          style={{
                            border: friend.deleted ? 
                              "2px solid #ff4d4f" : 
                              "2px solid #8A2BE2",
                            backgroundColor: "white",
                          }}
                        />
                        {friend.deleted && (
                          <div
                            style={{
                              position: 'absolute',
                              bottom: -2,
                              right: -2,
                              width: '14px',
                              height: '14px',
                              backgroundColor: '#ff4d4f',
                              borderRadius: '50%',
                              border: '2px solid white',
                            }}
                          />
                        )}
                      </div>
                    }
                    title={
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Text strong style={{ fontSize: "16px" }}>
                          {friend.name}
                        </Text>
                        {friend.deleted && (
                          <Tag
                            color="error"
                            style={{
                              marginLeft: "8px",
                              fontSize: "12px",
                              padding: "0 6px",
                              borderRadius: "4px",
                            }}
                          >
                            已注销
                          </Tag>
                        )}
                      </div>
                    }
                    description={
                      <div style={{ display: 'flex', alignItems: 'center', color: '#888' }}>
                        <MailOutlined style={{ marginRight: '6px', fontSize: '12px' }} />
                        <Text type="secondary" style={{ fontSize: "13px" }}>
                          {friend.email}
                        </Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <Empty 
              description={
                <span style={{ color: '#666' }}>
                  {searchKeyword ? "没有找到匹配的好友" : "暂无好友"}
                </span>
              } 
              style={{ margin: '40px 0' }}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </div>
      </Drawer>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', color: "#ff4d4f" }}>
            <ExclamationCircleOutlined style={{ marginRight: 8 }} />
            <span>确认删除好友</span>
          </div>
        }
        open={isDeleteModalVisible}
        onCancel={handleCancelDelete}
        footer={[
          <Button key="cancel" onClick={handleCancelDelete} style={{ borderRadius: '6px' }}>
            取消
          </Button>,
          <Button
            key="confirm"
            type="primary"
            danger
            onClick={() => friendToDelete && handleDeleteFriend(friendToDelete.id)}
            style={{ borderRadius: '6px' }}
          >
            确认删除
          </Button>,
        ]}
        styles={{
          mask: { backdropFilter: 'blur(2px)', background: 'rgba(0,0,0,0.4)' },
          body: { padding: '24px' },
          header: { borderBottom: '1px solid #ffccc7' },
          footer: { borderTop: '1px solid #ffccc7' },
        }}
        maskClosable={false}
      >
        <div style={{ 
          padding: '16px',
          background: 'rgba(255, 77, 79, 0.05)', 
          borderRadius: '8px',
          border: '1px solid rgba(255, 77, 79, 0.2)',
          marginBottom: '16px'
        }}>
          <div style={{ marginBottom: '12px', fontWeight: 'bold', color: '#ff4d4f' }}>
            您确定要删除好友 {friendToDelete?.name} 吗？
          </div>
          <Text type="secondary">
            删除后将无法查看该好友的信息，且需要重新发送好友申请才能恢复好友关系。
          </Text>
        </div>
      </Modal>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', color: "#8A2BE2" }}>
            <UserAddOutlined style={{ marginRight: 8 }} />
            <span>好友请求</span>
            <Button 
              type="text"
              icon={<RedoOutlined style={{ color: '#8A2BE2' }} />}
              onClick={() => fetchFriendRequests()}
              style={{ marginLeft: '8px' }}
            />
          </div>
        }
        open={isRequestsModalVisible}
        onCancel={() => setIsRequestsModalVisible(false)}
        footer={[
          <Button 
            key="close" 
            onClick={() => setIsRequestsModalVisible(false)}
            style={{ borderRadius: '6px' }}
          >
            关闭
          </Button>
        ]}
        styles={{
          mask: { backdropFilter: 'blur(2px)', background: 'rgba(0,0,0,0.4)' },
          body: { padding: '20px' },
          header: { borderBottom: '1px solid rgba(138, 43, 226, 0.1)' },
          footer: { borderTop: '1px solid rgba(138, 43, 226, 0.1)' },
        }}
        width={500}
      >
        {friendRequests.length > 0 ? (
          <List
            dataSource={friendRequests}
            renderItem={(request) => {
              const status = getStatusBadge(request.status);
              return (
                <List.Item
                  style={{
                    borderRadius: "8px",
                    marginBottom: "12px",
                    background: "white",
                    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.05)",
                    padding: "12px",
                    border: `1px solid ${status.color}20`,
                  }}
                  actions={[
                    <Button
                      type="link"
                      style={{ color: status.color }}
                      onClick={() => handleViewDetails(request)}
                    >
                      {request.status === 0 ? "处理" : "查看"}
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        src={request.avatar} 
                        size={46}
                        style={{ 
                          border: `2px solid ${status.color}40`,
                          backgroundColor: 'white',
                        }}
                      />
                    }
                    title={
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Text strong>{request.user_name}</Text>
                        <Tag
                          icon={status.icon}
                          color={status.color}
                          style={{
                            marginLeft: '8px',
                            padding: '0 8px',
                            fontSize: '12px',
                            borderRadius: '10px',
                          }}
                        >
                          {status.text}
                        </Tag>
                      </div>
                    }
                    description={
                      <div style={{ color: '#666', fontSize: '13px' }}>
                        {request.message ? (
                          <div style={{ 
                            marginTop: '4px',
                            padding: '4px 8px',
                            background: '#f9f9f9',
                            borderRadius: '4px',
                            fontSize: '12px',
                            borderLeft: `2px solid ${status.color}40` 
                          }}>
                            {request.message}
                          </div>
                        ) : (
                          <span style={{ color: '#999', fontStyle: 'italic', fontSize: '12px' }}>无附加消息</span>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              );
            }}
          />
        ) : (
          <Empty 
            description="暂无好友请求" 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ margin: '40px 0' }}
          />
        )}
      </Modal>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', color: "#8A2BE2" }}>
            <UserOutlined style={{ marginRight: 8 }} />
            <span>好友详情</span>
          </div>
        }
        open={isFriendModalVisible}
        onCancel={() => {setIsFriendModalVisible(false); setSelectedFriend(undefined);}}
        footer={[
          <Button
            key="conversation"
            type="primary"
            icon={<MessageOutlined />}
            onClick={() => handleGotoConversation(selectedFriend)}
            style={{ 
              borderRadius: '6px', 
              backgroundColor: '#8A2BE2', 
              borderColor: '#8A2BE2',
              boxShadow: '0 2px 6px rgba(138, 43, 226, 0.2)',
            }}
          >
            发送消息
          </Button>,
          <Button
            key="delete"
            type="primary"
            danger
            icon={<DeleteOutlined />}
            onClick={() => selectedFriend && showDeleteModal(selectedFriend)}
            style={{ borderRadius: '6px' }}
          >
            删除好友
          </Button>,
        ]}
        styles={{
          mask: { backdropFilter: 'blur(2px)', background: 'rgba(0,0,0,0.4)' },
          body: { padding: '24px' },
          header: { borderBottom: '1px solid rgba(138, 43, 226, 0.1)' },
          footer: { borderTop: '1px solid rgba(138, 43, 226, 0.1)' },
        }}
        width={460}
      >
        {friendDetails ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center'
          }}>
            <div style={{ position: 'relative', marginBottom: '20px' }}>
              <Avatar
                src={friendDetails.avatar}
                size={100}
                style={{
                  border: friendDetails.deleted ? 
                    '4px solid rgba(255, 77, 79, 0.5)' : 
                    '4px solid rgba(138, 43, 226, 0.5)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              />
              {friendDetails.deleted && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    right: 4,
                    width: '20px',
                    height: '20px',
                    backgroundColor: '#ff4d4f',
                    borderRadius: '50%',
                    border: '3px solid white',
                  }}
                />
              )}
            </div>
            
            <Title level={3} style={{ margin: '0 0 4px 0', color: friendDetails.deleted ? '#ff4d4f' : '#8A2BE2' }}>
              {friendDetails.name}
            </Title>
            
            {friendDetails.deleted && (
              <Tag color="error" style={{ marginBottom: '16px' }}>已注销</Tag>
            )}
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              marginBottom: '20px' 
            }}>
              <MailOutlined style={{ color: '#8A2BE2', marginRight: '8px' }} />
              <Text>{friendDetails.email}</Text>
            </div>
            
            <Divider style={{ margin: '0 0 20px 0', width: '80%', borderColor: 'rgba(138, 43, 226, 0.1)' }} />
            
            <div style={{ width: '100%' }}>
              <div style={{ 
                textAlign: 'left', 
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'flex-start'
              }}>
                <InfoCircleOutlined style={{ 
                  color: '#8A2BE2', 
                  marginRight: '10px',
                  marginTop: '4px'
                }} />
                <div style={{ flex: 1 }}>
                  <Text strong style={{ display: 'block', marginBottom: '8px', color: '#555' }}>个人简介</Text>
                  <div style={{ 
                    padding: '12px',
                    background: 'rgba(138, 43, 226, 0.05)',
                    borderRadius: '8px',
                    border: '1px solid rgba(138, 43, 226, 0.1)',
                    minHeight: '60px'
                  }}>
                    {friendDetails.user_info ? (
                      <Paragraph style={{ margin: 0 }}>{friendDetails.user_info}</Paragraph>
                    ) : (
                      <Text type="secondary" italic>该用户暂未设置个人简介</Text>
                    )}
                  </div>
                </div>
              </div>
              
              <div style={{ 
                textAlign: 'left',
                display: 'flex',
                alignItems: 'flex-start',
              }}>
                <TeamOutlined style={{ 
                  color: '#8A2BE2', 
                  marginRight: '10px',
                  marginTop: '4px'
                }} />
                <div style={{ flex: 1 }}>
                  <Text strong style={{ display: 'block', marginBottom: '8px', color: '#555' }}>所在分组</Text>
                  <div style={{ 
                    padding: '12px',
                    background: 'rgba(138, 43, 226, 0.05)',
                    borderRadius: '8px',
                    border: '1px solid rgba(138, 43, 226, 0.1)',
                    minHeight: '40px'
                  }}>
                    {friendDetails.groups && friendDetails.groups.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {friendDetails.groups.map((group: any) => (
                          <Tag
                            key={group.id}
                            color="#8A2BE2"
                            style={{ 
                              borderRadius: '12px', 
                              padding: '2px 10px',
                              margin: 0
                            }}
                          >
                            {group.name}
                          </Tag>
                        ))}
                      </div>
                    ) : (
                      <Text type="secondary" italic>暂无分组</Text>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <Spin size="large" />
          </div>
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