import React, { useState } from "react";
import { Drawer, Input, List, Avatar, Typography, Button, message, Modal } from "antd";
import { RedoOutlined } from "@ant-design/icons";
import Cookies from "js-cookie";

const { Title } = Typography;

interface SearchResult {
  user_id: string;
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

const drawerStyles = {
  body: {
    background: "linear-gradient(135deg, #f0f8ff, #e6f7ff)", // 调整背景颜色
    borderRadius: "16px 0 0 16px",
    padding: "16px",
  },
  header: {
    background: "#4caf50",
    color: "#fff",
    borderRadius: "16px 0 0 0",
  },
};

const SearchUserDrawer: React.FC<SearchUserDrawerProps> = ({ visible, onClose }) => {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [messageText, setMessageText] = useState(''); // 存储用户输入的消息
  const [isModalVisible, setIsModalVisible] = useState(false); // 控制模态框的显示
  const [targetUserId, setTargetUserId] = useState(''); // 存储目标用户ID

  // 从 cookies 获取自己的 email
  const userEmail = Cookies.get("userEmail") || "";

  const handleSearchUsers = async () => {
    const token = Cookies.get("jwtToken");
    if (!token) {
      messageApi.error("未登录，请先登录");
      return;
    }

    if (!search.trim()) {
      messageApi.error("请输入要搜索的用户名");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/search_user?query_name=${search}`, {
        method: "GET",
        headers: {
          Authorization: `${token}`,
        },
      });

      const res = await response.json();

      if (res.code === 0) {
        setSearchResults(res.results);
      } else {
        messageApi.error(res.info || "搜索失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    handleSearchUsers(); // 重新发送搜索请求
  };

  const handleAddFriend = (targetId: string) => {
    setTargetUserId(targetId); // 设置目标用户ID
    setMessageText('');
    setIsModalVisible(true); // 显示模态框
  }

  const handleSendMessage = async () => {
    const token = Cookies.get("jwtToken");
    if (!token) {
      messageApi.error("未登录，请先登录");
      return;
    }

    if (messageText.trim() === '') {
      messageApi.error('请输入消息内容');
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
          message: messageText,
        }),
      });

      const res = await response.json();

      if (res.code === 0) {
        messageApi.success(res.message || "好友申请已发送");
        setIsModalVisible(false); // 隐藏模态框
        setMessageText(''); // 清空消息文本
      } else {
        messageApi.error(res.info || "发送好友申请失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    }
  };

  const handleDrawerClose = () => {
    setSearch(""); // 重置搜索栏
    setSearchResults([]); // 清空搜索结果
    onClose(); // 调用父组件的关闭方法
  };

  return (
    <>
      {contextHolder}
      <Drawer
        title={<span style={{ color: "#fff", fontWeight: "bold" }}>添加好友</span>}
        placement="left"
        onClose={handleDrawerClose}
        open={visible}
        width="400px"
        styles={{
          body: drawerStyles.body, // 使用 styles 替代 bodyStyle
          header: drawerStyles.header, // 使用 styles 替代 headerStyle
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: "16px" }}>
          <Input.Search
            placeholder="输入用户名搜索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={handleSearchUsers}
            enterButton="搜索"
            loading={loading}
            style={{
              flex: 1,
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            }}
          />
          <Button
            type="text"
            shape="circle"
            icon={<RedoOutlined style={{ fontSize: "18px", color: "#fff" }} />}
            onClick={handleRefresh}
            style={{
              marginLeft: "8px",
              backgroundColor: "#1890ff", // 假设刷新按钮背景色为蓝色
              border: "none",
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            }}
          />
        </div>

        <List
          dataSource={searchResults}
          renderItem={(result) => (
            <List.Item
              style={{
                borderRadius: "12px",
                marginBottom: "12px",
                background: "#fff",
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                padding: "12px",
              }}
              actions={[
                result.email === userEmail ? (
                  <span style={{ color: "#888", fontWeight: "bold" }}>这是你自己</span>
                ) : result.is_friend ? (
                  <span style={{ color: "#4caf50", fontWeight: "bold" }}>已是好友</span>
                ) : (
                  <Button
                    type="primary"
                    style={{
                      backgroundColor: "#4caf50",
                      borderColor: "#4caf50",
                      borderRadius: "12px",
                      padding: "0 16px",
                    }}
                    onClick={() => handleAddFriend(result.user_id)}
                  >
                    添加好友
                  </Button>
                ),
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Avatar
                    src={result.avatar}
                    size={48}
                    style={{
                      border: "2px solid #4caf50",
                      padding: "2px",
                      borderRadius: "50%",
                    }}
                  />
                }
                title={<span style={{ fontWeight: "bold", fontSize: "16px" }}>{result.name}</span>}
                description={<span style={{ color: "#888", fontSize: "14px" }}>{result.email}</span>}
              />
            </List.Item>
          )}
        />
        <Modal
          title="发送好友请求"
          visible={isModalVisible}
          onCancel={() => setIsModalVisible(false)}
          footer={[
            <Button key="cancel" onClick={() => setIsModalVisible(false)}>
              取消
            </Button>,
            <Button key="send" type="primary" onClick={handleSendMessage}>
              发送
            </Button>,
          ]}
        >
          <Input
            placeholder="请输入消息..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
          />
        </Modal>
      </Drawer>
    </>
  );
};

export default SearchUserDrawer;