import React, { useState } from "react";
import { Avatar, Typography, Button, Modal, message } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/router";
import { resetAuth } from "../../redux/auth"; // 引入 resetAuth action

const { Text } = Typography;

interface AccountSettingsProps {
  userInfo: any;
}

const AccountSettings: React.FC<AccountSettingsProps> = ({ userInfo }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const dispatch = useDispatch();
  const router = useRouter();
  const token = useSelector((state: any) => state.auth.token); // 从 Redux 中获取 token

  const handleLogout = () => {
    // 清除JWT令牌
    dispatch(resetAuth()); // 调用 resetAuth action
    message.success("已退出登录");
    router.push('/').then(() => window.location.reload()); // 返回初始页面
  };

  const handleDeleteAccount = () => {
    fetch("/api/account/delete", {
      method: "DELETE",
      headers: {
        Authorization: token, // 使用 Redux 中的 token
      },
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.code === 0) {
          message.success(res.message || "注销成功");
          // 清除JWT令牌
          dispatch(resetAuth()); // 调用 resetAuth action
          router.push('/').then(() => window.location.reload()); // 返回初始页面
        } else {
          message.error(res.info || "注销失败");
        }
      })
      .catch((err) => {
        message.error(`网络错误，请稍后重试: ${err}`);
      })
      .finally(() => {
        setIsModalVisible(false);
      });
  };

  if (!userInfo) {
    return <div>加载中...</div>;
  }

  return (
    <div style={{ padding: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: "16px" }}>
        <Avatar src={userInfo.avatar_path} size={64} />
        <div style={{ marginLeft: "16px" }}>
          <Text strong style={{ fontSize: "18px" }}>{userInfo.name}</Text>
          <br />
          <Text type="secondary">邮箱：{userInfo.email}</Text>
        </div>
      </div>
      <div style={{ marginBottom: "16px" }}>
        <Text strong>用户信息</Text>
        <br />
        <Text type="secondary">{userInfo.user_info || "暂无信息"}</Text>
      </div>
      <div style={{ marginBottom: "16px" }}>
        <Text strong>账号状态</Text>
        <br />
        <Text type="secondary">{userInfo.deleted ? "已注销" : "正常"}</Text>
      </div>
      <Button type="primary" danger style={{ marginBottom: "8px" }} onClick={handleLogout}>
        退出登录
      </Button>
      <Button
        type="default"
        danger
        onClick={() => setIsModalVisible(true)} // 显示二次确认对话框
      >
        注销账户
      </Button>

      {/* 二次确认对话框 */}
      <Modal
        title="确认注销账户"
        open={isModalVisible}
        onOk={handleDeleteAccount}
        onCancel={() => setIsModalVisible(false)}
        okText="确认"
        cancelText="取消"
      >
        <p>您确定要注销账户吗？此操作不可撤销。</p>
      </Modal>
    </div>
  );
};

export default AccountSettings;