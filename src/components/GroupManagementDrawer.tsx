import React, { useState, useEffect, Dispatch, SetStateAction } from "react";
import { Drawer, List, Input, Button, Typography, message, Avatar, Modal, Dropdown, Divider, MenuProps, Tooltip, Tag, Spin, Empty } from "antd";
import { PlusOutlined, UserAddOutlined, RedoOutlined, EditOutlined, DeleteOutlined, TeamOutlined, InfoCircleOutlined, SearchOutlined, MoreOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import Cookies from "js-cookie";
import { useRouter } from "next/router";
import { Friend } from "../utils/types";

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

interface Group {
  id: number;
  name: string;
}

interface Member {
  id: number;
  email: string;
  name: string;
  avatar: string;
  deleted: boolean;
}

interface GroupManagementDrawerProps {
  visible: boolean;
  onClose: () => void;
  websocket: boolean;
  setWebsocket: Dispatch<SetStateAction<boolean>>;
}

const GroupManagementDrawer: React.FC<GroupManagementDrawerProps> = ({ 
  visible, 
  onClose, 
  websocket, 
  setWebsocket 
}) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number>(0);
  const [members, setMembers] = useState<Member[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isFriendListVisible, setIsFriendListVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<number>(0);
  const [isDeleteMemberModalVisible, setIsDeleteMemberModalVisible] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<number>(0);
  const [memberToDeleteName, setMemberToDeleteName] = useState<string>("");
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | undefined>(undefined);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [searchKeyword, setSearchKeyword] = useState(""); 
  const [groupNameSearchKeyword, setGroupNameSearchKeyword] = useState("");
  const router = useRouter();

  // 获取分组列表
  const fetchGroups = async () => {
    const token = Cookies.get("jwtToken");
    setLoading(true);

    try {
      const response = await fetch("/api/groups", {
        method: "GET",
        headers: {
          Authorization: `${token}`,
        },
      });

      const res = await response.json();

      if (res.code === 0) {
        setGroups(res.groups);
      } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.open({
          type: "error",
          content: "JWT token无效或过期，正在跳转回登录界面...",
        }).then(() => {
          router.push("/");
        });
      } else {
        messageApi.error(res.info || "获取分组失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  // 修改分组名称
  const updateGroupName = async () => {
    const newName = editingGroupName.trim();
    if (!(editingGroup && newName)){
      messageApi.error("分组名称不能为空");
      return;
    }
    const groupId = editingGroup.id;

    const token = Cookies.get("jwtToken");

    setLoading(true);
    try {
      const response = await fetch("/api/groups/manage_groups", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
        body: JSON.stringify({ group_id: groupId, new_name: newName }),
      });

      const res = await response.json();

      if (res.code === 0) {
        messageApi.success(res.message || "修改分组名称成功");
        fetchGroups(); // 刷新分组列表
      } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.open({
          type: "error",
          content: "JWT token无效或过期，正在跳转回登录界面...",
        }).then(() => {
          router.push("/");
        });
      } else {
        messageApi.error(res.info || "修改分组名称失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }

    setIsEditModalVisible(false);
    setEditingGroup(undefined);
    setEditingGroupName("");
  };

  // 删除分组
  const deleteGroup = async () => {
    if (!groupToDelete) {
      messageApi.error("请先选择一个分组");
      return;
    }

    const token = Cookies.get("jwtToken");

    setLoading(true);
    try {
      const response = await fetch("/api/groups/manage_groups", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
        body: JSON.stringify({ group_id: groupToDelete }),
      });

      const res = await response.json();

      if (res.code === 0) {
        messageApi.success(res.message || "删除分组成功");
        fetchGroups(); // 刷新分组列表
        setSelectedGroupId(0); // 清空选中分组
        setMembers([]); // 清空成员列表
      } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.open({
          type: "error",
          content: "JWT token无效或过期，正在跳转回登录界面...",
        }).then(() => {
          router.push("/");
        });
      } else {
        messageApi.error(res.info || "删除分组失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
    setIsDeleteModalVisible(false); // 关闭删除确认弹窗
    setGroupToDelete(0); // 清空待删除的分组 ID
  };

  const showDeleteModal = (groupId: number) => {
    setGroupToDelete(groupId);
    setIsDeleteModalVisible(true);
  };

  // 打开修改分组名称的弹窗
  const showEditModal = (group: Group) => {
    setEditingGroup(group);
    setEditingGroupName(group.name);
    setIsEditModalVisible(true);
  };

  // 获取分组详情
  const fetchGroupDetails = async (groupId: number) => {
    const token = Cookies.get("jwtToken");
    setMembersLoading(true);

    try {
      const response = await fetch(`/api/groups/manage_groups?group_id=${groupId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
      });

      const res = await response.json();

      if (res.code === 0) {
        setMembers(res.group.members || []);
      } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.open({
          type: "error",
          content: "JWT token无效或过期，正在跳转回登录界面...",
        }).then(() => {
          router.push("/");
        });
      } else {
        messageApi.error(res.info || "获取分组详情失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setMembersLoading(false);
    }
  };

  // 创建分组
  const createGroup = async () => {
    if (!newGroupName.trim()) {
      messageApi.error("分组名称不能为空");
      return;
    }

    const token = Cookies.get("jwtToken");

    setLoading(true);
    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
        body: JSON.stringify({ name: newGroupName }),
      });

      const res = await response.json();

      if (res.code === 0) {
        messageApi.success(res.message || "分组创建成功");
        setNewGroupName("");
        fetchGroups(); // 刷新分组列表
      } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.open({
          type: "error",
          content: "JWT token无效或过期，正在跳转回登录界面...",
        }).then(() => {
          router.push("/");
        });
      } else {
        messageApi.error(res.info || "创建分组失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  // 删除分组成员
  const deleteGroupMember = async () => {
    if (!selectedGroupId || !memberToDelete) {
      messageApi.error("未选择分组或未选择成员");
      return;
    }

    const token = Cookies.get("jwtToken");

    setLoading(true);
    try {
      const response = await fetch("/api/groups/members", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
        body: JSON.stringify({ group_id: selectedGroupId, member_id: memberToDelete }),
      });

      const res = await response.json();

      if (res.code === 0) {
        messageApi.success(res.message || "删除分组成员成功");
        fetchGroupMembers(selectedGroupId); // 刷新分组成员列表
      } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.open({
          type: "error",
          content: "JWT token无效或过期，正在跳转回登录界面...",
        }).then(() => {
          router.push("/");
        });
      } else {
        messageApi.error(res.info || "删除分组成员失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setLoading(false);
      setIsDeleteMemberModalVisible(false); // 关闭删除确认弹窗
      setMemberToDelete(0); // 清空待删除的成员 ID
      setMemberToDeleteName("");
    }
  };

  const showDeleteMemberModal = (memberId: number, memberName: string) => {
    setMemberToDelete(memberId);
    setMemberToDeleteName(memberName);
    setIsDeleteMemberModalVisible(true);
  };

  // 获取分组成员列表
  const fetchGroupMembers = async (groupId: number) => {
    const token = Cookies.get("jwtToken");
    setMembersLoading(true);

    try {
      const response = await fetch(`/api/groups/members?group_id=${groupId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
      });

      const res = await response.json();

      if (res.code === 0) {
        setMembers(res.members || []);
      } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.open({
          type: "error",
          content: "JWT token无效或过期，正在跳转回登录界面...",
        }).then(() => {
          router.push("/");
        });
      } else {
        messageApi.error(res.info || "获取分组成员失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setMembersLoading(false);
    }
  };

  // 获取好友列表
  const fetchFriendList = async () => {
    const token = Cookies.get("jwtToken");

    if (!selectedGroupId) {
      messageApi.error("请先选择一个分组");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/friends", {
        method: "GET",
        headers: {
          Authorization: `${token}`,
        },
      });

      const res = await response.json();

      if (res.code === 0) {
        setFriends(res.friends || []);
        setIsFriendListVisible(true); // 打开好友列表弹窗
      } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.open({
          type: "error",
          content: "JWT token无效或过期，正在跳转回登录界面...",
        }).then(() => {
          router.push("/");
        });
      } else {
        messageApi.error(res.info || "获取好友列表失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  // 添加好友到分组
  const addFriendToGroup = async (friendId: number) => {
    if (!selectedGroupId) {
      messageApi.error("请先选择一个分组");
      return;
    }

    const token = Cookies.get("jwtToken");

    setLoading(true);
    try {
      const response = await fetch("/api/groups/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
        body: JSON.stringify({ group_id: selectedGroupId, member_id: friendId }),
      });

      const res = await response.json();

      if (res.code === 0) {
        messageApi.success(res.message || "添加好友到分组成功");
        fetchGroupMembers(selectedGroupId); // 刷新分组成员列表
      } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.open({
          type: "error",
          content: "JWT token无效或过期，正在跳转回登录界面...",
        }).then(() => {
          router.push("/");
        });
      } else {
        messageApi.error(res.info || "添加好友到分组失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (!selectedGroupId) {
      messageApi.error("请先选择一个分组");
      return;
    }
    fetchGroupMembers(selectedGroupId);
  }

  useEffect(() => {
    if (visible) {
      fetchGroups();
    }
  }, [visible]);

  useEffect(() => {
    if (websocket === true) {
      if (selectedGroupId) {
        fetchGroupMembers(selectedGroupId);
      }
      if (isFriendListVisible === true) {
        fetchFriendList();
      }
      setWebsocket(false);
    }
  }, [websocket]);

  // 修改后的菜单
  const menu = (group: Group): MenuProps['items'] => [
    {
      key: 'edit',
      label: (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <EditOutlined style={{ marginRight: '8px', color: '#8A2BE2' }} />
          <span>修改名称</span>
        </div>
      ),
      onClick: () => showEditModal(group),
    },
    {
      key: 'delete',
      label: (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <DeleteOutlined style={{ marginRight: '8px', color: '#ff4d4f' }} />
          <span>删除分组</span>
        </div>
      ),
      danger: true,
      onClick: () => showDeleteModal(group.id),
    }
  ];

  // 过滤好友列表
  const filteredFriends = friends.filter((friend) =>
    friend.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    friend.email.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  // 过滤分组列表
  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(groupNameSearchKeyword.toLowerCase())
  );

  // 找到当前选中的分组名称
  const selectedGroupName = groups.find(g => g.id === selectedGroupId)?.name || "未选择分组";

  return (
    <>
      {contextHolder}
      
      {/* 修改分组名称弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', color: "#8A2BE2" }}>
            <EditOutlined style={{ marginRight: 8 }} />
            <span>修改分组名称</span>
          </div>
        }
        open={isEditModalVisible}
        onOk={updateGroupName}
        onCancel={() => setIsEditModalVisible(false)}
        okText="确认"
        cancelText="取消"
        okButtonProps={{ 
          style: { backgroundColor: "#8A2BE2", borderColor: "#8A2BE2" } 
        }}
        styles={{
          mask: { backdropFilter: 'blur(2px)', background: 'rgba(0,0,0,0.4)' },
          header: { borderBottom: '1px solid rgba(138, 43, 226, 0.1)' },
          footer: { borderTop: '1px solid rgba(138, 43, 226, 0.1)' },
        }}
      >
        <Input
          placeholder="请输入新的分组名称"
          value={editingGroupName}
          onChange={(e) => setEditingGroupName(e.target.value)}
          maxLength={50}
          prefix={<TeamOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />}
          style={{ 
            borderRadius: '8px',
            marginTop: '16px',
            boxShadow: 'none',
            borderColor: 'rgba(138, 43, 226, 0.2)'
          }}
        />
      </Modal>

      {/* 删除分组确认弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', color: "#ff4d4f" }}>
            <ExclamationCircleOutlined style={{ marginRight: 8 }} />
            <span>确认删除分组</span>
          </div>
        }
        open={isDeleteModalVisible}
        onOk={deleteGroup}
        onCancel={() => setIsDeleteModalVisible(false)}
        okText="确认删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        styles={{
          mask: { backdropFilter: 'blur(2px)', background: 'rgba(0,0,0,0.4)' },
          header: { borderBottom: '1px solid rgba(255, 77, 79, 0.1)' },
          footer: { borderTop: '1px solid rgba(255, 77, 79, 0.1)' },
        }}
      >
        <div style={{ 
          padding: '16px',
          background: 'rgba(255, 77, 79, 0.05)', 
          borderRadius: '8px',
          border: '1px solid rgba(255, 77, 79, 0.2)',
          marginBottom: '16px'
        }}>
          <Text style={{ display: 'block', marginBottom: '8px' }}>
            <InfoCircleOutlined style={{ color: '#ff4d4f', marginRight: '8px' }} />
            删除分组将会导致以下后果：
          </Text>
          <ul style={{ paddingLeft: '24px', margin: '8px 0' }}>
            <li>该分组下的所有成员将被移除</li>
            <li>删除后无法恢复</li>
          </ul>
        </div>
        <Paragraph type="secondary">
          您确定要删除该分组吗？
        </Paragraph>
      </Modal>

      {/* 删除分组成员确认弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', color: "#ff4d4f" }}>
            <ExclamationCircleOutlined style={{ marginRight: 8 }} />
            <span>移除分组成员</span>
          </div>
        }
        open={isDeleteMemberModalVisible}
        onOk={deleteGroupMember}
        onCancel={() => setIsDeleteMemberModalVisible(false)}
        okText="确认移除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        styles={{
          mask: { backdropFilter: 'blur(2px)', background: 'rgba(0,0,0,0.4)' },
          header: { borderBottom: '1px solid rgba(255, 77, 79, 0.1)' },
          footer: { borderTop: '1px solid rgba(255, 77, 79, 0.1)' },
        }}
      >
        <div style={{ 
          padding: '16px',
          background: 'rgba(255, 77, 79, 0.05)', 
          borderRadius: '8px',
          border: '1px solid rgba(255, 77, 79, 0.2)',
        }}>
          <Text>
            您确定要将 <Text strong>{memberToDeleteName}</Text> 从分组 <Text strong>{selectedGroupName}</Text> 中移除吗？
          </Text>
        </div>
      </Modal>

      {/* 主抽屉 */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <TeamOutlined style={{ marginRight: 8, color: 'white' }} />
            <span style={{ color: "#fff", fontWeight: "bold" }}>分组管理</span>
          </div>
        }
        placement="left"
        onClose={() => {
          setSelectedGroupId(0);
          onClose();
        }}
        open={visible}
        width="60vw"
        styles={{
          body: {
            background: "linear-gradient(135deg, #f9f9ff, #f0f0ff)",
            borderRadius: "0 0 0 16px",
            padding: "16px",
          },
          header: {
            background: "linear-gradient(90deg, #8A2BE2, #7B1FA2)",
            color: "#fff",
            borderRadius: "16px 0 0 0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
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
        <div style={{ display: "flex", gap: "16px", height: "100%" }}>
          {/* 左侧分组列表 */}
          <div style={{ 
            flex: 1, 
            display: "flex", 
            flexDirection: "column", 
            background: "#fff", 
            borderRadius: "12px", 
            padding: "16px", 
            boxShadow: "0 4px 12px rgba(138, 43, 226, 0.1)" 
          }}>
            <div style={{ marginBottom: "16px" }}>
              <Text strong style={{ display: 'block', marginBottom: '8px', color: '#8A2BE2' }}>
                创建新分组
              </Text>
              <Input
                placeholder="输入分组名称"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                maxLength={20}
                style={{ 
                  marginBottom: "12px", 
                  borderRadius: "8px",
                  borderColor: "rgba(138, 43, 226, 0.2)" 
                }}
                prefix={<TeamOutlined style={{ color: 'rgba(138, 43, 226, 0.5)' }} />}
                suffix={
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {newGroupName.length}/20
                  </Text>
                }
              />
              <Button 
                type="primary" 
                onClick={createGroup} 
                loading={loading} 
                icon={<PlusOutlined />}
                block 
                style={{ 
                  borderRadius: "8px", 
                  backgroundColor: "#8A2BE2", 
                  borderColor: "#8A2BE2",
                  height: '40px',
                  boxShadow: "0 2px 6px rgba(138, 43, 226, 0.2)"
                }}
              >
                创建分组
              </Button>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <Text strong style={{ color: '#8A2BE2' }}>
                分组列表 ({groups.length})
              </Text>
              <RedoOutlined 
                onClick={fetchGroups}
                style={{
                  fontSize: "16px",
                  color: "#8A2BE2",
                  cursor: "pointer",
                  transition: "all 0.3s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "rotate(90deg)";
                  e.currentTarget.style.color = "#7B1FA2";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "rotate(0deg)";
                  e.currentTarget.style.color = "#8A2BE2";
                }}
              />
            </div>
            
            <Search
              placeholder="搜索分组"
              allowClear
              value={groupNameSearchKeyword}
              onChange={(e) => setGroupNameSearchKeyword(e.target.value)}
              style={{ marginBottom: '16px', borderRadius: '8px' }}
              prefix={<SearchOutlined style={{ color: 'rgba(138, 43, 226, 0.5)' }} />}
            />
            
            <Divider style={{ margin: '0 0 16px', borderColor: 'rgba(138, 43, 226, 0.1)' }} />
            
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                <Spin size="default" />
              </div>
            ) : filteredGroups.length > 0 ? (
              <div 
                style={{ 
                  overflowY: 'auto', 
                  flexGrow: 1,
                  padding: '4px'
                }}
              >
                <List
                  dataSource={filteredGroups}
                  renderItem={(group) => (
                    <Dropdown menu={{ items: menu(group) }} trigger={["contextMenu"]}>
                      <List.Item
                        style={{
                          cursor: "pointer",
                          background: selectedGroupId === group.id 
                            ? "linear-gradient(90deg, rgba(138, 43, 226, 0.05), rgba(138, 43, 226, 0.15))" 
                            : "#fff",
                          borderRadius: "8px",
                          marginBottom: "8px",
                          padding: "12px 16px",
                          border: selectedGroupId === group.id
                            ? "1px solid rgba(138, 43, 226, 0.2)"
                            : "1px solid rgba(138, 43, 226, 0.05)",
                          boxShadow: selectedGroupId === group.id
                            ? "0 2px 8px rgba(138, 43, 226, 0.1)"
                            : "0 1px 3px rgba(0, 0, 0, 0.05)",
                          transition: "all 0.3s",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}
                        onClick={() => {
                          setSelectedGroupId(group.id);
                          fetchGroupDetails(group.id);
                        }}
                        onMouseEnter={(e) => {
                          if (selectedGroupId !== group.id) {
                            e.currentTarget.style.background = "rgba(138, 43, 226, 0.05)";
                            e.currentTarget.style.boxShadow = "0 2px 8px rgba(138, 43, 226, 0.07)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedGroupId !== group.id) {
                            e.currentTarget.style.background = "#fff";
                            e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)";
                          }
                        }}
                      >
                        <div style={{ 
                          flex: 1, 
                          fontWeight: selectedGroupId === group.id ? 500 : 400,
                          color: selectedGroupId === group.id ? "#8A2BE2" : "#333"
                        }}>
                          {group.name}
                        </div>
                        <Dropdown menu={{ items: menu(group) }}>
                          <Button 
                            type="text" 
                            icon={<MoreOutlined />} 
                            size="small"
                            onClick={(e) => e.stopPropagation()}
                            style={{ 
                              color: "#8A2BE2",
                              borderRadius: "50%",
                              width: "28px",
                              height: "28px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}
                          />
                        </Dropdown>
                      </List.Item>
                    </Dropdown>
                  )}
                />
              </div>
            ) : (
              <Empty 
                description={
                  groupNameSearchKeyword ? "没有找到匹配的分组" : "暂无分组"
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ margin: '40px 0' }}
              />
            )}
          </div>

          {/* 分组成员部分 */}
          <div style={{ 
            flex: 2, 
            background: "#fff", 
            borderRadius: "12px", 
            padding: "16px", 
            boxShadow: "0 4px 12px rgba(138, 43, 226, 0.1)",
            display: "flex",
            flexDirection: "column"
          }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              marginBottom: "16px",
              padding: "0 0 12px",
              borderBottom: "1px solid rgba(138, 43, 226, 0.1)"
            }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <TeamOutlined style={{ color: "#8A2BE2", fontSize: "20px", marginRight: "8px" }} />
                <Title level={4} style={{ margin: 0, color: "#8A2BE2" }}>
                  {selectedGroupId ? selectedGroupName : "分组成员"}
                </Title>
                
                {selectedGroupId && (
                  <Tag 
                    color="#8A2BE2" 
                    style={{ marginLeft: '12px' }}
                  >
                    {members.length} 位成员
                  </Tag>
                )}
              </div>
              
              <div>
                {selectedGroupId && (
                  <>
                    <Tooltip title="刷新成员列表">
                      <Button
                        type="text"
                        icon={
                          <RedoOutlined
                            style={{
                              fontSize: "18px",
                              color: "#8A2BE2",
                            }}
                          />
                        }
                        onClick={handleRefresh}
                        style={{
                          borderRadius: "50%",
                          marginRight: "8px",
                          width: "36px",
                          height: "36px",
                        }}
                      />
                    </Tooltip>
                    
                    <Tooltip title="添加成员">
                      <Button
                        type="primary"
                        icon={<UserAddOutlined />}
                        onClick={fetchFriendList}
                        style={{
                          borderRadius: "8px",
                          backgroundColor: "#8A2BE2",
                          borderColor: "#8A2BE2",
                          boxShadow: "0 2px 6px rgba(138, 43, 226, 0.2)"
                        }}
                      >
                        添加成员
                      </Button>
                    </Tooltip>
                  </>
                )}
              </div>
            </div>
            
            {selectedGroupId ? (
              membersLoading ? (
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <Spin size="large" />
                </div>
              ) : members.length > 0 ? (
                <List
                  style={{ 
                    overflowY: "auto",
                    flex: 1,
                    padding: "4px"
                  }}
                  dataSource={members}
                  renderItem={(member) => (
                    <List.Item
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "16px",
                        borderBottom: "1px solid rgba(138, 43, 226, 0.05)",
                        transition: "background 0.3s",
                        borderRadius: "8px",
                        marginBottom: "8px",
                        background: "rgba(250, 250, 255, 0.5)",
                        border: "1px solid rgba(138, 43, 226, 0.05)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(240, 240, 255, 0.7)";
                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(138, 43, 226, 0.05)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(250, 250, 255, 0.5)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <div style={{ position: 'relative' }}>
                        <Avatar
                          src={member.avatar}
                          size={46}
                          style={{
                            marginRight: "16px",
                            border: member.deleted 
                              ? "2px solid #ff4d4f" 
                              : "2px solid #8A2BE2",
                            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)"
                          }}
                        />
                        {member.deleted && (
                          <div
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              right: 12,
                              width: '12px',
                              height: '12px',
                              backgroundColor: '#ff4d4f',
                              borderRadius: '50%',
                              border: '2px solid white',
                            }}
                          />
                        )}
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <Text strong style={{ fontSize: '16px' }}>{member.name}</Text>
                          {member.deleted && (
                            <Tag 
                              color="error" 
                              style={{ marginLeft: '8px', fontSize: '12px' }}
                            >
                              已注销
                            </Tag>
                          )}
                        </div>
                        <Text type="secondary" style={{ display: 'block', marginTop: '4px', fontSize: '13px' }}>
                          {member.email}
                        </Text>
                      </div>
                      
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        style={{ 
                          borderRadius: "8px",
                          boxShadow: "0 2px 4px rgba(255, 77, 79, 0.1)"
                        }}
                        onClick={() => showDeleteMemberModal(member.id, member.name)}
                      >
                        移除
                      </Button>
                    </List.Item>
                  )}
                />
              ) : (
                <div style={{ 
                  flex: 1, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center', 
                  alignItems: 'center' 
                }}>
                  <Empty 
                    description="该分组暂无成员" 
                    image={Empty.PRESENTED_IMAGE_SIMPLE} 
                  />
                  <Button
                    type="primary"
                    icon={<UserAddOutlined />}
                    onClick={fetchFriendList}
                    style={{
                      marginTop: '16px',
                      borderRadius: "8px",
                      backgroundColor: "#8A2BE2",
                      borderColor: "#8A2BE2",
                      boxShadow: "0 2px 6px rgba(138, 43, 226, 0.2)"
                    }}
                  >
                    添加成员
                  </Button>
                </div>
              )
            ) : (
              <div style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center', 
                alignItems: 'center',
                color: '#8A2BE2',
                opacity: 0.7
              }}>
                <TeamOutlined style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.4 }} />
                <Text style={{ fontSize: '16px', color: '#8A2BE2' }}>请先选择一个分组</Text>
                <Text type="secondary" style={{ marginTop: '8px', textAlign: 'center', maxWidth: '300px' }}>
                  从左侧列表选择一个分组，或创建新分组
                </Text>
              </div>
            )}
          </div>
        </div>

        {/* 好友列表弹窗 */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', color: "#8A2BE2" }}>
              <UserAddOutlined style={{ marginRight: 8 }} />
              <span>添加好友到分组</span>
            </div>
          }
          open={isFriendListVisible}
          onCancel={() => {setIsFriendListVisible(false); setSearchKeyword('');}}
          footer={[
            <Button 
              key="close" 
              onClick={() => {setIsFriendListVisible(false); setSearchKeyword('');}}
              style={{ borderRadius: '6px' }}
            >
              关闭
            </Button>
          ]}
          styles={{ 
            body: { padding: "16px" },
            mask: { backdropFilter: 'blur(2px)', background: 'rgba(0,0,0,0.4)' },
            header: { borderBottom: '1px solid rgba(138, 43, 226, 0.1)' },
            footer: { borderTop: '1px solid rgba(138, 43, 226, 0.1)' },
          }}
          width={500}
        >
          <div style={{ marginBottom: '16px' }}>
            <Text type="secondary">分组: <Text strong style={{ color: '#8A2BE2' }}>{selectedGroupName}</Text></Text>
          </div>
          
          {/* 搜索框 */}
          <Search
            placeholder="搜索好友"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            style={{ 
              marginBottom: "16px", 
              borderRadius: "8px"
            }}
            prefix={<SearchOutlined style={{ color: 'rgba(138, 43, 226, 0.5)' }} />}
          />

          {/* 好友列表 */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <Spin size="large" />
            </div>
          ) : filteredFriends.length > 0 ? (
            <List
              style={{ 
                maxHeight: '400px', 
                overflowY: 'auto',
                padding: '4px'
              }}
              dataSource={filteredFriends}
              renderItem={(friend) => {
                const isInGroup = members.some((member) => member.id === friend.id);
                return (
                  <List.Item
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "12px",
                      borderRadius: "8px",
                      marginBottom: "8px",
                      background: isInGroup 
                        ? "rgba(138, 43, 226, 0.05)" 
                        : friend.deleted 
                          ? "rgba(255, 77, 79, 0.05)"
                          : "white",
                      border: isInGroup 
                        ? "1px solid rgba(138, 43, 226, 0.1)" 
                        : friend.deleted 
                          ? "1px solid rgba(255, 77, 79, 0.1)"
                          : "1px solid rgba(0, 0, 0, 0.06)",
                      transition: "all 0.3s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isInGroup && !friend.deleted) {
                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(138, 43, 226, 0.1)";
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isInGroup && !friend.deleted) {
                        e.currentTarget.style.boxShadow = "none";
                        e.currentTarget.style.transform = "translateY(0)";
                      }
                    }}
                  >
                    <div style={{ position: 'relative' }}>
                      <Avatar
                        src={friend.avatar}
                        size={40}
                        style={{
                          marginRight: "16px",
                          border: friend.deleted 
                            ? "2px solid rgba(255, 77, 79, 0.5)" 
                            : isInGroup 
                              ? "2px solid rgba(138, 43, 226, 0.5)" 
                              : "2px solid rgba(138, 43, 226, 0.2)",
                        }}
                      />
                      {friend.deleted && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 12,
                            width: '10px',
                            height: '10px',
                            backgroundColor: '#ff4d4f',
                            borderRadius: '50%',
                            border: '2px solid white',
                          }}
                        />
                      )}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Text strong>{friend.name}</Text>
                        {friend.deleted && (
                          <Tag 
                            color="error" 
                            style={{ marginLeft: '8px', fontSize: '12px' }}
                          >
                            已注销
                          </Tag>
                        )}
                        {isInGroup && (
                          <Tag 
                            color="green" 
                            style={{ marginLeft: '8px', fontSize: '12px' }}
                          >
                            已在组内
                          </Tag>
                        )}
                      </div>
                      <Text type="secondary" style={{ fontSize: '13px' }}>{friend.email}</Text>
                    </div>
                    
                    {!friend.deleted && !isInGroup && (
                      <Button
                        type="primary"
                        size="small"
                        style={{ 
                          borderRadius: "6px", 
                          backgroundColor: "#8A2BE2", 
                          borderColor: "#8A2BE2",
                          boxShadow: "0 2px 4px rgba(138, 43, 226, 0.2)"
                        }}
                        onClick={() => addFriendToGroup(friend.id)}
                      >
                        添加
                      </Button>
                    )}
                  </List.Item>
                );
              }}
            />
          ) : (
            <Empty 
              description={
                searchKeyword ? "没有找到匹配的好友" : "暂无好友"
              } 
              style={{ margin: '40px 0' }}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </Modal>
      </Drawer>
    </>
  );
};

export default GroupManagementDrawer;