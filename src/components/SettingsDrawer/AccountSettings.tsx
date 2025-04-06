import React, { useState } from 'react';
import { Avatar, Typography, Button, Modal, Upload, message, Form, Input } from "antd";
import Cookies from "js-cookie"; // 引入 js-cookie
import { useRouter } from "next/router";
import { encrypt, decrypt } from '../../utils/crypto';

const { Text } = Typography;

interface AccountSettingsProps {
  userInfo: any;
}

const AccountSettings: React.FC<AccountSettingsProps & { fetchUserInfo: () => void }> = ({ userInfo, fetchUserInfo }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false); // 控制修改信息模态框的显示
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false); // 控制修改密码模态框的显示
  const [uploading, setUploading] = useState(false);
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const router = useRouter();
  const token = Cookies.get("jwtToken");

  const handleLogout = () => {
    Cookies.remove("jwtToken");
    Cookies.remove("userEmail");
    messageApi.open({
      type: 'success',
      content: "已退出登录，正在跳转至登录界面..."
    }).then(() => {router.push('/')});
  };

  const handleDeleteAccount = () => {
    fetch("/api/account/delete", {
      method: "DELETE",
      headers: {
        Authorization: `${token}`,
      },
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.code === 0) {
          Cookies.remove("jwtToken");
          Cookies.remove("userEmail");
          messageApi.open({
            type: 'success',
            content: res.message || "注销成功，正在跳转至聊天界面..."
          }).then(() => {router.push('/')});
        } else {
          messageApi.open({
            type: 'error',
            content: res.info || "注销失败"
          });
          // message.error(res.info || "注销失败");
        }
      })
      .catch((err) => {
        messageApi.open({
          type: 'error',
          content: `网络错误，请稍后重试: ${err}`
        });
        // message.error(`网络错误，请稍后重试: ${err}`);
      })
      .finally(() => {
        setIsModalVisible(false);
      });
  };

  const getBase64 = (img: File, callback: (base64: string) => void): void => {
    const reader = new FileReader();
    reader.addEventListener('load', () => callback(reader.result as string));
    reader.readAsDataURL(img);
  };

  const beforeUpload = (file: File) => {
    const isJPG = file.type === 'image/jpeg';
    if (!isJPG) {
      messageApi.open({
        type: 'error',
        content: "oops, 只能上传 JPG 格式的图片"
      });
      return false;
    }

    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      messageApi.open({
        type: 'error',
        content: "oops, 图片大小需要小于2MB"
      })
      return false;
    }

    setUploading(true);
    getBase64(file, (base64) => {
      const base64Length = base64.length - (base64.indexOf(',') + 1);
      const isBase64Lt2M = base64Length < 2 * 1024 * 1024;
      if (!isBase64Lt2M) {
        messageApi.open({
          type: 'error',
          content: "oops, 转换后的图片大小超过 2MB"
        })
        setUploading(false); // 上传结束，设置上传状态为false
        return;
      }

      // 如果所有检查都通过，则设置表单字段的值
      form.setFieldsValue({ avatar: base64 });
      setUploading(false); // 上传结束，设置上传状态为false
      messageApi.open({
        type: 'success',
        content: "上传成功"
      });
    });

    // const newFile = { ...file, status: 'done'};
    // handleUpload({ file: newFile });
    return false;
  };

  const handleUpload = (info: any) => {
    // const { file } = info;
    // if (file.status === 'done') {
    //   messageApi.open({
    //     type: 'success',
    //     content: "上传成功"
    //   })
    // }
  };

  const handleEditInfo = async (values: any) => {
    const payload = {
      "origin_password": await encrypt(values.origin_password), //用户输入的原密码
      ...((values.name && values.name !== "") && { "name": values.name }),
      ...((values.password && values.password !== "") && { "password": await encrypt(values.password) }),
      ...((values.email && values.email !== "") && { "email": values.email }),
      ...((values.user_info && values.user_info !== "") && { "user_info": values.user_info }),
      ...((values.avatar && values.avatar !== "") && { "avatar": values.avatar }),
    };
    if ((! payload.name) && (! payload.password) && (! payload.email) && (! payload.user_info) && (! payload.avatar))
    {
      messageApi.open({
        type: 'error',
        content: '您好歹改点东西吧...'
      });
      return ;
    }
    await fetch("/api/account/info", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${token}`,
      },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.code === 0) {
          messageApi.open({
            type: 'success',
            content: res.message || "修改成功"
          });
          // message.success(res.message || "修改成功");
          setIsEditModalVisible(false);
          setIsPasswordModalVisible(false); // 关闭修改密码模态框（如果是修改密码）
          fetchUserInfo();
        } else {
          messageApi.open({
            type: 'error',
            content: res.info || "信息修改失败"
          });
          // alert(res.info || "信息修改失败");
        }
      });
  };

  if (!userInfo) {
    return <div>加载中...</div>;
  }

  return (
    <>
    {contextHolder}
    <div style={{ padding: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
      <div>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <Avatar src={userInfo.avatar} size={80} />
        </div>
        <div style={{ marginBottom: "16px", textAlign: "center" }}>
          <Text strong style={{ fontSize: "20px", display: "block" }}>{userInfo.name}</Text>
          <Text type="secondary" style={{ fontSize: "14px", display: "block" }}>邮箱：{userInfo.email}</Text>
        </div>
        <div style={{ marginBottom: "16px" }}>
          <Text strong style={{ fontSize: "16px", display: "block" }}>用户信息</Text>
          <Text type="secondary" style={{ fontSize: "14px", display: "block" }}>
            {userInfo.user_info || "暂无信息"}
          </Text>
        </div>
        <div style={{ marginBottom: "16px" }}>
          <Text strong style={{ fontSize: "16px", display: "block" }}>账号状态</Text>
          <Text type="secondary" style={{ fontSize: "14px", display: "block" }}>
            {userInfo.deleted ? "已注销" : "正常"}
          </Text>
        </div>
      </div>

      <div style={{ textAlign: "center" }}>
        <Button type="primary" style={{ marginBottom: "8px", width: "100%" }} onClick={() => {
            setIsEditModalVisible(true); 
            form.resetFields(); 
          }}>
          修改信息
        </Button>
        <Button type="primary" style={{ marginBottom: "8px", width: "100%" }} onClick={() => {setIsPasswordModalVisible(true); passwordForm.resetFields();}}>
          修改密码
        </Button>
        <Button type="primary" danger style={{ marginBottom: "8px", width: "100%" }} onClick={handleLogout}>
          退出登录
        </Button>
        <Button
          type="default"
          danger
          style={{ width: "100%" }}
          onClick={() => setIsModalVisible(true)}
        >
          注销账户
        </Button>
      </div>

      {/* 修改信息模态框 */}
      <Modal
        title="修改个人信息"
        open={isEditModalVisible}
        onCancel={() => {
          setIsEditModalVisible(false);
          form.resetFields(); // 重置表单内容
        }}
        onOk={() => form.submit()}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            handleEditInfo(values);
          }}
        >
          <Form.Item label="头像链接" name="avatar">
            {/* <input type="file" onChange={handleFileChange} /> */}
            {/* <Input placeholder="请输入头像链接" /> */}
            <Upload
              name="avatar"
              listType="picture-card"
              className="avatar-uploader"
              showUploadList={false}
              beforeUpload={beforeUpload}
              onChange={handleUpload}
            >
              {form.getFieldValue('avatar') ? <img src={form.getFieldValue('avatar')} alt="avatar" style={{ width: '100%' }} /> : <div>{uploading ? '上传中...' : '点击上传(只能上传小于2M的jpg形式图片)'}</div>}
            </Upload>
          </Form.Item>
          <Form.Item label="用户名" name="name">
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item label="邮箱" name="email">
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item label="用户信息" name="user_info">
            <Input.TextArea placeholder="请输入用户信息" />
          </Form.Item>
          <Form.Item
            label="当前密码"
            name="origin_password"
            rules={[{ required: true, message: "修改信息需要输入当前密码" }]}
          >
            <Input.Password placeholder="请输入当前密码" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 修改密码模态框 */}
      <Modal
        title="修改密码"
        open={isPasswordModalVisible}
        onCancel={() => {
          setIsPasswordModalVisible(false) 
          passwordForm.resetFields()
        }}
        onOk={() => passwordForm.submit()}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={(values) => handleEditInfo({ ...values, name: userInfo.name, email: userInfo.email, user_info: userInfo.user_info, avatar: userInfo.avatar })}
        >
          <Form.Item label="当前密码" name="origin_password" rules={[{ required: true, message: "请输入当前密码" }]}>
            <Input.Password placeholder="请输入当前密码" />
          </Form.Item>
          <Form.Item label="新密码" name="password" rules={[{ required: true, message: "请输入新密码" }]}>
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
        </Form>
      </Modal>

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
    </>
  );
};

export default AccountSettings;