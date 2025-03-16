import { useState } from "react";
import { FiSettings, FiImage, FiCamera, FiHelpCircle } from "react-icons/fi";
import { Input, Button, Layout, List, Avatar, Typography } from "antd";
import 'antd/dist/reset.css';

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

  return (
    <Layout style={{ height: "100vh" }}>
      <Sider width={300} style={{ background: "#fff", borderRight: "1px solid #f0f0f0" }}>
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
              <List.Item onClick={() => handleContactClick(contact.id)} style={{ cursor: "pointer" }}>
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
        <Header
          style={{
            background: "#fff",
            padding: "0 16px",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            alignItems: "center", // 确保内容垂直居中
            height: "80px", // 增加高度
          }}
        >
          <Avatar src={contacts.find((c) => c.id === selectedContactId)?.avatar} size="large" />
          <div style={{ marginLeft: "16px", display: "flex", flexDirection: "column" }}>
            <Text strong style={{ display: "block" }}>
              {contacts.find((c) => c.id === selectedContactId)?.name}
            </Text>
            <Text type="secondary" style={{ display: "block" }}>
              {contacts.find((c) => c.id === selectedContactId)?.status === "online" ? "🟢 Online" : `🔴 Last seen: ${contacts.find((c) => c.id === selectedContactId)?.lastSeen}`}
            </Text>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: "16px" }}>
            <FiCamera size={22} />
            <FiImage size={22} />
            <FiSettings size={22} />
            <FiHelpCircle size={22} />
          </div>
        </Header>
        <Content style={{ padding: "16px", background: "#fff", overflowY: "auto" }}>
          {messages[selectedContactId!]?.map((msg, index) => (
            <div key={index} style={{ display: "flex", justifyContent: msg.sender === "me" ? "flex-end" : "flex-start", marginBottom: "16px" }}>
              <div style={{ maxWidth: "60%", padding: "12px", borderRadius: "8px", background: msg.sender === "me" ? "#1890ff" : "#f0f0f0", color: msg.sender === "me" ? "#fff" : "#000" }}>
                <p style={{ margin: 0 }}>{msg.text}</p>
                <Text type="secondary" style={{ fontSize: "12px" }}>{msg.time}</Text>
              </div>
            </div>
          ))}
        </Content>
        <div style={{ padding: "16px", borderTop: "1px solid #f0f0f0", background: "#fff", display: "flex" }}>
          <Input
            placeholder="Enter text here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            style={{ flex: 1, marginRight: "8px" }}
          />
          <Button type="primary" onClick={handleSendMessage}>Send</Button>
        </div>
      </Layout>
    </Layout>
  );
};

export default ChatPage;
