import { useState, useEffect } from "react";
import { useRouter } from "next/router"; // 引入 useRouter
import Cookies from "js-cookie"; // 引入 js-cookie
import { Input, Button, Layout, List, Avatar, Typography, message, Badge } from "antd";
import { MessageOutlined, TeamOutlined, SettingOutlined, PictureOutlined, SmileOutlined, MoreOutlined,ContactsOutlined} from "@ant-design/icons";
import 'antd/dist/reset.css';
import SettingsDrawer from "../components/SettingsDrawer";
import FriendsListDrawer from "../components/FriendsListDrawer";
import GroupManagementDrawer from "../components/GroupManagementDrawer";
import { FriendRequest } from "../utils/types";

import { useMessageListener } from "../utils/websocket";
const { Header, Sider, Content } = Layout;
const { Text } = Typography;

interface Conversation {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: string;
  isChatGroup: boolean;
  isTop: boolean;
  noticeAble: boolean;
  unreadCount: number;
}

interface Message {
  sender: string;
  text: string;
  time: string;
}


const ChatPage = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [search, setSearch] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<{ [key: string]: Message[] }>({});
  const [input, setInput] = useState("");
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [isFriendsDrawerVisible, setIsFriendsDrawerVisible] = useState(false); // 控制好友列表抽屉的显示
  const [isGroupDrawerVisible, setIsGroupDrawerVisible] = useState(false); // 控制分组管理抽屉的显示
  const [userInfo, setUserInfo] = useState<any>(undefined); // 用户信息状态
  const router = useRouter(); // 初始化 useRouter
  const [showAlert, setShowAlert] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [unhandleRequests, setUnhandleRequests] = useState(0);

  const [friendListDrwaerWebsocket, setFriendListDrwaerWebsocket] = useState(false);
  const [groupDrawerWebsocket, setGroupDrawerWebsocket] = useState(false);
  
  // 从 Cookie 中获取 JWT Token
  const token = Cookies.get("jwtToken");

  const fetchUserInfo = () => {
    fetch("/api/account/info", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
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
        const requests = res.requests;
        setFriendRequests(res.requests);
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

  //TODO
  // 获取会话列表 
  const fetchConversations = async () => {
    if (!token) {
      messageApi.error("未登录，请先登录");
      return;
    }

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
        setConversations(res.conversation);
      } else if (res.code === -2) {
        Cookies.remove("jwtToken");
        messageApi.error("JWT token无效或过期，正在跳转回登录界面...");
        router.push("/");
      } else {
        messageApi.error(res.info || "获取会话列表失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    }
  };

  // useEffect(() => {
  //   if (isDrawerVisible) {
  //     fetchUserInfo();
  //   }
  // }, [isDrawerVisible]);

  useEffect(() => {
    fetchUserInfo();
    // fetchConversations();
    fetchFriendRequests();   // TODO: 改为获取到好友申请的websocket消息之后调用
  }, [])

  const fn = (param: number) => {
    if (param === 2) fetchFriendRequests();
    else if (param === 3) {
      if (isFriendsDrawerVisible === true) {
        setFriendListDrwaerWebsocket(true)
      }
      if (isGroupDrawerVisible === true) {
        setGroupDrawerWebsocket(true)
      }
    } //删除需要的函数
    else {alert('尚未实现...')}
  }

  if (token) {
    useMessageListener(token, fn);
  }

  // 检查 JWT Token 的有效性
  useEffect(() => {
    // 检查 cookies 中是否已存在 jwtToken
    const jwtToken = Cookies.get('jwtToken');
    if (!jwtToken) {
      setIsAuthenticated(false);
      router.push('/').then(() => setShowAlert(true));
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);
    
  useEffect(() => {
    if (showAlert) {
      alert('Cookies不存在或已经失效，请先登录!');
      setShowAlert(false);
    }
  }, [showAlert]);

  const handleSendMessage = () => {
    if (!input.trim() || !selectedConversationId) return;
    const newMessage = { sender: "me", text: input, time: "Now" };
    setMessages((prevMessages) => ({
      ...prevMessages,
      [selectedConversationId]: [...(prevMessages[selectedConversationId] || []), newMessage],
    }));
    setInput("");
  };

  const handleConversationClick = (conversationId: string) => {
    setSelectedConversationId(conversationId);
  };

  const handleIconClick = (iconName: string) => {
    if (iconName === "Settings") {
      setIsDrawerVisible(true); // 打开设置抽屉
    } else if (iconName === "Users") {
      setIsFriendsDrawerVisible(true); // 打开好友列表抽屉
    } else if (iconName === "Groups") {
      setIsGroupDrawerVisible(true); // 打开分组管理抽屉
    } else {
      console.log(`${iconName} icon clicked`);
    }
  };

  const handleAvatarClick = () => {
    console.log("Avatar clicked");
    alert("这是你的个人头像！");
  };
  if (!isAuthenticated) {
    return <p>您未登录，正在跳转...</p>;
  }
  return (
    <>
      {contextHolder}
        <Layout style={{ height: "100vh" }}>
          {/* Vertical Toolbar */}
          <Sider
            width={60}
            style={{
              background: "#8A2BE2",
              borderRight: "1px solid #f0f0f0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 0",
            }}
          >
            {/* User Avatar */}
            {userInfo && <Avatar src={userInfo.avatar} size={40} style={{ marginBottom: "24px", cursor: "pointer" }} onClick={handleAvatarClick} />}

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "24px" }}>
              <MessageOutlined style={{ fontSize: "24px", color: "#fff", cursor: "pointer" }} onClick={() => handleIconClick("MessageCircle")} />
              {/* <ContactsOutlined style={{ fontSize: "24px", color: "#fff", cursor: "pointer" }} onClick={() => handleIconClick("Users")} /> */}
              <Badge
                count={unhandleRequests > 0 ? unhandleRequests : undefined}
                offset={[0, 0]} // 调整徽章的位置
                style={{
                  backgroundColor: '#f5222d', // 红色原点的颜色
                  color: '#ffffff', // 设置徽章中数字的颜色
                  fontSize: '10px', // 设置徽章中数字的字体大小
                  minWidth: '16px', // 设置徽章的最小宽度
                  height: '16px', // 设置徽章的高度
                  lineHeight: '16px', // 设置徽章的行高以垂直居中数字
                  padding: '0', // 设置徽章的内边距为0
                  borderRadius: '50%', // 保持徽章为圆形
                  display: 'inline-block', // 确保徽章作为行内块显示
                }}
              >
                <ContactsOutlined style={{ fontSize: "24px", color: "#fff", cursor: "pointer" }} onClick={() => handleIconClick("Users")} />
              </Badge>
              <TeamOutlined style={{ fontSize: "24px", color: "#fff", cursor: "pointer" }} onClick={() => handleIconClick("Groups")} /> {/* 分组图标 */}
              <SettingOutlined style={{ fontSize: "24px", color: "#fff", cursor: "pointer" }} onClick={() => handleIconClick("Settings")} />
            </div>
          </Sider>

          {/* 会话列表 */}
        <Sider width={300} style={{ background: "#f0f0f0", borderRight: "1px solid #d9d9d9" }}>
          <div style={{ padding: "16px" }}>
            <Input.Search
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ marginBottom: "16px" }}
            />
            <List
              itemLayout="horizontal"
              dataSource={conversations.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))}
              renderItem={(conversation) => (
                <List.Item onClick={() => handleConversationClick(conversation.id)} style={{ cursor: "pointer" }}>
                  <List.Item.Meta
                    avatar={<Avatar src={conversation.avatar} />}
                    title={conversation.name}
                    description={conversation.lastMessage}
                  />
                </List.Item>
              )}
            />
          </div>
        </Sider>

          <Layout>
            {/* Header */}
            <Header
              style={{
                background: "#fff",
                padding: "0 16px",
                borderBottom: "1px solid #f0f0f0",
                display: "flex",
                alignItems: "center",
                height: "80px",
              }}
            >
              <Avatar src={conversations.find((c) => c.id === selectedConversationId)?.avatar} size="large" />
              <div style={{ marginLeft: "16px", display: "flex", flexDirection: "column" }}>
                <Text strong>{conversations.find((c) => c.id === selectedConversationId)?.name}</Text>
                <Text type="secondary">
                  {conversations.find((c) => c.id === selectedConversationId)?.isChatGroup
                    ? "群聊"
                    : `🔴 最后一条消息时间: ${conversations.find((c) => c.id === selectedConversationId)?.lastMessageTime}`}
                </Text>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: "16px" }}>
                <PictureOutlined style={{ fontSize: "22px", cursor: "pointer" }} onClick={() => handleIconClick("Image")} />
                <SmileOutlined style={{ fontSize: "22px", cursor: "pointer" }} onClick={() => handleIconClick("Smile")} />
                <MoreOutlined style={{ fontSize: "22px", cursor: "pointer" }} onClick={() => handleIconClick("MoreHorizontal")} />
              </div>
            </Header>

            {/* Chat Content */}
            <Content style={{ padding: "16px", background: "#fff", overflowY: "auto" }}>
              {messages[selectedConversationId!]?.map((msg, index) => (
                <div key={index} style={{ display: "flex", justifyContent: msg.sender === "me" ? "flex-end" : "flex-start", marginBottom: "16px" }}>
                  <div style={{ maxWidth: "60%", padding: "12px", borderRadius: "8px", background: msg.sender === "me" ? "#8A2BE2" : "#f0f0f0" }}>
                    <p style={{ margin: 0 }}>{msg.text}</p>
                    <Text type="secondary" style={{ fontSize: "12px" }}>{msg.time}</Text>
                  </div>
                </div>
              ))}
            </Content>

            {/* Message Input */}
            <div style={{ padding: "16px", borderTop: "1px solid #f0f0f0", background: "#fff", display: "flex" }}>
              <Input
                placeholder="Enter text here..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                style={{ flex: 1, marginRight: "8px" }}
              />
              <Button type="primary" onClick={handleSendMessage} style={{ backgroundColor: "#8A2BE2", borderColor: "#8A2BE2" }}>Send</Button>
            </div>
          </Layout>

          {/* Settings Drawer */}
          <SettingsDrawer
            visible={isDrawerVisible}
            onClose={() => setIsDrawerVisible(false)}
            userInfo={userInfo} // 传递用户信息
            fetchUserInfo={fetchUserInfo} // 传递刷新函数
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
