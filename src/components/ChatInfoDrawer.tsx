import { useState, useEffect } from "react";
import { Drawer, List, Avatar, Typography, message, Spin, Divider, Tag, Empty, Input, Dropdown, Button, Modal, Form, Upload } from "antd";
import { UserOutlined, CrownOutlined, UserSwitchOutlined, SearchOutlined, TeamOutlined, SettingOutlined, MoreOutlined, EditOutlined, UploadOutlined } from "@ant-design/icons";
import Cookies from "js-cookie";

const { Text, Title } = Typography;

interface ChatMember {
  id: number;
  name: string;
  avatar: string;
  identity: number; // 1: 群主, 2: 管理员, 3: 普通成员
}

interface ChatInfoDrawerProps {
  visible: boolean;
  onClose: () => void;
  conversationId: number;
  isGroup: boolean;
  groupName?: string;     // 从chat.tsx传入的群聊名称
  groupAvatar?: string;   // 从chat.tsx传入的群聊头像
}

const ChatInfoDrawer = ({ visible, onClose, conversationId, isGroup, groupName, groupAvatar }: ChatInfoDrawerProps) => {
  const [memberloading, setmemberLoading] = useState(false);
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [userIdentity, setUserIdentity] = useState<number>(3); // 默认为普通成员
  const [messageApi, contextHolder] = message.useMessage();
  const [searchText, setSearchText] = useState("");
  const [activeMenu, setActiveMenu] = useState("聊天成员");
  const [loadingAction, setLoadingAction] = useState<number | undefined>(undefined); // 用于标记当前正在操作的成员ID
  
  // 群信息编辑相关状态
  const [isGroupInfoModalVisible, setIsGroupInfoModalVisible] = useState(false);
  const [groupInfoForm] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [groupInfo, setGroupInfo] = useState<{name: string, avatar: string}>({
    name: '',
    avatar: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 初始化群组信息
  useEffect(() => {
    if (groupName || groupAvatar) {
      setGroupInfo({
        name: groupName || '',
        avatar: groupAvatar || ''
      });
    }
  }, [groupName, groupAvatar]);

  // 获取群聊成员列表
  const fetchChatMembers = async () => {
    if (!conversationId) return;
    
    setmemberLoading(true);
    const token = Cookies.get("jwtToken");

    try {
      const response = await fetch(`/api/conversations/get_members?conversation_id=${conversationId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
      });

      const res = await response.json();
      
      if (res.code === 0) {
        setMembers(res.members);
        if (isGroup) {
          setUserIdentity(res.identity);
          
          // 如果API返回了群聊信息，则使用API返回的信息
          if (res.conversation) {
            setGroupInfo({
              name: res.conversation.name || groupName || '',
              avatar: res.conversation.avatar || groupAvatar || ''
            });
          }
        }
      } else if (res.code === -2) {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.error("JWT token无效或过期，正在跳转回登录界面...");
      } else {
        messageApi.error(res.info || "获取聊天成员失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setmemberLoading(false);
    }
  };

  // 设置管理员
  const setAdmin = async (memberId: number) => {
    if (!conversationId) return;
    
    setLoadingAction(memberId);
    const token = Cookies.get("jwtToken");

    try {
      const response = await fetch(`/api/conversations/manage/admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          user: memberId,
        }),
      });

      const res = await response.json();
      
      if (res.code === 0) {
        messageApi.success("设置管理员成功");
        // 重新获取成员列表以更新UI
        fetchChatMembers();
      } else if (res.code === -2) {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.error("JWT token无效或过期，正在跳转回登录界面...");
      } else {
        messageApi.error(res.info || "设置管理员失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setLoadingAction(undefined);
    }
  };

  // 解除管理员
  const removeAdmin = async (memberId: number) => {
    if (!conversationId) return;
    
    setLoadingAction(memberId);
    const token = Cookies.get("jwtToken");

    try {
      const response = await fetch(`/api/conversations/manage/admin`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          user: memberId,
        }),
      });

      const res = await response.json();
      
      if (res.code === 0) {
        messageApi.success("解除管理员成功");
        // 重新获取成员列表以更新UI
        fetchChatMembers();
      } else if (res.code === -2) {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.error("JWT token无效或过期，正在跳转回登录界面...");
      } else {
        messageApi.error(res.info || "解除管理员失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setLoadingAction(undefined);
    }
  };

  // 当抽屉可见时，获取成员列表
  useEffect(() => {
    if (visible) {
      fetchChatMembers();
      setSearchText(""); // 重置搜索框
    }
  }, [visible, conversationId]);

  // 获取身份标签
  const getIdentityTag = (identity: number) => {
    switch (identity) {
      case 1:
        return <Tag icon={<CrownOutlined />} color="gold">群主</Tag>;
      case 2:
        return <Tag icon={<UserSwitchOutlined />} color="blue">管理员</Tag>;
      case 3:
        return <Tag icon={<UserOutlined />} color="default">成员</Tag>;
      default:
        return undefined;
    }
  };

  // 处理图片上传前的操作
  const getBase64 = (img: File, callback: (base64: string) => void): void => {
    const reader = new FileReader();
    reader.addEventListener('load', () => callback(reader.result as string));
    reader.readAsDataURL(img);
  };

  const beforeUpload = (file: File) => {
    const isJPG = file.type === 'image/jpeg';
    if (!isJPG) {
      messageApi.error("只能上传JPG格式的图片");
      return false;
    }

    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      messageApi.error("图片大小需要小于2MB");
      return false;
    }

    setUploading(true);
    getBase64(file, (base64) => {
      const base64Length = base64.length - (base64.indexOf(',') + 1);
      const isBase64Lt2M = base64Length < 2 * 1024 * 1024;
      if (!isBase64Lt2M) {
        messageApi.error("转换后的图片大小超过2MB");
        setUploading(false);
        return;
      }

      groupInfoForm.setFieldsValue({ avatar: base64 });
      setUploading(false);
      messageApi.success("上传成功");
    });

    return false;
  };

  // 更新群信息
  const updateGroupInfo = async (values: any) => {
    if (!conversationId) return;
    
    setIsSubmitting(true);
    const token = Cookies.get("jwtToken");
    
    // 准备请求体，只包含有变化的字段
    const requestBody: {
      conversation_id: number;
      name?: string;
      avatar?: string;
    } = {
      conversation_id: conversationId
    };
    
    if (values.name && values.name !== groupInfo.name) {
      requestBody.name = values.name;
    }
    
    if (values.avatar && values.avatar !== groupInfo.avatar) {
      requestBody.avatar = values.avatar;
    }
    
    // 如果没有任何更改，直接返回
    if (!requestBody.name && !requestBody.avatar) {
      messageApi.info("没有检测到任何更改");
      setIsSubmitting(false);
      setIsGroupInfoModalVisible(false);
      return;
    }

    try {
      const response = await fetch(`/api/conversations/manage/info`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const res = await response.json();
      
      if (res.code === 0) {
        messageApi.success(res.message || "修改群信息成功");
        // 更新本地群信息
        setGroupInfo({
          name: values.name || groupInfo.name,
          avatar: values.avatar || groupInfo.avatar
        });
        // 关闭模态框
        setIsGroupInfoModalVisible(false);
        // 重新获取成员列表以及群信息
        fetchChatMembers();
      } else if (res.code === -2) {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.error("JWT token无效或过期，正在跳转回登录界面...");
      } else if (res.code === -3) {
        messageApi.error("非群主或管理员不能更新群信息");
      } else {
        messageApi.error(res.info || "修改群信息失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 过滤成员列表
  const filteredMembers = members.filter(member => 
    member.name.toLowerCase().includes(searchText.toLowerCase())
  );

  // 菜单项
  const menuItems = isGroup ? [
    { key: "聊天成员", icon: <TeamOutlined />, title: "聊天成员" },
    { key: "聊天管理", icon: <SettingOutlined />, title: "聊天管理" }
  ] : [
    { key: "联系人", icon: <UserOutlined />, title: "联系人" }
  ];

  // 渲染成员列表内容
  const renderMemberList = () => {
    return (
      <>
        {isGroup && (
          <div style={{ padding: "16px 24px", backgroundColor: "white" }}>
            <Text type="secondary">
              {members.length} 位成员
              {userIdentity < 3 && " · 你可以管理群成员"}
            </Text>
            
            <Input
              placeholder="搜索群成员"
              prefix={<SearchOutlined style={{ color: "#8A2BE2" }} />}
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ 
                marginTop: "16px",
                borderRadius: "20px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
              }}
            />
          </div>
        )}

        <div style={{ 
          height: isGroup ? "calc(100% - 120px)" : "100%",
          overflowY: "auto",
          padding: "0 16px",
          backgroundColor: "white"
        }}>
          {memberloading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
              <Spin />
            </div>
          ) : filteredMembers.length > 0 ? (
            <List
              itemLayout="horizontal"
              dataSource={filteredMembers}
              renderItem={(item) => (
                <List.Item
                  style={{
                    padding: "12px 8px",
                    cursor: "pointer",
                    borderRadius: "8px",
                    transition: "all 0.3s ease",
                    border: "none"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(138, 43, 226, 0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                  actions={
                    isGroup && userIdentity === 1 && item.identity !== 1 ? [
                      <Dropdown
                        menu={{
                          items: [
                            {
                              key: item.identity === 2 ? 'removeAdmin' : 'setAdmin',
                              label: item.identity === 2 ? '解除管理员' : '设置为管理员',
                              onClick: () => item.identity === 2 ? removeAdmin(item.id) : setAdmin(item.id)
                            }
                          ]
                        }}
                      >
                        <Button 
                          type="text" 
                          icon={<MoreOutlined />} 
                          loading={loadingAction === item.id}
                        />
                      </Dropdown>
                    ] : []
                  }
                >
                  <List.Item.Meta
                    avatar={<Avatar src={item.avatar} size={46} />}
                    title={
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Text strong style={{ fontSize: "15px" }}>{item.name}</Text>
                        {isGroup && getIdentityTag(item.identity)}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <Empty 
              description={isGroup ? "未找到成员" : "无法获取联系人信息"}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ margin: "40px 0" }}
            />
          )}
        </div>
      </>
    );
  };

  // 渲染聊天管理内容
  const renderChatManagement = () => {
    return (
      <div style={{ padding: "16px 24px" }}>
        <div style={{ marginBottom: "24px" }}>
          <Title level={5} style={{ color: "#8A2BE2", marginBottom: "16px" }}>群聊设置</Title>
          <List
            itemLayout="horizontal"
            dataSource={[
              {
                key: 'groupInfo',
                title: '群聊信息',
                content: (
                  <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "12px" }}>
                    <Avatar src={groupInfo.avatar} size={40} />
                    <Text type="secondary" style={{ display: "block" }}>
                      {groupInfo.name || "当前群聊"}
                    </Text>
                  </div>
                ),
                clickable: userIdentity < 3,
                onClick: () => {
                  if (userIdentity < 3) {
                    groupInfoForm.setFieldsValue({
                      name: groupInfo.name,
                      avatar: groupInfo.avatar
                    });
                    setIsGroupInfoModalVisible(true);
                  }
                }
              },
              {
                key: 'groupAnnouncement',
                title: '群公告',
                content: (
                  <Text type="secondary" style={{ marginTop: "8px", display: "block" }}>
                    暂无群公告
                  </Text>
                ),
                clickable: userIdentity < 3,
                onClick: () => {
                  if (userIdentity < 3) {
                    messageApi.info("群公告功能尚未实现");
                  }
                }
              }
            ]}
            renderItem={item => (
              <List.Item
                style={{
                  padding: "16px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(138, 43, 226, 0.05)",
                  marginBottom: "12px",
                  cursor: item.clickable ? "pointer" : "default",
                  opacity: item.clickable ? 1 : 0.7,
                  border: "none" // 移除边框，解决黑点问题
                }}
                onClick={item.onClick}
              >
                <div style={{ width: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Text strong>{item.title}</Text>
                    {item.clickable && <Text type="secondary">点击修改</Text>}
                  </div>
                  {item.content}
                </div>
              </List.Item>
            )}
          />
        </div>

        {userIdentity === 1 && (
          <div style={{ marginTop: "32px" }}>
            <Title level={5} style={{ color: "red", marginBottom: "16px" }}>其他操作</Title>
            <List
              itemLayout="horizontal"
              dataSource={[
                {
                  key: 'dissolveGroup',
                  title: '解散群聊',
                  content: (
                    <Text type="secondary" style={{ marginTop: "8px", display: "block" }}>
                      群聊被解散后，所有聊天记录将被清除
                    </Text>
                  ),
                  onClick: () => messageApi.warning("解散群聊功能尚未实现")
                }
              ]}
              renderItem={item => (
                <List.Item
                  style={{
                    padding: "16px",
                    borderRadius: "8px",
                    backgroundColor: "rgba(255, 0, 0, 0.05)",
                    cursor: "pointer",
                    border: "none" // 移除边框，解决黑点问题
                  }}
                  onClick={item.onClick}
                >
                  <div style={{ width: "100%" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Text strong style={{ color: "red" }}>{item.title}</Text>
                    </div>
                    {item.content}
                  </div>
                </List.Item>
              )}
            />
          </div>
        )}
      </div>
    );
  };

  // 渲染当前选中的内容
  const renderContent = () => {
    if (isGroup) {
      switch (activeMenu) {
        case "聊天成员":
          return renderMemberList();
        case "聊天管理":
          return renderChatManagement();
        default:
          return renderMemberList();
      }
    } else {
      return renderMemberList();
    }
  };

  return (
    <>
      {contextHolder}
      <Drawer
        title={isGroup ? "群聊管理" : "聊天管理"}
        placement="right"
        onClose={onClose}
        open={visible}
        width={isGroup ? 500 : 320}
        styles={{
          body: {
            padding: 0,
            backgroundColor: "#f8f8fc"
          },
          header: {
            background: "linear-gradient(135deg, #8A2BE2, #6A1B9A)",
            color: "white",
            borderBottom: "none"
          }
        }}
        headerStyle={{ color: "white" }}
      >
        {isGroup ? (
          <div style={{ display: "flex", height: "100%" }}>
            {/* 左侧菜单 */}
            <div
              style={{
                width: "140px",
                borderRight: "1px solid rgba(138, 43, 226, 0.1)",
                padding: "24px 0",
                background: "rgba(255, 255, 255, 0.7)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ padding: "0 16px 16px", marginBottom: "8px" }}>
                <Title level={5} style={{ margin: 0, color: "#8A2BE2", fontSize: "16px" }}>群聊信息</Title>
                <Divider style={{ margin: "12px 0", borderColor: "rgba(138, 43, 226, 0.1)" }} />
              </div>
              
              {menuItems.map(item => (
                <div
                  key={item.key}
                  style={{
                    padding: "12px 16px",
                    cursor: "pointer",
                    borderRadius: "0 8px 8px 0",
                    margin: "4px 0",
                    marginRight: "16px",
                    background: activeMenu === item.key 
                      ? "linear-gradient(90deg, rgba(138, 43, 226, 0.1), rgba(138, 43, 226, 0.2))" 
                      : "transparent",
                    color: activeMenu === item.key ? "#8A2BE2" : "#555",
                    fontWeight: activeMenu === item.key ? "500" : "normal",
                    borderLeft: activeMenu === item.key 
                      ? "3px solid #8A2BE2" 
                      : "3px solid transparent",
                    transition: "all 0.3s ease",
                    display: "flex",
                    alignItems: "center",
                  }}
                  onClick={() => setActiveMenu(item.key)}
                  onMouseEnter={(e) => {
                    if (activeMenu !== item.key) {
                      e.currentTarget.style.background = "rgba(138, 43, 226, 0.05)";
                      e.currentTarget.style.color = "#8A2BE2";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeMenu !== item.key) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#555";
                    }
                  }}
                >
                  <span style={{ 
                    marginRight: "12px", 
                    fontSize: "16px",
                    color: activeMenu === item.key ? "#8A2BE2" : "#777",
                  }}>
                    {item.icon}
                  </span>
                  {item.title}
                </div>
              ))}
            </div>

            {/* 右侧内容 */}
            <div
              style={{
                flex: 1,
                background: "#fff",
                overflowY: "auto",
                height: "100%"
              }}
            >
              <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(138, 43, 226, 0.1)" }}>
                <Title level={5} style={{ margin: 0, color: "#8A2BE2" }}>{activeMenu}</Title>
              </div>
              
              {renderContent()}
            </div>
          </div>
        ) : (
          <div style={{ height: "100%", backgroundColor: "white" }}>
            {memberloading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
                <Spin />
              </div>
            ) : members.length > 0 ? (
              <div style={{ padding: "16px 24px" }}>
                <Title level={5} style={{ margin: 0, marginBottom: "16px", color: "#8A2BE2" }}>联系人</Title>
                
                <List>
                  <List.Item
                    style={{
                      padding: "12px 8px",
                      borderRadius: "8px",
                      border: "none",
                      backgroundColor: "rgba(138, 43, 226, 0.05)"
                    }}
                  >
                    <List.Item.Meta
                      avatar={<Avatar src={members[0].avatar} size={50} />}
                      title={
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Text strong style={{ fontSize: "16px" }}>{members[0].name}</Text>
                        </div>
                      }
                    />
                  </List.Item>
                </List>
              </div>
            ) : (
              <Empty 
                description="无法获取联系人信息" 
                image={Empty.PRESENTED_IMAGE_SIMPLE} 
                style={{ margin: "60px 0" }}
              />
            )}
          </div>
        )}
      </Drawer>

      {/* 群信息修改模态框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', color: '#8A2BE2' }}>
            <EditOutlined style={{ marginRight: '8px' }} />
            <span>修改群信息</span>
          </div>
        }
        open={isGroupInfoModalVisible}
        onCancel={() => {
          setIsGroupInfoModalVisible(false);
          groupInfoForm.resetFields();
        }}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => {
              setIsGroupInfoModalVisible(false);
              groupInfoForm.resetFields();
            }}
          >
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={isSubmitting}
            onClick={() => groupInfoForm.submit()}
            style={{ background: '#8A2BE2', borderColor: '#8A2BE2' }}
          >
            保存
          </Button>,
        ]}
        styles={{
          mask: { backdropFilter: 'blur(2px)', background: 'rgba(0,0,0,0.4)' },
          header: { borderBottom: '1px solid rgba(138, 43, 226, 0.1)' },
          footer: { borderTop: '1px solid rgba(138, 43, 226, 0.1)' }
        }}
      >
        <Form
          form={groupInfoForm}
          layout="vertical"
          onFinish={updateGroupInfo}
          initialValues={{
            name: groupInfo.name,
            avatar: groupInfo.avatar
          }}
        >
          <Form.Item 
            label="群头像" 
            name="avatar"
          >
            <Upload
              name="avatar"
              listType="picture-card"
              className="avatar-uploader"
              showUploadList={false}
              beforeUpload={beforeUpload}
            >
              {groupInfoForm.getFieldValue('avatar') ? (
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  <img 
                    src={groupInfoForm.getFieldValue('avatar')} 
                    alt="avatar" 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover', 
                      borderRadius: '4px' 
                    }} 
                  />
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
                      <UploadOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
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
            label="群名称" 
            name="name"
            rules={[
              {
                required: true,
                message: '请输入群名称',
              },
            ]}
          >
            <Input placeholder="请输入群名称" maxLength={20} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ChatInfoDrawer;