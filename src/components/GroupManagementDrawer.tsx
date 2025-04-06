import React, { useState, useEffect } from "react";
import { Drawer, List, Input, Button, Typography, message, Avatar, Modal, Dropdown, Menu, Divider } from "antd";
import { PlusOutlined, UserAddOutlined } from "@ant-design/icons";
import Cookies from "js-cookie";

const { Title, Text } = Typography;

interface Group {
  id: string;
  name: string;
}

interface Member {
  id: string;
  email: string;
  name: string;
  avatar: string;
  deleted: boolean;
}

interface Friend {
  id: string;
  name: string;
  email: string;
  avatar: string;
  deleted: boolean;
}

interface GroupManagementDrawerProps {
  visible: boolean;
  onClose: () => void;
}

const GroupManagementDrawer: React.FC<GroupManagementDrawerProps> = ({ visible, onClose }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(undefined);
  const [members, setMembers] = useState<Member[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isFriendListVisible, setIsFriendListVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<string | undefined>(undefined);
  const [isDeleteMemberModalVisible, setIsDeleteMemberModalVisible] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | undefined>(undefined);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | undefined>(undefined);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [searchKeyword, setSearchKeyword] = useState(""); 

  // 获取分组列表
  const fetchGroups = async () => {
    const token = Cookies.get("jwtToken");
    if (!token) {
      messageApi.error("未登录，请先登录");
      return;
    }

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
      } else {
        messageApi.error(res.info || "获取分组失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    }
  };

  // 修改分组名称
  const updateGroupName = async (groupId: string, newName: string) => {
    if (!newName.trim()) {
      messageApi.error("分组名称不能为空");
      return;
    }

    const token = Cookies.get("jwtToken");
    if (!token) {
      messageApi.error("未登录，请先登录");
      return;
    }

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
      } else {
        messageApi.error(res.info || "修改分组名称失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  // 删除分组
  const deleteGroup = async () => {
    if (!groupToDelete) return;

    const token = Cookies.get("jwtToken");
    if (!token) {
      messageApi.error("未登录，请先登录");
      return;
    }

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
        setSelectedGroupId(undefined); // 清空选中分组
        setMembers([]); // 清空成员列表
      } else {
        messageApi.error(res.info || "删除分组失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setLoading(false);
      setIsDeleteModalVisible(false); // 关闭删除确认弹窗
      setGroupToDelete(undefined); // 清空待删除的分组 ID
    }
  };

  const showDeleteModal = (groupId: string) => {
    setGroupToDelete(groupId);
    setIsDeleteModalVisible(true);
  };

  // 打开修改分组名称的弹窗
  const showEditModal = (group: Group) => {
    setEditingGroup(group);
    setEditingGroupName(group.name);
    setIsEditModalVisible(true);
  };

  // 确认修改分组名称
  const handleEditGroupName = async () => {
    if (editingGroup && editingGroupName.trim()) {
      await updateGroupName(editingGroup.id, editingGroupName.trim());
      setIsEditModalVisible(false);
      setEditingGroup(undefined);
      setEditingGroupName("");
    } else {
      messageApi.error("分组名称不能为空");
    }
  };

  // 获取分组详情
  const fetchGroupDetails = async (groupId: string) => {
    const token = Cookies.get("jwtToken");
    if (!token) {
      messageApi.error("未登录，请先登录");
      return;
    }

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
      } else {
        messageApi.error(res.info || "获取分组详情失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    }
  };

  // 创建分组
  const createGroup = async () => {
    if (!newGroupName.trim()) {
      messageApi.error("分组名称不能为空");
      return;
    }

    const token = Cookies.get("jwtToken");
    if (!token) {
      messageApi.error("未登录，请先登录");
      return;
    }

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
    if (!selectedGroupId || !memberToDelete) return;

    const token = Cookies.get("jwtToken");
    if (!token) {
      messageApi.error("未登录，请先登录");
      return;
    }

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
      } else {
        messageApi.error(res.info || "删除分组成员失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setLoading(false);
      setIsDeleteMemberModalVisible(false); // 关闭删除确认弹窗
      setMemberToDelete(undefined); // 清空待删除的成员 ID
    }
  };

  const showDeleteMemberModal = (memberId: string) => {
    setMemberToDelete(memberId);
    setIsDeleteMemberModalVisible(true);
  };

  // 获取分组成员列表
  const fetchGroupMembers = async (groupId: string) => {
    const token = Cookies.get("jwtToken");
    if (!token) {
      messageApi.error("未登录，请先登录");
      return;
    }

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
      } else {
        messageApi.error(res.info || "获取分组成员失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    }
  };

  // 获取好友列表
  const fetchFriendList = async () => {
    const token = Cookies.get("jwtToken");
    if (!token) {
      messageApi.error("未登录，请先登录");
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

      if (response.status === 401) {
        messageApi.error("JWT令牌无效或已过期，请重新登录");
        return;
      }

      const res = await response.json();

      if (res.code === 0) {
        setFriends(res.friends || []);
        setIsFriendListVisible(true); // 打开好友列表弹窗
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
  const addFriendToGroup = async (friendId: string) => {
    if (!selectedGroupId) {
      messageApi.error("请先选择一个分组");
      return;
    }

    const token = Cookies.get("jwtToken");
    if (!token) {
      messageApi.error("未登录，请先登录");
      return;
    }

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
      } else {
        messageApi.error(res.info || "添加好友到分组失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchGroups();
    }
  }, [visible]);

  // 修改后的菜单
  const menu = (group: Group) => (
    <Menu>
      <Menu.Item key="edit" onClick={() => showEditModal(group)}>
        修改名称
      </Menu.Item>
      <Menu.Item key="delete" danger onClick={() => showDeleteModal(group.id)}>
        删除分组
      </Menu.Item>
    </Menu>
  );

  // 过滤好友列表
  const filteredFriends = friends.filter((friend) =>
    friend.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    friend.email.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  return (
    <>
      {/* 修改分组名称弹窗 */}
      <Modal
        title="修改分组名称"
        open={isEditModalVisible}
        onOk={handleEditGroupName}
        onCancel={() => setIsEditModalVisible(false)}
        okText="确认"
        cancelText="取消"
      >
        <Input
          placeholder="请输入新的分组名称"
          value={editingGroupName}
          onChange={(e) => setEditingGroupName(e.target.value)}
          maxLength={50}
        />
      </Modal>

      {/* 删除分组确认弹窗 */}
      <Modal
        title={<span style={{ color: "#f5222d", fontWeight: "bold" }}>确认删除分组</span>}
        open={isDeleteModalVisible}
        onOk={deleteGroup}
        onCancel={() => setIsDeleteModalVisible(false)}
        okText="确认"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p style={{ color: "#888" }}>删除分组将无法恢复，是否继续？</p>
      </Modal>

      {/* 删除分组成员确认弹窗 */}
      <Modal
        title={<span style={{ color: "#f5222d", fontWeight: "bold" }}>确认删除成员</span>}
        open={isDeleteMemberModalVisible}
        onOk={deleteGroupMember}
        onCancel={() => setIsDeleteMemberModalVisible(false)}
        okText="确认"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p style={{ color: "#888" }}>删除成员将无法恢复，是否继续？</p>
      </Modal>

      <Drawer
        title={<span style={{ color: "#4caf50", fontWeight: "bold", fontSize: "20px" }}>分组管理</span>}
        placement="left"
        onClose={onClose}
        open={visible}
        width="70vw"
        bodyStyle={{ padding: "24px", background: "#f0f2f5" }}
      >
        {contextHolder}
        <div style={{ display: "flex", gap: "16px", height: "100%" }}>
          {/* 左侧分组列表 */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#fff", borderRadius: "8px", padding: "16px", boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)" }}>
            <div style={{ marginBottom: "16px" }}>
              <Input
                placeholder="输入分组名称"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                style={{ marginBottom: "8px", borderRadius: "8px" }}
              />
              <Button type="primary" onClick={createGroup} loading={loading} block style={{ borderRadius: "8px", backgroundColor: "#4caf50", borderColor: "#4caf50" }}>
                创建分组
              </Button>
            </div>
            <Divider>分组列表</Divider>
            <List
              dataSource={groups}
              renderItem={(group) => (
                <Dropdown overlay={menu(group)} trigger={["contextMenu"]}>
                  <List.Item
                    style={{
                      cursor: "pointer",
                      background: selectedGroupId === group.id ? "#e6f7ff" : "#fff",
                      borderRadius: "8px",
                      marginBottom: "8px",
                      padding: "12px",
                      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                      transition: "background 0.3s",
                    }}
                    onClick={() => {
                      setSelectedGroupId(group.id);
                      fetchGroupDetails(group.id);
                    }}
                  >
                    {group.name}
                  </List.Item>
                </Dropdown>
              )}
            />
          </div>

          {/* 分组成员部分 */}
          <div style={{ flex: 2, background: "#fff", borderRadius: "8px", padding: "16px", boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                <Divider
                  orientation="left"
                  style={{
                    margin: 0,
                    fontWeight: "bold",
                    fontSize: "18px", // 更大的字体
                    color: "#4caf50", // 柔和的绿色
                    width: "100px", // 控制分界线的长度
                  }}
                >
                  分组成员
                </Divider>
              </div>
              <UserAddOutlined
                onClick={fetchFriendList}
                style={{
                  fontSize: "20px",
                  color: "#4caf50",
                  cursor: "pointer",
                  transition: "color 0.3s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#66bb6a")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#4caf50")}
              />
            </div>
            {selectedGroupId ? (
              <List
                dataSource={members}
                renderItem={(member) => (
                  <List.Item
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "8px",
                      borderBottom: "1px solid #f0f0f0",
                      transition: "background 0.3s",
                    }}
                  >
                    <Avatar
                      src={member.avatar}
                      size={40}
                      style={{
                        marginRight: "16px",
                        border: member.deleted ? "2px solid #f5222d" : "2px solid #4caf50",
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <Text strong>{member.name}</Text>
                      <br />
                      <Text type="secondary">{member.email}</Text>
                      {member.deleted && (
                        <Text type="danger" style={{ marginLeft: "8px" }}>
                          （已注销）
                        </Text>
                      )}
                    </div>
                    <Button
                      danger
                      size="small"
                      style={{ borderRadius: "8px" }}
                      onClick={() => showDeleteMemberModal(member.id)}
                    >
                      删除
                    </Button>
                  </List.Item>
                )}
              />
            ) : (
              <p style={{ textAlign: "center", color: "#888" }}>请选择一个分组以查看成员</p>
            )}
          </div>
        </div>

        {/* 好友列表弹窗 */}
        <Modal
          title={<span style={{ color: "#1890ff", fontWeight: "bold" }}>好友列表</span>}
          open={isFriendListVisible}
          onCancel={() => setIsFriendListVisible(false)}
          footer={undefined}
          bodyStyle={{ padding: "16px", background: "#f9f9f9" }}
        >
          {/* 搜索框 */}
          <Input.Search
            placeholder="搜索好友"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            style={{ marginBottom: "16px", borderRadius: "8px" }}
          />

          {/* 好友列表 */}
          <List
            dataSource={filteredFriends} // 使用过滤后的好友列表
            renderItem={(friend) => {
              const isInGroup = members.some((member) => member.id === friend.id);
              return (
                <List.Item
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "8px",
                    borderBottom: "1px solid #f0f0f0",
                    transition: "background 0.3s",
                  }}
                >
                  <Avatar
                    src={friend.avatar}
                    size={40}
                    style={{
                      marginRight: "16px",
                      border: friend.deleted ? "2px solid #f5222d" : "2px solid #4caf50",
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <Text strong>{friend.name}</Text>
                    <br />
                    <Text type="secondary">{friend.email}</Text>
                    {friend.deleted && (
                      <Text type="danger" style={{ marginLeft: "8px" }}>
                        （已注销）
                      </Text>
                    )}
                  </div>
                  {!friend.deleted && (
                    isInGroup ? (
                      <Text type="secondary" style={{ marginLeft: "8px" }}>
                        已在组内
                      </Text>
                    ) : (
                      <Button
                        type="primary"
                        size="small"
                        style={{ borderRadius: "8px", backgroundColor: "#4caf50", borderColor: "#4caf50" }}
                        onClick={() => addFriendToGroup(friend.id)}
                      >
                        加入分组
                      </Button>
                    )
                  )}
                </List.Item>
              );
            }}
          />
        </Modal>
      </Drawer>
    </>
  );
};

export default GroupManagementDrawer;