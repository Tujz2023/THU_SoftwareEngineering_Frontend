import React, { useState, useRef, useEffect } from "react";
import { Input, Button, Layout, Avatar, Typography, message, Spin } from "antd";
import { SendOutlined, RobotOutlined } from "@ant-design/icons";
import 'antd/dist/reset.css';

const { Content } = Layout;
const { Text, Title } = Typography;
const { TextArea } = Input;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const QwenChatPage = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [apiKey] = useState<string>("");
  
  const messagesEndRef = useRef<HTMLDivElement>({
      scrollIntoView: () => {}, // 添加一个空的 scrollIntoView 方法
    } as unknown as HTMLDivElement);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // 发送消息到 qwen API
  const sendToqwen = async (userMessage: string) => {
    // 添加用户消息到对话中
    const userMsg: ChatMessage = { role: 'user', content: userMessage };
    setMessages(prevMessages => [...prevMessages, userMsg]);
    
    setIsLoading(true);
    
    try {
      const allMessages = [...messages, userMsg];
      
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": window.location.origin,
          "X-Title": "Qwen Chat Interface",
        },
        body: JSON.stringify({
          model: "qwen/qwen3-32b:free",
          messages: allMessages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
        }),
      });

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error?.message || "API 调用失败");
      }
      
      // 处理 qwen 的响应
      const assistantMessage = result.choices[0]?.message?.content || "抱歉，没有收到有效回复";
      
      setMessages(prevMessages => [
        ...prevMessages, 
        { role: 'assistant', content: assistantMessage }
      ]);
    } catch (error) {
      console.error("调用 qwen API 失败:", error);
      messageApi.error("调用 qwen API 失败，请稍后重试");
      
      setMessages(prevMessages => [
        ...prevMessages, 
        { role: 'assistant', content: "抱歉，调用 AI 服务时出现错误。请检查网络连接或稍后重试。" }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理发送消息
  const handleSendMessage = async () => {
    if (!input.trim()) {
      messageApi.warning("请输入消息");
      return;
    }
    
    const userMessage = input.trim();
    setInput("");
    
    await sendToqwen(userMessage);
  };

  return (
    <>
      {contextHolder}
      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        height: "100%",
        background: "#f9f9fc"
      }}>
        <Content style={{ 
          padding: "16px", 
          overflowY: "auto", 
          display: "flex", 
          flexDirection: "column",
          flex: 1
        }}>
          {messages.length === 0 ? (
            <div style={{ 
              flex: 1, 
              display: "flex", 
              flexDirection: "column", 
              justifyContent: "center", 
              alignItems: "center", 
              color: "#666",
              padding: "20px"
            }}>
              <Avatar 
                icon={<RobotOutlined />} 
                style={{ 
                  backgroundColor: "#8A2BE2", 
                  color: "#fff",
                  width: 64,
                  height: 64,
                  fontSize: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 24
                }} 
              />
              <Title level={3} style={{ color: "#8A2BE2", margin: "0 0 12px 0" }}>qwen 助手</Title>
              <Text style={{ fontSize: 16, textAlign: "center", maxWidth: "90%" }}>
                你好！我是 qwen AI 助手，可以帮助你回答问题、提供信息或进行有趣的对话。请输入你的问题开始聊天吧！
              </Text>
            </div>
          ) : (
            <div style={{ flexGrow: 1 }}>
              {messages.map((msg, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                    marginBottom: "24px",
                    padding: "0px",
                    position: "relative", // 添加相对定位，以便头像可以绝对定位
                  }}
                >
                  {/* AI头像 - 左上角 */}
                  {msg.role === "assistant" && (
                    <Avatar
                      icon={<RobotOutlined />}
                      style={{ 
                        backgroundColor: "#8A2BE2", 
                        color: "#fff",
                        marginRight: "8px",
                        alignSelf: "flex-start"
                      }}
                    />
                  )}
                  
                  <div
                    style={{
                      maxWidth: "75%",
                      padding: "12px 16px",
                      borderRadius: msg.role === "user" ? "18px 18px 0 18px" : "0 18px 18px 18px",
                      background: msg.role === "user" ? "linear-gradient(135deg, #9F4BDF, #8A2BE2)" : "#fff",
                      color: msg.role === "user" ? "#fff" : "#333",
                      boxShadow: msg.role === "user"
                        ? "0 2px 10px rgba(138, 43, 226, 0.25)"
                        : "0 2px 10px rgba(0, 0, 0, 0.08)",
                      border: msg.role === "user"
                        ? "none"
                        : "1px solid rgba(0, 0, 0, 0.05)",
                      cursor: "context-menu",
                      transition : "all 0.2s ease",
                      position: "relative", // 添加相对定位
                    }}
                    onMouseEnter={(e) => {
                      // 鼠标悬停效果
                      if (msg.role === "user") {
                        e.currentTarget.style.background = "linear-gradient(135deg, #A64CEB, #9535E0)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(138, 43, 226, 0.4)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                      } else {
                        e.currentTarget.style.background = "#f9f9ff";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.12)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      // 恢复原始样式
                      if (msg.role === "user") {
                        e.currentTarget.style.background = "linear-gradient(135deg, #9F4BDF, #8A2BE2)";
                        e.currentTarget.style.boxShadow = "0 2px 10px rgba(138, 43, 226, 0.25)";
                        e.currentTarget.style.transform = "translateY(0)";
                      } else {
                        e.currentTarget.style.background = "#fff";
                        e.currentTarget.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.08)";
                        e.currentTarget.style.transform = "translateY(0)";
                      }
                    }}
                  >
                    <div style={{ whiteSpace: "pre-wrap" }}>
                      {msg.content.split('\n').map((line, i) => (
                        <React.Fragment key={i}>
                          {line}
                          {i < msg.content.split('\n').length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                  
                  {/* 用户头像 - 右下角 */}
                  {msg.role === "user" && (
                    <Avatar
                      style={{ 
                        marginLeft: "8px", 
                        alignSelf: "flex-end", // 改为flex-end使头像靠下对齐
                        backgroundColor: "#8A2BE2"
                      }}
                    >
                      您
                    </Avatar>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    marginBottom: "24px",
                  }}
                >
                  <Avatar
                    icon={<RobotOutlined />}
                    style={{ 
                      backgroundColor: "#8A2BE2", 
                      color: "#fff",
                      marginRight: "8px"
                    }}
                  />
                  <div
                    style={{
                      padding: "16px",
                      borderRadius: "0 18px 18px 18px",
                      background: "#fff",
                      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.08)",
                      border: "1px solid rgba(0, 0, 0, 0.05)",
                    }}
                  >
                    <Spin /> <Text style={{ marginLeft: 12 }}>思考中...</Text>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </Content>
        
        <div style={{
          padding: "16px",
          background: "#fff",
          borderTop: "1px solid #f0f0f0",
          display: "flex",
          alignItems: "flex-end",
          gap: "12px",
        }}>
          <TextArea
            placeholder="输入消息，与 AI 助手对话..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
            style={{
              flex: 1,
              resize: "none",
              borderRadius: "16px",
              padding: "10px 16px",
              minHeight: "44px",
              maxHeight: "120px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              border: "1px solid #e6e6f0",
              transition: "all 0.3s ease"
            }}
            autoSize={{ minRows: 1, maxRows: 4 }}
            disabled={isLoading}
          />
          <Button
            type="primary"
            shape="circle"
            icon={<SendOutlined />}
            onClick={handleSendMessage}
            style={{
              backgroundColor: "#8A2BE2",
              borderColor: "#8A2BE2",
              width: "44px",
              height: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(138, 43, 226, 0.3)",
              transition: "all 0.3s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#7B1FA2";
              e.currentTarget.style.borderColor = "#7B1FA2";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#8A2BE2";
              e.currentTarget.style.borderColor = "#8A2BE2";
              e.currentTarget.style.transform = "translateY(0)";
            }}
            disabled={!input.trim() || isLoading}
          />
        </div>
      </div>
    </>
  );
};

export default QwenChatPage;