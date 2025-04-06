import React, { useState } from "react";
import { Drawer } from "antd";
import AccountSettings from "./SettingsDrawer/AccountSettings";
import PrivacySettings from "./SettingsDrawer/PrivacySettings";

interface SettingsDrawerProps {
  visible: boolean;
  onClose: () => void;
  userInfo: any; // 从父组件传递用户信息
  fetchUserInfo: () => void; // 从父组件传递刷新用户信息的函数
}

const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ visible, onClose, userInfo, fetchUserInfo }) => {
  const [activeMenu, setActiveMenu] = useState("账号设置");

  const renderContent = () => {
    switch (activeMenu) {
      case "账号设置":
        return <AccountSettings userInfo={userInfo} fetchUserInfo={fetchUserInfo} />;
      case "隐私设置":
        return <PrivacySettings />;
      default:
        return undefined;
    }
  };

  return (
    <>
      <Drawer
        title={<span style={{ color: "#fff", fontWeight: "bold" }}>设置</span>}
        placement="left"
        onClose={onClose}
        open={visible}
        width="38vw"
        // bodyStyle={{
        //   background: "linear-gradient(135deg, #f0f8ff, #e6f7ff)",
        //   borderRadius: "16px 0 0 16px",
        //   padding: "0",
        // }}
        styles={{ 
          header:{
            background: "#4caf50",
            color: "#fff",
            borderRadius: "16px 0 0 0",
          },
          body:{
            background: "linear-gradient(135deg, #f0f8ff, #e6f7ff)",
            borderRadius: "16px 0 0 16px",
            padding: "0",
          }
        }}
      >
        <div style={{ display: "flex", height: "100%" }}>
          {/* 左侧菜单 */}
          <div
            style={{
              width: "120px",
              borderRight: "1px solid #d9d9d9",
              padding: "16px 0",
              background: "#f7f7f7",
              borderRadius: "16px 0 0 16px",
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                cursor: "pointer",
                borderRadius: "8px",
                margin: "8px",
                background: activeMenu === "账号设置" ? "#4caf50" : "transparent",
                color: activeMenu === "账号设置" ? "#fff" : "#000",
                fontWeight: activeMenu === "账号设置" ? "bold" : "normal",
                textAlign: "center",
              }}
              onClick={() => setActiveMenu("账号设置")}
            >
              账号设置
            </div>
            <div
              style={{
                padding: "12px 16px",
                cursor: "pointer",
                borderRadius: "8px",
                margin: "8px",
                background: activeMenu === "隐私设置" ? "#4caf50" : "transparent",
                color: activeMenu === "隐私设置" ? "#fff" : "#000",
                fontWeight: activeMenu === "隐私设置" ? "bold" : "normal",
                textAlign: "center",
              }}
              onClick={() => setActiveMenu("隐私设置")}
            >
              隐私设置
            </div>
          </div>

          {/* 右侧内容 */}
          <div
            style={{
              flex: 1,
              padding: "16px",
              background: "#fff",
              borderRadius: "0 16px 16px 0",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
            }}
          >
            {renderContent()}
          </div>
        </div>
      </Drawer>
    </>
  );
};

export default SettingsDrawer;