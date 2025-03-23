import { useState } from "react";
import { FiSettings, FiImage, FiCamera, FiSmile, FiMessageCircle, FiUsers, FiMoreHorizontal, FiSliders } from "react-icons/fi";
import { Input, Button, Layout, List, Avatar, Typography } from "antd";
import { NetworkError, NetworkErrorType, request} from "../utils/network";
import 'antd/dist/reset.css';
import SettingsDrawer from "../components/SettingsDrawer";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

interface Contact {
  id: number;
  name: string;
  avatar: string;
  status: "online" | "offline" | "away";
  lastSeen?: string;
}

interface Message {
  sender: string;
  text: string;
  time: string;
}

const contacts: Contact[] = [
  { id: 1, name: "Vincent Porter", avatar: "/avatar1.png", status: "offline", lastSeen: "7 mins ago" },
  { id: 2, name: "Aiden Chavez", avatar: "/avatar2.png", status: "online" },
  { id: 3, name: "Mike Thomas", avatar: "/avatar3.png", status: "online" },
  { id: 4, name: "Christian Kelly", avatar: "/avatar4.png", status: "offline", lastSeen: "10 hours ago" },
  { id: 5, name: "Monica Ward", avatar: "/avatar5.png", status: "online" },
  { id: 6, name: "Dean Henry", avatar: "/avatar6.png", status: "offline", lastSeen: "Oct 28" },
];

const initialMessages: { [key: number]: Message[] } = {
  1: [
    { sender: "me", text: "Hi Vincent, how are you?", time: "10:10 AM" },
    { sender: "Vincent Porter", text: "I'm good, thanks!", time: "10:12 AM" },
  ],
  2: [
    { sender: "me", text: "Hi Aiden, how are you? How is the project coming along?", time: "10:10 AM" },
    { sender: "Aiden Chavez", text: "Are we meeting today?", time: "10:12 AM" },
    { sender: "Aiden Chavez", text: "Project has been already finished and I have results to show you.", time: "10:15 AM" },
  ],
  // Add more initial messages for other contacts if needed
};

const ChatPage = () => {
  const [search, setSearch] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<number | undefined>(2); // Default to Aiden Chavez
  const [messages, setMessages] = useState<{ [key: number]: Message[] }>(initialMessages);
  const [input, setInput] = useState("");
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);

  const handleSendMessage = () => {
    if (!input.trim()) return;
    const newMessage = { sender: "me", text: input, time: "Now" };
    setMessages((prevMessages) => ({
      ...prevMessages,
      [selectedContactId!]: [...prevMessages[selectedContactId!], newMessage],
    }));
    setInput("");
  };

  const handleContactClick = (contactId: number) => {
    setSelectedContactId(contactId);
  };

  const handleIconClick = (iconName: string) => {
    if (iconName === "Settings") {
      setIsDrawerVisible(true); // 打开设置抽屉
    } else {
      console.log(`${iconName} icon clicked`);
    }
  };

  const handleAvatarClick = () => {
    console.log("Avatar clicked");
    alert("这是你的个人头像！");
  };

  return (
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
              justifyContent: "space-between", // 调整布局
              padding: "16px 0",
            }}
          >
            {/* User Avatar */}
        <Avatar src="/path/to/your-avatar.png" size={40} style={{ marginBottom: "24px", cursor: "pointer" }} onClick={handleAvatarClick} />

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "24px" }}>
          <FiMessageCircle size={24} style={{ color: "#fff", cursor: "pointer" }} onClick={() => handleIconClick("MessageCircle")} />
          <FiUsers size={24} style={{ color: "#fff", cursor: "pointer" }} onClick={() => handleIconClick("Users")} />
          <FiSettings size={24} style={{ color: "#fff", cursor: "pointer" }} onClick={() => handleIconClick("Settings")} />
        </div>
      </Sider>

      {/* Contact List */}
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
            dataSource={contacts.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))}
            renderItem={(contact) => (
              <List.Item onClick={() => handleContactClick(contact.id)} style={{ cursor: "pointer", background: "#f0f0f0" }}>
                <List.Item.Meta
                  avatar={<Avatar src={contact.avatar} />}
                  title={contact.name}
                  description={contact.status === "online" ? "🟢 Online" : `🔴 Left ${contact.lastSeen}`}
                />
              </List.Item>
            )}
          />
        </div>
      </Sider>

      <Layout>
        {/* Header */}
        <Header style={{ background: "#fff", padding: "0 16px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", height: "80px" }}>
          <Avatar src={contacts.find((c) => c.id === selectedContactId)?.avatar} size="large" />
          <div style={{ marginLeft: "16px", display: "flex", flexDirection: "column" }}>
            <Text strong>{contacts.find((c) => c.id === selectedContactId)?.name}</Text>
            <Text type="secondary">
              {contacts.find((c) => c.id === selectedContactId)?.status === "online" ? "🟢 Online" : `🔴 Last seen: ${contacts.find((c) => c.id === selectedContactId)?.lastSeen}`}
            </Text>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: "16px" }}>
            <FiImage size={22} style={{ cursor: "pointer" }} onClick={() => handleIconClick("Image")} />
            <FiSmile size={22} style={{ cursor: "pointer" }} onClick={() => handleIconClick("Smile")} />
            <FiMoreHorizontal size={22} style={{ cursor: "pointer" }} onClick={() => handleIconClick("MoreHorizontal")} />
          </div>
        </Header>

        {/* Chat Content */}
        <Content style={{ padding: "16px", background: "#fff", overflowY: "auto" }}>
          {messages[selectedContactId!]?.map((msg, index) => (
            <div key={index} style={{ display: "flex", justifyContent: msg.sender === "me" ? "flex-end" : "flex-start", marginBottom: "16px" }}>
              <div style={{ maxWidth: "60%", padding: "12px", borderRadius: "8px", background: msg.sender === "me" ? "#8A2BE2" : "#f0f0f0", color: msg.sender === "me" ? "#fff" : "#000" }}>
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
      <SettingsDrawer visible={isDrawerVisible} onClose={() => setIsDrawerVisible(false)} />
    </Layout>
  );
};

export default ChatPage;
