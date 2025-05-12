import React, { useState } from "react";
import { Drawer, Typography, Divider } from "antd";
import { UserOutlined, InfoCircleOutlined, SettingOutlined } from "@ant-design/icons";
import AccountSettings from "./SettingsDrawer/AccountSettings";
import AboutUs from "./SettingsDrawer/AboutUs";
import Cookies from "js-cookie";

const { Title, Text } = Typography;

interface SettingsDrawerProps {
  visible: boolean;
  onClose: () => void;
  userInfo: any; // 从父组件传递用户信息
  fetchUserInfo: () => void; // 从父组件传递刷新用户信息的函数
}

const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ visible, onClose, userInfo, fetchUserInfo }) => {
  const [activeMenu, setActiveMenu] = useState("账号设置");
  
  // 菜单项配置
  const menuItems = [
    { key: "账号设置", icon: <UserOutlined />, title: "账号设置" },
    { key: "关于我们", icon: <InfoCircleOutlined />, title: "关于我们" },
  ];

  const renderContent = () => {
    switch (activeMenu) {
      case "账号设置":
        return <AccountSettings userInfo={userInfo} fetchUserInfo={fetchUserInfo} />;
      case "关于我们":
        return <AboutUs />;
      default:
        return undefined;
    }
  };

  return (
    <>
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <SettingOutlined style={{ marginRight: 8, color: 'white' }} />
            <span style={{ color: "#fff", fontWeight: "bold" }}>设置</span>
          </div>
        }
        placement="left"
        onClose={() => {if (Cookies.get("jwtToken")) onClose();}}
        open={visible}
        width="38vw"
        styles={{ 
          header: {
            background: "linear-gradient(90deg, #8A2BE2, #7B1FA2)",
            color: "#fff",
            borderRadius: "16px 0 0 0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          },
          body: {
            background: "linear-gradient(135deg, #f9f9ff, #f0f0ff)",
            borderRadius: "0 0 0 16px",
            padding: "0",
          },
          mask: {
            backdropFilter: "blur(2px)",
            background: "rgba(0,0,0,0.4)",
          },
          wrapper: {
            boxShadow: "0 0 20px rgba(0,0,0,0.15)",
          }
        }}
        maskClosable={true}
        closeIcon={<div style={{ color: "white", fontSize: "16px" }}>✕</div>}
      >
        <div style={{ display: "flex", height: "100%" }}>
          {/* 左侧菜单 */}
          <div
            style={{
              width: "160px",
              borderRight: "1px solid rgba(138, 43, 226, 0.1)",
              padding: "24px 0",
              background: "rgba(255, 255, 255, 0.7)",
              borderRadius: "16px 0 0 16px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ padding: "0 16px 16px", marginBottom: "8px" }}>
              <Title level={5} style={{ margin: 0, color: "#8A2BE2", fontSize: "16px" }}>设置菜单</Title>
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
              padding: "24px",
              background: "#fff",
              borderRadius: "0 16px 16px 0",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
              overflowY: "auto",
            }}
          >
            <div style={{ marginBottom: "20px" }}>
              <Title level={4} style={{ color: "#8A2BE2", margin: 0 }}>
                {activeMenu}
              </Title>
              <Divider style={{ margin: "12px 0 24px", borderColor: "rgba(138, 43, 226, 0.1)" }} />
            </div>
            
            <div className="settings-content-container">
              {renderContent()}
            </div>
          </div>
        </div>
      </Drawer>
    </>
  );
};

export default SettingsDrawer;