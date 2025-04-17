import { useState, useEffect } from "react";
import { Modal, Input, Button, Avatar, message, List, Row, Col, Tag, Typography, Divider, Tooltip, Empty } from "antd";
import { SearchOutlined, CloseCircleOutlined, UserOutlined, UserAddOutlined, CheckCircleFilled } from "@ant-design/icons";
import Cookies from "js-cookie";
import { useRouter } from "next/router";
import { Friend } from "../utils/types";

const { Text, Title } = Typography;

interface CreateGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ visible, onClose, onSuccess }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const router = useRouter();
  const [groupName, setGroupName] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [friendsList, setFriendsList] = useState<Friend[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<Friend[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [loading, setLoading] = useState(false);

  const token = Cookies.get("jwtToken");

  // 获取好友列表
  const fetchFriendsList = async () => {
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
        // 按名称排序好友列表
        const sortedFriends = (res.friends || []).sort((a: Friend, b: Friend) => 
          (a.name || a.email).localeCompare((b.name || b.email), "zh-CN")
        );
        setFriendsList(sortedFriends);
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
    }
  };

  // 创建群聊
  const createGroup = async () => {
    if (!token) {
      messageApi.error("未登录，请先登录");
      return;
    }

    // 检查成员数量是否合法
    if (selectedFriends.length < 2) {
      messageApi.error("群聊需要至少包含两位好友");
      return;
    }

    // 检查群聊名称，如果为空则设置默认值"群聊"
    let finalGroupName = groupName.trim();
    if (!finalGroupName) {
      finalGroupName = "群聊";
      setGroupName(finalGroupName);
    }

    setLoading(true);

    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
        body: JSON.stringify({
          members: selectedFriends,
          name: finalGroupName,
        }),
      });

      const res = await response.json();
      if (res.code === 0) {
        messageApi.success("创建群聊成功");
        // 清空输入和选择
        setGroupName("");
        setSelectedFriends([]);
        // 关闭模态框
        onClose();
        // 通知父组件重新获取会话列表
        onSuccess();
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
        messageApi.error(res.info || "创建群聊失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  // 根据搜索关键字过滤好友列表
  useEffect(() => {
    if (searchKeyword.trim() === "") {
      setFilteredFriends(friendsList);
    } else {
      const filtered = friendsList.filter(
        (friend) =>
          (friend.name || "").toLowerCase().includes(searchKeyword.toLowerCase()) ||
          friend.email.toLowerCase().includes(searchKeyword.toLowerCase())
      );
      setFilteredFriends(filtered);
    }
  }, [searchKeyword, friendsList]);

  // 处理模态框打开时，获取好友列表
  useEffect(() => {
    if (visible) {
      fetchFriendsList();
      setSearchKeyword("");
    }
  }, [visible]);

  // 处理模态框关闭时，重置状态
  const handleCancel = () => {
    setGroupName("");
    setSelectedFriends([]);
    setSearchKeyword("");
    onClose();
  };

  // 处理选择/取消选择好友
  const handleFriendSelect = (friendId: string) => {
    if (selectedFriends.includes(friendId)) {
      setSelectedFriends(selectedFriends.filter(id => id !== friendId));
    } else {
      setSelectedFriends([...selectedFriends, friendId]);
    }
  };

  // 移除已选择的好友
  const handleRemoveFriend = (friendId: string) => {
    setSelectedFriends(selectedFriends.filter(id => id !== friendId));
  };

  // 获取已选择好友的详细信息
  const getSelectedFriendsDetails = () => {
    return friendsList.filter(friend => selectedFriends.includes(friend.id));
  };

  return (
    <>
      {contextHolder}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <UserAddOutlined style={{ marginRight: 8, color: '#8A2BE2' }} />
            <span>创建群聊</span>
          </div>
        }
        open={visible}
        onCancel={handleCancel}
        width={800}
        styles={{
          header: {
            borderBottom: '1px solid #f0f0f0',
            padding: '16px 24px',
          },
          body: {
            padding: '24px',
            background: 'linear-gradient(135deg, #f9f9ff, #f0f0ff)',
            borderRadius: '0 0 8px 8px',
          },
          footer: {
            borderTop: '1px solid #f0f0f0',
          },
        }}
        footer={[
          <Button key="cancel" onClick={handleCancel}>
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            onClick={createGroup} 
            loading={loading}
            style={{ backgroundColor: "#8A2BE2", borderColor: "#8A2BE2" }}
          >
            创建
          </Button>,
        ]}
      >
        <Row gutter={24}>
          {/* 群聊信息 */}
          <Col span={24} style={{ marginBottom: 24 }}>
            <div style={{ 
              background: '#fff', 
              padding: '16px', 
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <Title level={5} style={{ marginBottom: 16, color: '#8A2BE2' }}>群聊信息</Title>
              <Input
                placeholder="请输入群聊名称"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                style={{ 
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                }}
                prefix={<UserOutlined style={{ color: '#8A2BE2' }} />}
              />
            </div>
          </Col>
          
          {/* 左侧：好友列表 */}
          <Col span={12}>
            <div style={{ 
              background: '#fff', 
              padding: '16px', 
              borderRadius: '8px',
              height: '400px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <Title level={5} style={{ marginBottom: 16, color: '#8A2BE2' }}>选择好友</Title>
              
              <Input
                placeholder="搜索好友"
                prefix={<SearchOutlined style={{ color: '#8A2BE2' }} />}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                style={{ 
                  marginBottom: 16,
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                }}
              />
              
              <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
                {filteredFriends.length === 0 ? (
                  <Empty 
                    description={friendsList.length === 0 ? "暂无好友，请先添加好友" : "没有匹配的好友"} 
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    style={{ margin: '40px 0' }}
                  />
                ) : (
                  <List
                    dataSource={filteredFriends}
                    renderItem={(friend) => (
                      <List.Item 
                        style={{
                          cursor: 'pointer',
                          backgroundColor: selectedFriends.includes(friend.id) ? 'rgba(138, 43, 226, 0.1)' : 'transparent',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          marginBottom: '8px',
                          transition: 'all 0.3s ease',
                          border: selectedFriends.includes(friend.id) ? '1px solid rgba(138, 43, 226, 0.3)' : '1px solid transparent',
                        }}
                        onClick={() => handleFriendSelect(friend.id)}
                      >
                        <List.Item.Meta
                          avatar={
                            <div style={{ position: 'relative' }}>
                              <Avatar 
                                src={friend.avatar} 
                                style={{ 
                                  border: selectedFriends.includes(friend.id) ? '2px solid #8A2BE2' : 'none',
                                }}
                              />
                              {selectedFriends.includes(friend.id) && (
                                <CheckCircleFilled 
                                  style={{ 
                                    position: 'absolute',
                                    bottom: -2,
                                    right: -2,
                                    color: '#8A2BE2',
                                    backgroundColor: '#fff',
                                    borderRadius: '50%',
                                    fontSize: '14px'
                                  }} 
                                />
                              )}
                            </div>
                          }
                          title={
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between'
                            }}>
                              <span style={{ 
                                color: selectedFriends.includes(friend.id) ? '#8A2BE2' : 'inherit',
                                fontWeight: selectedFriends.includes(friend.id) ? 'bold' : 'normal',
                              }}>
                                {friend.name || friend.email}
                              </span>
                              {selectedFriends.includes(friend.id) && (
                                <Tag color="#8A2BE2" style={{ marginLeft: 8, opacity: 0.8 }}>已选</Tag>
                              )}
                            </div>
                          }
                          description={!friend.name ? undefined : (
                            <Text ellipsis style={{ fontSize: '12px' }}>
                              {friend.email}
                            </Text>
                          )}
                        />
                      </List.Item>
                    )}
                  />
                )}
              </div>
            </div>
          </Col>
          
          {/* 右侧：已选好友和群名称 */}
          <Col span={12}>
            <div style={{ 
              background: '#fff', 
              padding: '16px', 
              borderRadius: '8px',
              height: '400px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <Title level={5} style={{ margin: 0, color: '#8A2BE2' }}>
                  已选成员
                </Title>
                <Tag color="#8A2BE2" style={{ marginLeft: 8 }}>
                  {selectedFriends.length} 人
                </Tag>
              </div>
              
              <Divider style={{ margin: '0 0 16px 0' }} />
              
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {selectedFriends.length === 0 ? (
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    height: '100%',
                    color: '#999',
                    backgroundColor: 'rgba(138, 43, 226, 0.03)',
                    borderRadius: '8px',
                    padding: '40px 0'
                  }}>
                    <UserOutlined style={{ fontSize: 40, marginBottom: 16, color: '#8A2BE2', opacity: 0.5 }} />
                    <Text style={{ color: '#999' }}>请从左侧选择群聊成员</Text>
                  </div>
                ) : (
                  <List
                    grid={{ gutter: 16, column: 2 }}
                    dataSource={getSelectedFriendsDetails()}
                    renderItem={(friend) => (
                      <List.Item>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          padding: '8px 12px',
                          backgroundColor: 'rgba(138, 43, 226, 0.1)',
                          borderRadius: '8px',
                          border: '1px solid rgba(138, 43, 226, 0.2)',
                          transition: 'all 0.3s ease',
                        }}>
                          <Avatar src={friend.avatar} size="small" style={{ border: '1px solid #8A2BE2' }} />
                          <Tooltip title={friend.name || friend.email}>
                            <Text style={{ 
                              marginLeft: 8, 
                              flex: 1, 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis', 
                              whiteSpace: 'nowrap',
                              color: '#555'
                            }}>
                              {friend.name || friend.email}
                            </Text>
                          </Tooltip>
                          <CloseCircleOutlined 
                            style={{ 
                              color: '#8A2BE2', 
                              cursor: 'pointer',
                              fontSize: '16px',
                              opacity: 0.7,
                              transition: 'all 0.3s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.opacity = '1';
                              e.currentTarget.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.opacity = '0.7';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFriend(friend.id);
                            }}
                          />
                        </div>
                      </List.Item>
                    )}
                  />
                )}
              </div>
            </div>
          </Col>
        </Row>
      </Modal>
    </>
  );
};

export default CreateGroupModal;