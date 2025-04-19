import { useCallback, useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import { Input, Button, Layout, List, Avatar, Typography, message, Badge, Empty, Tooltip, Spin, Divider, Tag } from "antd";
import { MessageOutlined, TeamOutlined, SettingOutlined, PictureOutlined, SmileOutlined, MoreOutlined, ContactsOutlined, SendOutlined, SearchOutlined, ClockCircleOutlined, PlusCircleOutlined, CloseOutlined } from "@ant-design/icons";
import 'antd/dist/reset.css';
import SettingsDrawer from "../components/SettingsDrawer";
import FriendsListDrawer from "../components/FriendsListDrawer";
import GroupManagementDrawer from "../components/GroupManagementDrawer";
import CreateCovModal from "../components/CreateCovModal";
import { FriendRequest } from "../utils/types";

import { useMessageListener } from "../utils/websocket";
const { Header, Sider, Content } = Layout;
const { Text, Title } = Typography;
const { TextArea } = Input;

interface Conversation {
  id: string;
  name: string;
  avatar: string;
  last_message: string;
  last_message_time: string;
  is_chat_group: boolean;
  is_top: boolean;
  notice_able: boolean;
  unread_count: number;
  friend_id?: string;
}

interface Message {
  id: string;
  type: number;
  content: string;
  sender: string;
  senderid: string;
  sendername: string;
  senderavatar: string;
  reply_to?: string;
  reply_to_id?: string;
  conversation: string;
  created_time: string;
}

const ChatPage = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [search, setSearch] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [isFriendsDrawerVisible, setIsFriendsDrawerVisible] = useState(false);
  const [isGroupDrawerVisible, setIsGroupDrawerVisible] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(undefined);
  const router = useRouter();
  const [showAlert, setShowAlert] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [unhandleRequests, setUnhandleRequests] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [isCreateCovModalVisible, setIsCreateCovModalVisible] = useState(false);  // 添加创建群聊模态框的状态

  const [friendListDrwaerWebsocket, setFriendListDrwaerWebsocket] = useState(false);
  const [groupDrawerWebsocket, setGroupDrawerWebsocket] = useState(false);
  const [createConvWebsocket, setCreateConvWebsocket] = useState(false);

  // 添加回复相关状态及功能
  const [replyToMessage, setReplyToMessage] = useState<Message | undefined>(undefined);

  // 添加标记初次加载的状态
  const [isFirstLoad, setIsFirstLoad] = useState<boolean>(true);

  // 修改加载更多消息的函数
  const loadMoreMessages = () => {
    if (!selectedConversationId || !messages?.length) {
      return;
    }
    
    // 获取当前消息列表中最早消息的时间
    const earliestMessage = messages[0];
    const fromTime = earliestMessage.created_time;
    
    // 调用fetchMessages加载更早的消息，明确指定不是首次加载
    fetchMessages(selectedConversationId, fromTime, false);
  };

  const messagesContainerRef = useRef<HTMLDivElement>({
    scrollIntoView: () => {}, // 添加一个空的 scrollIntoView 方法
  } as unknown as HTMLDivElement);

  // 滚动到消息底部的函数
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // 只在初次选择会话时滚动到底部
  useEffect(() => {
    if (selectedConversationId && isFirstLoad) {
      scrollToBottom();
setIsFirstLoad(false);
    }
  }, [selectedConversationId, messages, isFirstLoad]);

  // 从 Cookie 中获取 JWT Token
  const token = Cookies.get("jwtToken");

  const fetchUserInfo = () => {
    fetch("/api/account/info", {
      method: "GET",
      headers: {
        Authorization: `${token}`,
      },
    })
      .then((res) => res.json())
      .then((res) => {
        if (Number(res.code) === 0) {
          setUserInfo(res);
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
          messageApi.open({
            type: "error",
            content: res.info || "获取用户信息失败",
          });
        }
      })
      .catch((err) => {
        messageApi.open({
          type: "error",
          content: `网络错误，请稍后重试: ${err}`,
        });
      });
  };

  const fetchFriendRequests = async () => {
    const token = Cookies.get("jwtToken");

    try {
      const response = await fetch("/api/friend_requests", {
        method: "GET",
        headers: {
          Authorization: `${token}`,
        },
      });

      const res = await response.json();

      if (res.code === 0) {
        const requests = res.requests;
        setFriendRequests(res.requests);
        // console.log("fetch friend requests success!!!")
        // console.log(requests)
        const unhandledCount = requests.filter((request: FriendRequest) => request.status === 0).length;
        setUnhandleRequests(unhandledCount);
      } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.open({
          type: "error",
          content: "JWT token无效或过期，正在跳转回登录界面...",
        }).then(() => {
          router.push("/");
        });
      } else if (res.code === -7) {
        setFriendRequests([]);
      } else {
        messageApi.error(res.info || "获取好友申请失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    }
  };

  // 获取会话列表
  const fetchConversations = async () => {
    try {
      const response = await fetch("/api/conversations", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
      });

      const res = await response.json();
      if (res.code === 0) {
        // console.log("fetch conversations list success!!!")
        // console.log(res.conversation)
        setConversations(res.conversation);
        const conversationExists = res.conversation.some((conv: Conversation) => conv.id === selectedConversationId);
        if (!conversationExists) {
          setSelectedConversationId(undefined); // 如果不存在，则将selectedConversationId置为空
        }
      } else if (res.code === -2) {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.error("JWT token无效或过期，正在跳转回登录界面...").then(() => {
          router.push("/");
        });
      } else {
        messageApi.error(res.info || "获取会话列表失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  // 在 fetchMessages 函数中增加参数来控制是否需要滚动到底部
  const fetchMessages = async (conversationId: string, fromTime?: string, shouldScroll: boolean = true) => {
    try {
      // 构建请求URL，支持从特定时间开始获取消息
      let url = `/api/conversations/messages?conversationId=${conversationId}`;
      if (fromTime) {
        url += `&from=${fromTime}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
      });

      const res = await response.json();
      if (res.code === 0) {
        // 转换消息格式以适应UI展示
        const formattedMessages = res.messages.map((msg: any) => ({
          id: msg.id,
          type: msg.type,
          content: msg.content,
          sender: msg.senderid === userInfo?.id ? "me" : "other",
          senderid: msg.senderid,
          sendername: msg.sendername,
          senderavatar: msg.senderavatar,
          reply_to: msg?.reply_to,
          reply_to_id: msg?.reply_to_id,
          created_time: msg.created_time,
          conversation: msg.conversation
        }));
        
        // // 如果是加载更多消息，则将新消息添加到现有消息之前
        // if (fromTime) {
        //   setMessages(prev => ({
        //     ...prev,
        //     [conversationId]: [...formattedMessages, ...(prev[conversationId] || [])]
        //   }));
        // } else {
        //   // 如果是初次加载，直接替换现有消息列表
        //   setMessages(prev => ({
        //     ...prev,
        //     [conversationId]: formattedMessages
        //   }));
        // }
        setMessages(formattedMessages);

        // 仅在应该滚动且消息非空的情况下滚动到底部
        if (shouldScroll && formattedMessages.length > 0) {
          setTimeout(scrollToBottom, 100); // 稍微延迟确保 DOM 已更新
        }
        
        // 在成功获取消息后刷新会话列表，因为未读消息数会变化
        fetchConversations();
      } else if (res.code === -2) {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.error("JWT token无效或过期，正在跳转回登录界面...").then(() => {
          router.push("/");
        });
      } else {
        messageApi.error(res.info || "获取消息失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    }
  };

  const fn = useCallback((param: number) => {
    if (param === 2) fetchFriendRequests();
    else if (param === 3) { 
      if (isFriendsDrawerVisible === true) {
        setFriendListDrwaerWebsocket(true);
      }
      if (isGroupDrawerVisible === true) {
        setGroupDrawerWebsocket(true);
      }
      if (isCreateCovModalVisible === true) {
        setCreateConvWebsocket(true);
      }
      fetchConversations();
    } //删除需要的函数
    else if (param === 1) {
      if (selectedConversationId) {
        fetchMessages(selectedConversationId);
      }
      else {
        fetchConversations();
      }
    }
    else {
      alert("尚未实现...");
    }
  }, [selectedConversationId, isFriendsDrawerVisible, isGroupDrawerVisible, isCreateCovModalVisible]);

  if (token) {
    useMessageListener(token, fn);
  }

  // 检查 JWT Token 的有效性
  useEffect(() => {
    // 检查 cookies 中是否已存在 jwtToken
    const jwtToken = Cookies.get("jwtToken");
    if (!jwtToken) {
      setInitialLoading(false);
      setIsAuthenticated(false);
      router.push("/").then(() => setShowAlert(true));
    } else {
      setIsAuthenticated(true);
      // 短暂延迟以显示加载动画
      setTimeout(() => {
        setInitialLoading(false);
      }, 800);
    }
  }, [router]);

  useEffect(() => {
    if (showAlert) {
      alert("Cookies不存在或已经失效，请先登录!");
      setShowAlert(false);
    }
  }, [showAlert]);

  
  useEffect(() => {
    if (Cookies.get("jwtToken")) {
      fetchUserInfo();
      fetchConversations();
      fetchFriendRequests();
    } 
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim()) {
      messageApi.error("不能发送空消息");
      return;
    }
    if (!selectedConversationId) {
      messageApi.error("请选择一个聊天");
      return;
    }

    try {
      const response = await fetch("/api/conversations/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
        body: JSON.stringify({
          conversationId: selectedConversationId,
          content: input.trim(),
          reply_to: replyToMessage?.id 
        }),
      });

      const res = await response.json();
      if (res.code === 0) {
        // 发送消息之后notify会发送websocket消息，因此不需要前端更新
        setInput("");
        setReplyToMessage(undefined); // 清除回复状态
      } else if (res.code === -2) {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.error("JWT token无效或过期，正在跳转回登录界面...").then(() => {
          router.push("/");
        });
      } else {
        messageApi.error(res.info || "发送消息失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    }
  };

// 修改会话点击处理函数
  const handleConversationClick = (conversationId: string) => {
    setSelectedConversationId(conversationId);
setIsFirstLoad(true); // 重置为首次加载状态
    fetchMessages(conversationId, undefined, true); // 明确指示需要滚动
  };

  const handleIconClick = (iconName: string) => {
    if (iconName === "Settings") {
      setIsDrawerVisible(true); // 打开设置抽屉
    } else if (iconName === "Users") {
      setIsFriendsDrawerVisible(true); // 打开好友列表抽屉
    } else if (iconName === "Groups") {
      setIsGroupDrawerVisible(true); // 打开分组管理抽屉
    } else if (iconName === "CreateConversation") {
      setIsCreateCovModalVisible(true); // 打开创建群聊模态框
    } else {
      console.log(`${iconName} icon clicked`);
    }
  };

  const handleAvatarClick = () => {
    setIsDrawerVisible(true);
  };

  // TODO(回复消息暂无需处理): 聚焦输入框是什么？？？？
  // 处理回复消息的函数
  const handleReplyMessage = (message: Message) => {
    setReplyToMessage(message);
    // 聚焦输入框
    document.querySelector('textarea')?.focus();
  };

  // 取消回复
  const cancelReply = () => {
    setReplyToMessage(undefined);
  };

  // 格式化时间显示
  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      const now = new Date();
      const isToday = date.getDate() === now.getDate() && 
                     date.getMonth() === now.getMonth() && 
                     date.getFullYear() === now.getFullYear();
      
      if (isToday) {
        return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      } else {
        return date.toLocaleDateString([], {month: 'short', day: 'numeric'});
      }
    } catch {
      return timeString;
    }
  };

  if (initialLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-r from-blue-50 to-indigo-50">
        <div style={{ textAlign: 'center' }}>
          <Spin size="large" />
          <Text style={{ display: 'block', marginTop: '16px', color: '#8A2BE2' }}>正在加载...</Text>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #f9f9ff, #f0f0ff)'
      }}>
        <Spin size="large" />
        <Text style={{ marginLeft: 12 }}>您未登录，正在跳转...</Text>
      </div>
    );
  }

  return (
    <>
      {contextHolder}
      <Layout style={{ height: "100vh" }}>
        {/* 侧边工具栏 */}
        <Sider
          width={70}
          style={{
            background: "linear-gradient(180deg, #8A2BE2, #6A1B9A)",
            borderRight: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 0",
            boxShadow: "2px 0 10px rgba(0,0,0,0.1)",
          }}
        >
          {/* 用户头像 */}
          {userInfo && (
            <div style={{ position: 'relative', marginBottom: '40px' }}>
              <Avatar 
                src={userInfo.avatar} 
                size={46} 
                style={{ 
                  cursor: "pointer",
                  border: "3px solid rgba(255,255,255,0.8)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                  transition: "all 0.3s ease"
                }} 
                onClick={handleAvatarClick} 
              />
              {/* 在线状态指示器 */}
              <div style={{ 
                position: 'absolute',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#4caf50',
                border: '2px solid white',
                bottom: '-2px',
                right: '-2px'
              }}/>
            </div>
          )}
          
          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            gap: "24px", 
            flex: 1,
            justifyContent: "space-between" // 添加空间分布，让按钮分布在容器的两端
          }}>
            {/* 顶部按钮区域 */}
            <div style={{ 
              display: "flex", 
              flexDirection: "column", 
              alignItems: "center", 
              gap: "24px"
            }}>
              <Tooltip title="好友" placement="right">
                <div style={{ 
                  position: 'relative',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '12px', 
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  transition: 'all 0.3s ease',
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                onClick={() => handleIconClick("Users")}
                >
                  <ContactsOutlined style={{ fontSize: "22px", color: "#fff" }} />
                  {unhandleRequests > 0 && (
                    <Badge
                      count={unhandleRequests}
                      style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        backgroundColor: "#ff4d4f",
                        color: "#ffffff",
                        fontSize: "10px",
                        minWidth: "16px",
                        height: "16px",
                        lineHeight: "16px",
                        boxShadow: "0 0 0 2px rgba(255,255,255,0.8)",
                      }}
                    />
                  )}
                </div>
              </Tooltip>
              
              <Tooltip title="好友分组" placement="right">
                <div style={{ 
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '12px', 
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  transition: 'all 0.3s ease',
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                onClick={() => handleIconClick("Groups")}
                >
                  <TeamOutlined style={{ fontSize: "22px", color: "#fff" }} />
                </div>
              </Tooltip>
              
              <Tooltip title="创建群聊" placement="right">
                <div style={{ 
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '12px', 
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  transition: 'all 0.3s ease',
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                onClick={() => handleIconClick("CreateConversation")}
                >
                  <PlusCircleOutlined style={{ fontSize: "22px", color: "#fff" }} />
                </div>
              </Tooltip>
            </div>
            
            {/* 底部的设置按钮 */}
            <Tooltip title="设置" placement="right">
              <div style={{ 
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '12px', 
                backgroundColor: 'rgba(255,255,255,0.1)',
                transition: 'all 0.3s ease',
                cursor: "pointer",
                marginBottom: '0px' // 不再需要底部边距，会自动与侧边栏底部保持一定距离
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              onClick={() => handleIconClick("Settings")}
              >
                <SettingOutlined style={{ fontSize: "22px", color: "#fff" }} />
              </div>
            </Tooltip>
          </div>
        </Sider>

        {/* 会话列表 */}
        <Sider width={320} style={{ background: "#f8f8fc", borderRight: "1px solid #e6e6f0" }}>
          <div style={{ padding: "16px", display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ margin: '8px 0 24px 0' }}>
              <Title level={4} style={{ margin: 0, color: '#8A2BE2' }}>消息</Title>
            </div>
            <Input
              placeholder="搜索会话..."
              prefix={<SearchOutlined style={{ color: '#8A2BE2' }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ 
                marginBottom: "16px", 
                borderRadius: '8px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                border: 'none'
              }}
            />
            <div style={{ flex: 1, overflow: 'auto' }}>
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                  <Spin />
                </div>
              ) : conversations.length === 0 ? (
                <Empty 
                  description="暂无会话" 
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ margin: '60px 0' }}
                />
              ) : (
                <List
                  itemLayout="horizontal"
                  dataSource={conversations.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))}
                  renderItem={(conversation) => (
                    <List.Item 
                      onClick={() => handleConversationClick(conversation.id)} 
                      style={{ 
                        cursor: "pointer",
                        padding: "12px 16px",
                        borderRadius: "12px",
                        marginBottom: "8px",
                        background: selectedConversationId === conversation.id 
                          ? "rgba(138, 43, 226, 0.1)" 
                          : "white",
                        border: selectedConversationId === conversation.id 
                          ? "1px solid rgba(138, 43, 226, 0.3)" 
                          : "1px solid transparent",
                        transition: "all 0.3s ease",
                        boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                      }}
                    >
                      <List.Item.Meta
                        avatar={
                          <div style={{ position: 'relative' }}>
                            <Avatar 
                              src={conversation.avatar} 
                              size={46}
                              style={{ 
                                border: conversation.is_chat_group 
                                  ? "none" 
                                  : "2px solid rgba(138, 43, 226, 0.3)" 
                              }}
                            />
                            {conversation.unread_count > 0 && (
                              conversation.notice_able ? (
                                <Badge 
                                  count={conversation.unread_count} 
                                  style={{
                                    position: 'absolute',
                                    right: -5,
                                    top: -5,
                                    boxShadow: '0 0 0 2px white'
                                  }}
                                />
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                  <Badge 
                                    dot 
                                    style={{
                                      position: 'absolute',
                                      right: -2,
                                      top: -2,
                                      boxShadow: '0 0 0 2px white'
                                    }}
                                  />
                                  <Tooltip title="消息免打扰" placement="top">
                                    <Badge
                                      count={<ClockCircleOutlined style={{ color: '#f5222d', fontSize: '10px' }} />}
                                      style={{
                                        position: 'absolute',
                                        right: -12,
                                        top: -12,
                                        backgroundColor: '#fff',
                                        boxShadow: '0 0 0 1px #f0f0f0',
                                        borderRadius: '50%',
                                        width: '16px',
                                        height: '16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                      }}
                                    />
                                  </Tooltip>
                                </div>
                              )
                            )}
                          </div>
                        }
                        title={
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text strong style={{ fontSize: '15px' }}>{conversation.name}</Text>
                            {conversation.last_message_time && <Text type="secondary" style={{ fontSize: '12px' }}>
                              {formatTime(conversation.last_message_time)}
                            </Text>}
                          </div>
                        }
                        description={
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text ellipsis style={{ maxWidth: '180px', fontSize: '13px', color: '#666' }}>
                              {conversation.last_message_time ? conversation.last_message : '暂无消息'}
                            </Text>
                            {conversation.is_top && (
                              <Tag color="#8A2BE2" style={{ margin: 0, fontSize: '10px' }}>置顶</Tag>
                            )}
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </div>
          </div>
        </Sider>

        <Layout>
          {/* 聊天头部 */}
          {selectedConversationId ? (
            <Header
              style={{
                background: "#fff",
                padding: "0 24px",
                borderBottom: "1px solid #f0f0f0",
                display: "flex",
                alignItems: "center",
                height: "70px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
              }}
            >
              <Avatar src={conversations.find((c) => c.id === selectedConversationId)?.avatar} size="large" />
              <div style={{ marginLeft: "16px", display: "flex", flexDirection: "column" }}>
                <Text strong style={{ fontSize: '16px' }}>
                  {conversations.find((c) => c.id === selectedConversationId)?.name}
                </Text>
              </div>
              {/* TODO(暂无需考虑): 额外信息===================================================================== */}
              <div style={{ marginLeft: "auto" }}>
                <Tooltip title="更多">
                  <Button type="text" shape="circle" icon={<MoreOutlined style={{ fontSize: "18px", color: "#8A2BE2" }} />} />
                </Tooltip>
              </div>
              {/* TODO(暂无需考虑): 额外信息===================================================================== */}
            </Header>
          ) : (
            <Header
              style={{
                background: "#fff",
                padding: "0 24px",
                borderBottom: "1px solid #f0f0f0",
                display: "flex",
                alignItems: "center",
                height: "70px"
              }}
            >
              <Text style={{ fontSize: '16px', color: '#8A2BE2' }}>
                欢迎使用聊天应用
              </Text>
            </Header>
          )}

          {/* 聊天内容区域 */}
          <Content 
            key = {selectedConversationId}
            style={{ 
              padding: "24px", 
              background: "#fff", 
              backgroundImage: 'linear-gradient(135deg, rgba(246, 246, 255, 0.4) 25%, rgba(236, 236, 255, 0.4) 25%, rgba(236, 236, 255, 0.4) 50%, rgba(246, 246, 255, 0.4) 50%, rgba(246, 246, 255, 0.4) 75%, rgba(236, 236, 255, 0.4) 75%, rgba(236, 236, 255, 0.4) 100%)',
              backgroundSize: '40px 40px',
              height: 'calc(100vh - 200px)', // 固定高度，减去header和输入框的高度
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
            ref={messagesContainerRef} // 绑定滚动容器的引用
            onScroll={(e) => {
              // 当用户滚动到顶部时，加载更多历史消息
              const target = e.target as HTMLDivElement;
              if (target.scrollTop === 0 && messages.length > 0) {
                loadMoreMessages();
              }
            }}
          >
            {selectedConversationId ? (
              messages?.length > 0 ? (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  justifyContent: messages.length < 10 ? 'flex-start' : 'flex-end', // 当消息少时，靠上显示
                  //minHeight: '100%',
                }}>
                  {messages.map((msg) => (
                    <div key={msg.id} style={{ 
                      display: "flex", 
                      justifyContent: msg.sender === "me" ? "flex-end" : "flex-start", // 确保自己的消息在右侧
                      marginBottom: "24px"
                    }}>
                      {/* 如果不是自己的消息，在左侧显示头像 */}
                      {msg.sender !== "me" && (
                        <Avatar 
                          src={msg.senderavatar} 
                          style={{ marginRight: '8px', alignSelf: 'flex-end' }}
                        />
                      )}
                      <div 
                        style={{ 
                          position: 'relative',
                          maxWidth: "60%", 
                          padding: msg.type === 0 ? "12px 16px" : "8px", 
                          borderRadius: msg.sender === "me" 
                            ? "18px 18px 0 18px" 
                            : "0 18px 18px 18px", 
                          background: msg.sender === "me" 
                            ? "linear-gradient(135deg, #9F4BDF, #8A2BE2)" 
                            : "#fff",
                          boxShadow: msg.sender === "me"
                            ? "0 2px 10px rgba(138, 43, 226, 0.25)"
                            : "0 2px 10px rgba(0, 0, 0, 0.08)",
                          border: msg.sender === "me"
                            ? "none"
                            : "1px solid rgba(0, 0, 0, 0.05)"
                        }}
                      >
                        {/* 根据消息类型显示不同内容 */}
                        {msg.type === 0 ? (
                          // 文本消息
                          <p style={{ 
                            margin: 0, 
                            color: msg.sender === "me" ? "white" : "#333",
                            fontSize: '15px',
                            lineHeight: '1.5',
                            wordBreak: 'break-word'
                          }}>{msg.content}</p>
                        ) : msg.type === 1 ? (
                          // 图片消息
                          <img 
                            src={msg.content} 
                            alt="图片消息" 
                            style={{ 
                              maxWidth: '100%', 
                              borderRadius: '8px',
                              cursor: 'pointer'
                            }} 
                            onClick={() => window.open(msg.content, '_blank')}
                          />
                        ) : (
                          // 其他类型消息
                          <p style={{ 
                            margin: 0, 
                            color: msg.sender === "me" ? "white" : "#333",
                            fontSize: '15px',
                            lineHeight: '1.5'
                          }}>未知消息类型</p>
                        )}

                        <div style={{ 
                          display: 'flex',
                          justifyContent: 'flex-end',
                          marginTop: '4px',
                          gap: '4px',
                          alignItems: 'center'
                        }}>
                          <ClockCircleOutlined style={{ 
                            fontSize: '10px', 
                            color: msg.sender === "me" ? "rgba(255,255,255,0.7)" : "#999" 
                          }} />
                          <Text style={{ 
                            fontSize: "11px", 
                            color: msg.sender === "me" ? "rgba(255,255,255,0.7)" : "#999",
                          }}>{formatTime(msg.created_time)}</Text>
                        </div>
                      </div>
                      {/* 如果是自己的消息，在右侧显示头像 */}
                      {msg.sender === "me" && (
                        <Avatar 
                          src={userInfo?.avatar} 
                          style={{ marginLeft: '8px', alignSelf: 'flex-end' }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ 
                  flex: 1, 
                  display: 'flex', 
                  flexDirection: 'column',
                  justifyContent: 'center', 
                  alignItems: 'center',
                  color: '#999',
                  height: '100%'
                }}>
                  <Empty 
                    description="暂无消息，开始聊天吧！" 
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                </div>
              )
            ) : (
              <div style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'center', 
                alignItems: 'center',
                color: '#999',
                height: '100%'
              }}>
                <MessageOutlined style={{ fontSize: '60px', color: '#8A2BE2', opacity: 0.3, marginBottom: '24px' }} />
                <Text style={{ fontSize: '16px', color: '#666' }}>
                  请选择一个会话或开始新的聊天
                </Text>
              </div>
            )}
          </Content>

          {/* 消息输入区域 */}
          {selectedConversationId && (
            <div style={{ 
              padding: "16px 24px", 
              borderTop: "1px solid #f0f0f0", 
              background: "#fff", 
              display: "flex",
              flexDirection: "column",
              gap: "12px"
            }}>
              {/* 回复消息预览
              {replyToMessage && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  backgroundColor: 'rgba(138, 43, 226, 0.08)',
                  borderRadius: '8px',
                  borderLeft: '3px solid #8A2BE2'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '13px', color: '#666' }}>
                      回复 <span style={{ color: '#8A2BE2', fontWeight: 'bold' }}>{replyToMessage.sendername}</span>
                    </div>
                    <div style={{ color: '#666', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {replyToMessage.content}
                    </div>
                  </div>
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<CloseOutlined />} 
                    onClick={cancelReply}
                    style={{ color: '#999' }}
                  />
                </div>
              )} */}
              
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {/* TODO(暂无需考虑): 额外信息===================================================================== */}
                  <Tooltip title="表情">
                    <Button 
                      type="text" 
                      shape="circle" 
                      icon={<SmileOutlined style={{ fontSize: 18, color: '#8A2BE2' }}/>}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        transition: 'all 0.3s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(138, 43, 226, 0.1)';
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    />
                  </Tooltip>
                  <Tooltip title="图片">
                    <Button 
                      type="text" 
                      shape="circle" 
                      icon={<PictureOutlined style={{ fontSize: 18, color: '#8A2BE2' }}/>}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        transition: 'all 0.3s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(138, 43, 226, 0.1)';
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    />
                  </Tooltip>
                  {/* TODO(暂无需考虑): 额外信息===================================================================== */}
                </div>
                
                <TextArea
                  placeholder="输入消息..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                  style={{ 
                    flex: 1, 
                    resize: 'none',
                    borderRadius: '16px',
                    padding: '10px 16px',
                    minHeight: '44px',
                    maxHeight: '120px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    border: '1px solid #e6e6f0',
                    transition: 'all 0.3s ease'
                  }}
                  autoSize={{ minRows: 1, maxRows: 4 }}
                />
                
                <Tooltip title="发送消息">
                  <Button 
                    type="primary" 
                    shape="circle"
                    icon={<SendOutlined />}
                    onClick={handleSendMessage} 
                    style={{ 
                      backgroundColor: "#8A2BE2", 
                      borderColor: "#8A2BE2",
                      width: '44px',
                      height: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(138, 43, 226, 0.3)',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#7B1FA2';
                      e.currentTarget.style.borderColor = '#7B1FA2';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#8A2BE2';
                      e.currentTarget.style.borderColor = '#8A2BE2';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  />
                </Tooltip>
              </div>
            </div>
          )}
        </Layout>

        {/* 创建群聊模态框 */}
        <CreateCovModal
          visible={isCreateCovModalVisible}
          onClose={() => setIsCreateCovModalVisible(false)}
          onSuccess={fetchConversations}
          websocket={createConvWebsocket}
          setWebsocket={setCreateConvWebsocket}
        />

        {/* 设置抽屉 */}
        <SettingsDrawer
          visible={isDrawerVisible}
          onClose={() => setIsDrawerVisible(false)}
          userInfo={userInfo}
          fetchUserInfo={fetchUserInfo}
        />

        {/* 好友列表抽屉 */}
        <FriendsListDrawer
          visible={isFriendsDrawerVisible}
          onClose={() => setIsFriendsDrawerVisible(false)}
          fetchFriendRequests={fetchFriendRequests}
          friendRequests={friendRequests}
          unhandleRequests={unhandleRequests}
          websocket={friendListDrwaerWebsocket}
          setWebsocket={setFriendListDrwaerWebsocket}
        />

        {/* 分组管理抽屉 */}
        <GroupManagementDrawer
          visible={isGroupDrawerVisible}
          onClose={() => setIsGroupDrawerVisible(false)}
          websocket={groupDrawerWebsocket}
          setWebsocket={setGroupDrawerWebsocket}
        />
      </Layout>
    </>
  );
};

export default ChatPage;