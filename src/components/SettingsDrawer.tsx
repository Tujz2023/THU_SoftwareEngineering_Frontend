import React, { useState, useEffect } from "react";
import { Drawer, message } from "antd";
import { useSelector } from "react-redux";
import AccountSettings from "./SettingsDrawer/AccountSettings";
import PrivacySettings from "./SettingsDrawer/PrivacySettings";

interface SettingsDrawerProps {
  visible: boolean;
  onClose: () => void;
}

const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ visible, onClose }) => {
  const [activeMenu, setActiveMenu] = useState("账号设置");
  const [userInfo, setUserInfo] = useState<any>(undefined);

  const token = useSelector((state: any) => state.auth.token);

  const fetchUserInfo = () => {
    fetch("/api/account/info", {
      method: "GET",
      headers: {
        Authorization: token,
      },
    })
      .then((res) => res.json())
      .then((res) => {
        if (Number(res.code) === 0) {
          setUserInfo(res);
        } else {
          message.error(res.info || "获取用户信息失败");
        }
      })
      .catch((err) => {
        message.error(`网络错误，请稍后重试: ${err}`);
      });
  };

  useEffect(() => {
    if (visible) {
      fetchUserInfo();
    }
  }, [visible]);

  const renderContent = () => {
    switch (activeMenu) {
      case "账号设置":
        return <AccountSettings userInfo={userInfo} />;
      case "隐私设置":
        return <PrivacySettings />;
      default:
        return undefined;
    }
  };

  return (
    <Drawer
      title="设置"
      placement="left"
      onClose={onClose}
      open={visible}
      width="38vw"
    >
      <div style={{ display: "flex", height: "100%" }}>
        {/* 左侧菜单 */}
        <div
          style={{
            width: "120px",
            borderRight: "1px solid #f0f0f0",
            padding: "16px 0",
          }}
        >
          <div
            style={{
              padding: "8px 16px",
              cursor: "pointer",
              background: activeMenu === "账号设置" ? "#f0f0f0" : "transparent",
            }}
            onClick={() => setActiveMenu("账号设置")}
          >
            账号设置
          </div>
          <div
            style={{
              padding: "8px 16px",
              cursor: "pointer",
              background: activeMenu === "隐私设置" ? "#f0f0f0" : "transparent",
            }}
            onClick={() => setActiveMenu("隐私设置")}
          >
            隐私设置
          </div>
        </div>

        {/* 右侧内容 */}
        <div style={{ flex: 1, padding: "16px" }}>{renderContent()}</div>
      </div>
    </Drawer>
  );
};

export default SettingsDrawer;