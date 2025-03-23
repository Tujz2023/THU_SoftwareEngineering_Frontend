import React from "react";
import { Typography } from "antd";

const { Text } = Typography;

const PrivacySettings: React.FC = () => {
  return (
    <div style={{ padding: "16px" }}>
      <Text strong>隐私设置</Text>
      <br />
      <Text type="secondary">这里是隐私设置的内容。</Text>
    </div>
  );
};

export default PrivacySettings;