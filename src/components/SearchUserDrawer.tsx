import React, { useState } from "react";
import { Drawer, Input, List, Avatar, Typography, Button, message, Modal, Empty, Spin, Tag, Divider } from "antd";
import { SearchOutlined, RedoOutlined, UserAddOutlined, MessageOutlined, MailOutlined, InfoCircleOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import Cookies from "js-cookie";
import { useRouter } from "next/router";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface SearchResult {
  user_id: number;
  name: string;
  email: string;
  avatar: string;
  is_friend: boolean;
  deleted: boolean;
}

interface SearchUserDrawerProps {
  visible: boolean;
  onClose: () => void;
}

const SearchUserDrawer: React.FC<SearchUserDrawerProps> = ({ visible, onClose }) => {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [messageText, setMessageText] = useState(''); 
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [targetUserId, setTargetUserId] = useState(0);
  const [selectedUser, setSelectedUser] = useState<SearchResult | undefined>(undefined);
  const router = useRouter();

  // 从 cookies 获取自己的 email
  const userEmail = Cookies.get("userEmail") || "";

  const handleSearchUsers = async () => {
    const token = Cookies.get("jwtToken");

    if (!search.trim()) {
      messageApi.error("请输入要搜索的用户名");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/search_user?query_name=${encodeURIComponent(search)}`, {
        method: "GET",
        headers: {
          Authorization: `${token}`,
        },
      });

      const res = await response.json();

      if (res.code === 0) {
        setSearchResults(res.results);
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
        messageApi.error(res.info || "搜索失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = (user: SearchResult) => {
    setTargetUserId(user.user_id);
    setSelectedUser(user);
    // 设置默认附言
    setMessageText(`你好，请求添加你为好友。`);
    setIsModalVisible(true);
  };

  // 修改 handleSendMessage 函数，添加非空验证
  const handleSendMessage = async () => {
    const token = Cookies.get("jwtToken");
    
    // 验证附言不为空
    if (!messageText.trim()) {
      messageApi.error("附言不能为空");
      return;
    }

    try {
      const response = await fetch("/api/add_friend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
        body: JSON.stringify({
          target_id: targetUserId,
          message: messageText.trim(),
        }),
      });

      const res = await response.json();

      if (res.code === 0) {
        messageApi.success(res.message || "好友申请已发送");
        setIsModalVisible(false);
        setMessageText('');
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
        messageApi.error(res.info || "发送好友申请失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    }
  };

  const handleDrawerClose = () => {
    setSearch("");
    setSearchResults([]);
    onClose();
  };

  const getFormattedDate = () => {
    const now = new Date();
    return now.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      {contextHolder}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <UserAddOutlined style={{ marginRight: 8, color: 'white' }} />
            <span style={{ color: "#fff", fontWeight: "bold" }}>添加好友</span>
          </div>
        }
        placement="left"
        onClose={handleDrawerClose}
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
          marginBottom: "20px", 
          background: "#fff", 
          padding: "12px", 
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(138, 43, 226, 0.1)",
        }}>
          <Input
            placeholder="搜索用户"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={handleSearchUsers}
            prefix={<SearchOutlined style={{ color: '#8A2BE2' }} />}
            style={{
              flex: 1,
              borderRadius: "8px",
              border: "1px solid rgba(138, 43, 226, 0.2)",
            }}
          />
          <Button
            type="primary"
            onClick={handleSearchUsers}
            style={{
              margin: "0 8px",
              backgroundColor: "#8A2BE2",
              borderColor: "#8A2BE2",
              boxShadow: "0 2px 6px rgba(138, 43, 226, 0.2)",
              borderRadius: "8px",
            }}
          >
            搜索
          </Button>
          <Button
            type="primary"
            shape="circle"
            icon={<RedoOutlined />}
            onClick={() => {
              if (search.trim()) {
                handleSearchUsers();
              } else {
                messageApi.info("请先输入搜索内容");
              }
            }}
            loading={loading}
            style={{
              backgroundColor: "#8A2BE2",
              borderColor: "#8A2BE2",
              boxShadow: "0 2px 6px rgba(138, 43, 226, 0.2)",
            }}
          />
        </div>

        <div style={{ 
          background: "#fff", 
          borderRadius: "12px", 
          padding: "16px 20px",
          boxShadow: "0 4px 12px rgba(138, 43, 226, 0.1)",
          flex: 1,
          height: "calc(100% - 76px)",
          overflowY: "auto",
        }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: '12px' }}>
              <Spin size="large" />
              <Text type="secondary">搜索中...</Text>
            </div>
          ) : searchResults.length > 0 ? (
            <>
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
                <Text strong style={{ color: '#8A2BE2' }}>
                  搜索结果 ({searchResults.length})
                </Text>
                <Text type="secondary" style={{ fontSize: '13px' }}>
                  搜索: "{search}"
                </Text>
              </div>
              <Divider style={{ margin: '0 0 16px', borderColor: 'rgba(138, 43, 226, 0.1)' }} />
              <List
                dataSource={searchResults}
                renderItem={(result) => (
                  <List.Item
                    style={{
                      borderRadius: "12px",
                      marginBottom: "16px",
                      background: result.deleted 
                        ? "linear-gradient(to right, rgba(255, 77, 79, 0.03), rgba(255, 77, 79, 0.07))"
                        : "linear-gradient(to right, rgba(138, 43, 226, 0.03), rgba(138, 43, 226, 0.07))",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
                      padding: "16px",
                      border: result.deleted 
                        ? "1px solid rgba(255, 77, 79, 0.1)"
                        : "1px solid rgba(138, 43, 226, 0.1)",
                      transition: "all 0.3s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "0 6px 16px rgba(138, 43, 226, 0.12)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.05)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <List.Item.Meta
                      avatar={
                        <div style={{ position: 'relative' }}>
                          <Avatar
                            src={result.avatar}
                            size={50}
                            style={{
                              border: result.deleted 
                                ? "2px solid rgba(255, 77, 79, 0.5)"
                                : "2px solid rgba(138, 43, 226, 0.5)",
                              backgroundColor: "white",
                              boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
                            }}
                          />
                          {result.deleted && (
                            <div
                              style={{
                                position: 'absolute',
                                bottom: 0,
                                right: 0,
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
                            {result.name}
                          </Text>
                          {result.email === userEmail && (
                            <Tag 
                              color="blue" 
                              style={{ marginLeft: '8px', borderRadius: '4px' }}
                            >
                              自己
                            </Tag>
                          )}
                          {(result.is_friend && result.email !== userEmail) && (
                            <Tag 
                              color="green" 
                              icon={<CheckCircleOutlined />}
                              style={{ marginLeft: '8px', borderRadius: '4px' }}
                            >
                              已是好友
                            </Tag>
                          )}
                          {result.deleted && (
                            <Tag 
                              color="error" 
                              style={{ marginLeft: '8px', borderRadius: '4px' }}
                            >
                              已注销
                            </Tag>
                          )}
                        </div>
                      }
                      description={
                        <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                          <MailOutlined style={{ fontSize: '14px', marginRight: '6px', color: '#8A2BE2' }} />
                          <Text type="secondary">{result.email}</Text>
                        </div>
                      }
                    />
                    {!(result.email === userEmail || result.is_friend || result.deleted) && (
                      <Button
                        type="primary"
                        icon={<UserAddOutlined />}
                        style={{
                          backgroundColor: "#8A2BE2",
                          borderColor: "#8A2BE2",
                          borderRadius: "8px",
                          boxShadow: "0 2px 6px rgba(138, 43, 226, 0.2)",
                          marginLeft: '16px'
                        }}
                        onClick={() => handleAddFriend(result)}
                      >
                        添加好友
                      </Button>
                    )}
                    {/* {result.is_friend && (
                      <Tag 
                        color="#8A2BE2" 
                        icon={<CheckCircleOutlined />}
                        style={{ 
                          marginLeft: '16px',
                          borderRadius: '4px',
                          padding: '5px 12px',
                          fontSize: '14px'
                        }}
                      >
                        已是好友
                      </Tag>
                    )} */}
                  </List.Item>
                )}
              />
            </>
          ) : search ? (
            <Empty 
              description="没有找到匹配的用户" 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ margin: '40px 0' }}
            />
          ) : (
            <div style={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center', 
              alignItems: 'center',
              color: '#8A2BE2',
              opacity: 0.7
            }}>
              <SearchOutlined style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.4 }} />
              <Text style={{ fontSize: '16px', color: '#8A2BE2' }}>搜索用户添加好友</Text>
              <Text type="secondary" style={{ marginTop: '8px', textAlign: 'center', maxWidth: '300px' }}>
                输入用户名查找您想添加的好友
              </Text>
            </div>
          )}
        </div>
      </Drawer>

      {/* 好友申请模态框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', color: "#8A2BE2" }}>
            <UserAddOutlined style={{ marginRight: 8 }} />
            <span>发送好友申请</span>
          </div>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => setIsModalVisible(false)}
            style={{ borderRadius: '6px' }}
          >
            取消
          </Button>,
          <Button 
            key="send" 
            type="primary" 
            onClick={handleSendMessage}
            style={{ 
              borderRadius: '6px',
              backgroundColor: "#8A2BE2",
              borderColor: "#8A2BE2",
            }}
          >
            发送申请
          </Button>,
        ]}
        styles={{
          mask: { backdropFilter: 'blur(2px)', background: 'rgba(0,0,0,0.4)' },
          header: { borderBottom: '1px solid rgba(138, 43, 226, 0.1)' },
          footer: { borderTop: '1px solid rgba(138, 43, 226, 0.1)' },
        }}
        maskClosable={true}
        width={420}
        centered
      >
        {selectedUser && (
          <div style={{ padding: '10px 0 20px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              background: 'rgba(138, 43, 226, 0.05)',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <Avatar 
                src={selectedUser.avatar}
                size={46}
                style={{
                  border: '2px solid #8A2BE2',
                  backgroundColor: "white",
                }}
              />
              <div style={{ marginLeft: '16px' }}>
                <Text strong>{selectedUser.name}</Text>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                  <MailOutlined style={{ fontSize: '12px', marginRight: '6px', color: '#8A2BE2' }} />
                  <Text type="secondary" style={{ fontSize: '13px' }}>{selectedUser.email}</Text>
                </div>
              </div>
            </div>
            
            <Text strong style={{ display: 'block', marginBottom: '10px', color: '#555' }}>
              申请附言 <Text type="danger" style={{ fontSize: '13px' }}>*</Text>
            </Text>
            <TextArea
              placeholder="请输入您的好友申请消息..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              maxLength={100}
              style={{ 
                borderRadius: '8px', 
                minHeight: '80px',
                borderColor: messageText.trim() ? 'rgba(138, 43, 226, 0.2)' : 'rgba(255, 77, 79, 0.3)'
              }}
              status={messageText.trim() ? '' : 'error'}
              showCount
              required
            />
            
            <div style={{ 
              marginTop: '16px', 
              padding: '12px', 
              borderRadius: '6px', 
              background: 'rgba(250, 219, 20, 0.08)',
              border: '1px solid rgba(250, 219, 20, 0.2)'
            }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <InfoCircleOutlined style={{ color: '#faad14', marginTop: '3px' }} />
                <div>
                  {/* <Text style={{ fontSize: '13px' }}>
                    发送时间: {getFormattedDate()}
                  </Text>
                  <br /> */}
                  <Text type="secondary" style={{ fontSize: '13px' }}>
                    对方会收到您的好友申请，并决定是否接受
                  </Text>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default SearchUserDrawer;