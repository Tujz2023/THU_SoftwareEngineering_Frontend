import React, { useState } from "react";
import { Drawer, Input, List, Avatar, Typography, Button, message } from "antd";
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

const SearchUserDrawer: React.FC<SearchUserDrawerProps> = ({ visible, onClose }) => {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

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

  const handleAddFriend = async (targetId: string) => {
    const token = Cookies.get("jwtToken");
    if (!token) {
      messageApi.error("未登录，请先登录");
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
          target_id: targetId,
          message: "Hello",
        }),
      });

      const res = await response.json();

      if (res.code === 0) {
        messageApi.success(res.message || "好友申请已发送");
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
        title={<span style={{ color: "#4caf50", fontWeight: "bold" }}>添加好友</span>}
        placement="left"
        onClose={handleDrawerClose}
        open={visible}
        width="400px"
        bodyStyle={{
          background: "linear-gradient(135deg, #f0f8ff, #e6f7ff)", // 调整背景颜色
          borderRadius: "16px 0 0 16px",
          padding: "16px",
        }}
        headerStyle={{
          background: "#4caf50",
          color: "#fff",
          borderRadius: "16px 0 0 0",
        }}
      >
        <Input.Search
          placeholder="输入用户名搜索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={handleSearchUsers}
          enterButton="搜索"
          loading={loading}
          style={{
            marginBottom: "16px",
            borderRadius: "12px",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
            border: "1px solid #4caf50", // 调整边框颜色为绿色
            backgroundColor: "#e8f5e9", // 调整背景颜色为浅绿色
          }}
        />

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
                result.is_friend ? (
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
      </Drawer>
    </>
  );
};

export default SearchUserDrawer;