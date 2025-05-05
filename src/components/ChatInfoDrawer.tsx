import { useState, useEffect, Dispatch, SetStateAction } from "react";
import { Drawer, List, Avatar, Typography, message, Spin, Divider, Tag, Empty, Input, Dropdown, Button, Modal, Form, Upload, Checkbox, Radio, Switch, DatePicker, Space, Table, Select} from "antd";
import { UserOutlined, CrownOutlined, UserSwitchOutlined, SearchOutlined, TeamOutlined, SettingOutlined, MoreOutlined, EditOutlined, UploadOutlined, NotificationOutlined, DeleteOutlined, PlusOutlined, UserAddOutlined, CheckCircleOutlined, WarningOutlined, HistoryOutlined, FilterOutlined, MailOutlined } from "@ant-design/icons";
import { Friend } from "../utils/types";
import Cookies from "js-cookie";
import { useRouter } from "next/router";

const { Text, Title } = Typography;

// 消息类型定义
interface Message {
  id: number;
  type: number; // 0为普通文字，1为图片
  sender_id: number;
  sender_name: string;
  sender_avatar: string;
  content: string;
  timestamp: string;
}

interface ChatMember {
  id: number;
  name: string;
  avatar: string;
  identity: number; // 1: 群主, 2: 管理员, 3: 普通成员
}

interface GroupNotification {
  notification_id: number;
  content: string;
  sender_name: string;
  timestamp: string;
}

interface ChatInfoDrawerProps {
  visible: boolean;
  onClose: () => void;
  conversationId: number;
  isGroup: boolean;
  groupName?: string;     // 从chat.tsx传入的群聊名称
  groupAvatar?: string;   // 从chat.tsx传入的群聊头像
  isTop: boolean;         // 新增：是否置顶
  noticeAble: boolean;    // 新增：是否通知（免打扰相反）
  refreshConversations: () => void; // 新增：刷新会话列表的回调函数
  userId: number;
  userInfo: any;
  fetchMessages: (conversationId: number, shouldScroll: boolean, fromTime?: string) => void;
  websocket: number;
  setWebsocket: Dispatch<SetStateAction<number>>;
}

const ChatInfoDrawer = ({ visible, onClose, conversationId, isGroup, groupName, groupAvatar, isTop, noticeAble, refreshConversations, userId, userInfo, fetchMessages, websocket, setWebsocket }: ChatInfoDrawerProps) => {
  const [memberloading, setmemberLoading] = useState(false);
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [userIdentity, setUserIdentity] = useState<number>(3); // 默认为普通成员
  const [messageApi, contextHolder] = message.useMessage();
  const [searchText, setSearchText] = useState("");
  const [activeMenu, setActiveMenu] = useState("聊天成员");
  const [loadingAction, setLoadingAction] = useState<number | undefined>(undefined); // 用于标记当前正在操作的成员ID
  const router = useRouter();

  // 群信息编辑相关状态
  const [isGroupInfoModalVisible, setIsGroupInfoModalVisible] = useState(false);
  const [groupInfoForm] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [groupInfo, setGroupInfo] = useState<{name: string, avatar: string}>({
    name: '',
    avatar: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 转让群主相关状态
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [targetMember, setTargetMember] = useState<ChatMember | undefined>(undefined);
  const [transferLoading, setTransferLoading] = useState(false);

  // 群公告相关状态
  const [notifications, setNotifications] = useState<GroupNotification[]>([]);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [isNotificationModalVisible, setIsNotificationModalVisible] = useState(false);
  const [notificationContent, setNotificationContent] = useState('');
  const [isPostingNotification, setIsPostingNotification] = useState(false);
  const [deletingNotificationId, setDeletingNotificationId] = useState<number | undefined>(undefined);

  // 添加邀请成员相关状态
  const [isInviteModalVisible, setIsInviteModalVisible] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<number | undefined>(undefined);
  const [searchFriendText, setSearchFriendText] = useState("");

  // 邀请相关状态
  const [invitations, setInvitations] = useState<any[]>([]); 
  const [invitationLoading, setInvitationLoading] = useState(false);
  const [processingInviteId, setProcessingInviteId] = useState<number | undefined>(undefined);

  // 添加管理置顶和免打扰的状态
  const [topState, setTopState] = useState<boolean>(isTop);
  const [notificationState, setNotificationState] = useState<boolean>(noticeAble);
  const [settingLoading, setSettingLoading] = useState(false);

  // 退出或者解散群聊
  const [dissolveOrLeaveModalVisible, setDissolveOrLeaveModalVisible] = useState(false);

  // 聊天记录筛选相关状态
  const [messageSearchForm] = Form.useForm();
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [messageLoading, setMessageLoading] = useState(false);
  const { RangePicker } = DatePicker;

  const [messageSearchModalVisible, setMessageSearchModalVisible] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<number[]>([]);
  const [deletingMessages, setDeletingMessages] = useState(false);

  const [userDetailModalVisible, setUserDetailModalVisible] = useState(false);
  const [userDetail, setUserDetail] = useState<{
    id: number;
    name: string;
    email: string;
    avatar: string;
    is_deleted: boolean;
    is_friend: boolean;
  } | undefined>(undefined);
  const [loadingUserDetail, setLoadingUserDetail] = useState(false);
  const [addFriendMessageText, setAddFriendMessageText] = useState("");
  const [sendingFriendRequest, setSendingFriendRequest] = useState(false);

  // 初始化群组信息
  useEffect(() => {
    if (groupName || groupAvatar) {
      setGroupInfo({
        name: groupName || '',
        avatar: groupAvatar || ''
      });
    }
  }, [groupName, groupAvatar]);

  useEffect(() => {
    if (websocket === 1) {
      fetchChatMembers();
      setWebsocket(0);
    }
    else if (websocket === 2) {
      fetchNotifications();
      setWebsocket(0)
    }
    else if (websocket === 3) {
      fetchInvitations();
      setWebsocket(0);
    }
    else if (websocket === 4) {
      setIsGroupInfoModalVisible(false);
      setTransferModalVisible(false);
      setIsNotificationModalVisible(false);
      setNotificationContent('');
      setIsInviteModalVisible(false);
      setDissolveOrLeaveModalVisible(false);
      setMessageSearchModalVisible(false);
      setSelectedMessages([]);
      setDeletingMessages(false);
      setUserDetailModalVisible(false);
      onClose();
      messageApi.warning("您已被移出群聊，或被好友删除");
      setWebsocket(0);
    }
    else if (websocket === 5) {
      fetchFriends();
      setWebsocket(0);
    }
    else if (websocket === 6) {
      setIsGroupInfoModalVisible(false);
      setTransferModalVisible(false);
      setIsNotificationModalVisible(false);
      setNotificationContent('');
      setIsInviteModalVisible(false);
      setDissolveOrLeaveModalVisible(false);
      setMessageSearchModalVisible(false);
      setSelectedMessages([]);
      setDeletingMessages(false);
      setUserDetailModalVisible(false);
      onClose();
      setWebsocket(0);
    }
  }, [websocket]);

  // 当props变化时更新本地状态
  useEffect(() => {
    setTopState(isTop);
    setNotificationState(noticeAble);
  }, [isTop, noticeAble]);

  // 获取群聊成员列表
  const fetchChatMembers = async () => {
    if (!conversationId) {
      messageApi.error("请选择一个聊天");
      return;
    }
    
    setmemberLoading(true);
    const token = Cookies.get("jwtToken");

    try {
      const response = await fetch(`/api/conversations/get_members?conversation_id=${conversationId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
      });

      const res = await response.json();
      
      if (res.code === 0) {
        setMembers(res.members);
        if (isGroup) {
          setUserIdentity(res.identity);
        }
      } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.error("JWT token无效或过期，正在跳转回登录界面...").then(() => {router.push("/");})
      } else {
        messageApi.error(res.info || "获取聊天成员失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setmemberLoading(false);
    }
  };

  // 添加获取用户详情的函数
  const fetchUserDetail = async (userId: number) => {
    if (userId === undefined) {
      messageApi.error("用户ID不存在");
      return;
    }
    
    setLoadingUserDetail(true);
    const token = Cookies.get("jwtToken");

    try {
      // 使用查询参数而不是请求体
      const response = await fetch(`/api/search_user_detail?userId=${userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        }
      });

      const res = await response.json();
      
      if (res.code === 0) {
        setUserDetail(
          {
            id: userId,
            name: res.user.name,
            email: res.user.email,
            avatar: res.user.avatar,
            is_deleted: res.user.is_deleted,
            is_friend: res.user.is_friend
          }
        );
        // 默认设置添加好友的消息
        setAddFriendMessageText(`你好，我是群「${groupInfo.name || "当前群聊"}」的成员，请求添加你为好友。`);
        setUserDetailModalVisible(true);
      } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.error("JWT token无效或过期，正在跳转回登录界面...").then(() => {router.push("/");})
      } else if (res.code === -1) {
        messageApi.error("用户不存在");
      } else {
        messageApi.error(res.info || "获取用户信息失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setLoadingUserDetail(false);
    }
  };

  // 添加发送好友请求的函数
  const sendFriendRequest = async (targetId: number) => {
    if (!addFriendMessageText.trim()) {
      messageApi.warning("请输入附言");
      return;
    }
    
    setSendingFriendRequest(true);
    const token = Cookies.get("jwtToken");

    try {
      const response = await fetch("/api/add_friend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
        body: JSON.stringify({
          target_id: targetId,
          message: addFriendMessageText.trim(),
        }),
      });

      const res = await response.json();
      
      if (res.code === 0) {
        messageApi.success(res.message || "好友申请已发送");
        setUserDetailModalVisible(false);
        // 刷新用户信息
        // fetchUserDetail(targetId);
      } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.error("JWT token无效或过期，正在跳转回登录界面...").then(() => {router.push("/");})
      } else {
        messageApi.error(res.info || "发送好友申请失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setSendingFriendRequest(false);
    }
  };
  // 获取群公告列表
  const fetchNotifications = async () => {
    if (!conversationId) {
      messageApi.error("请选择一个聊天");
      return;
    }
    if (!isGroup) {
      messageApi.error("非群聊无法发送公告");
      return 
    }
    
    setNotificationLoading(true);
    const token = Cookies.get("jwtToken");

    try {
      const response = await fetch(`/api/conversations/manage/notifications?conversation_id=${conversationId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
      });

      const res = await response.json();
      
      if (res.code === 0) {
        setNotifications(res.notifications || []);
      } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.error("JWT token无效或过期，正在跳转回登录界面...").then(() => {router.push("/");})
      } else {
        messageApi.error(res.info || "获取群公告失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setNotificationLoading(false);
    }
  };

  // 获取好友列表
  const fetchFriends = async () => {
    setFriendsLoading(true);
    const token = Cookies.get("jwtToken");

    try {
      const response = await fetch("/api/friends", {
        method: "GET",
        headers: {
          Authorization: `${token}`,
        },
      });

      const res = await response.json();

      if (res.code === 0) {
        // 过滤掉已经在群里的成员
        const existingMemberIds = members.map(member => member.id);
        const availableFriends = res.friends.filter((friend: Friend) => 
          !existingMemberIds.includes(friend.id) && !friend.deleted
        );
        setFriends(availableFriends);
      } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.error("JWT token无效或过期，正在跳转回登录界面...").then(() => {router.push("/");})
      } else {
        messageApi.error(res.info || "获取好友列表失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setFriendsLoading(false);
    }
  };

  // 邀请好友加入群聊
  const inviteFriends = async () => {
    if (selectedFriend === undefined) {
      messageApi.warning("请选择一位好友");
      return;
    }

    setInviteLoading(true);
    const token = Cookies.get("jwtToken");

    try {
      const response = await fetch(`/api/conversations/member/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
        body: JSON.stringify({
          conversationId,
          member_id: selectedFriend,
        }),
      });

      const res = await response.json();
      
      if (res.code === 0) {
        messageApi.success(res.message || "邀请成功，等待管理员确认");
        setIsInviteModalVisible(false);
        setSelectedFriend(undefined);
      } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.error("JWT token无效或过期，正在跳转回登录界面...").then(() => {router.push("/");})
      } else if (res.code === -3) {
        messageApi.error("选择的好友已经是群成员");
      } else if (res.code === -4) {
        messageApi.error("选择的用户不是您的好友");
      } else if (res.code === -5) {
        messageApi.warning("已发送邀请，正在等待管理员确认");
      } else {
        messageApi.error(res.info || "邀请好友失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setInviteLoading(false);
    }
  };

  // 处理邀请模态框打开事件
  const handleOpenInviteModal = () => {
    setIsInviteModalVisible(true);
    fetchFriends();
    setSearchFriendText("");
    setSelectedFriend(undefined);
  };

  // 设置管理员
  const setAdmin = async (memberId: number) => {
    if (!conversationId) {
      messageApi.error("请选择一个聊天");
      return;
    }
    
    setLoadingAction(memberId);
    const token = Cookies.get("jwtToken");

    try {
      const response = await fetch(`/api/conversations/manage/admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          user: memberId,
        }),
      });

      const res = await response.json();
      
      if (res.code === 0) {
        messageApi.success("设置管理员成功");
      } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.error("JWT token无效或过期，正在跳转回登录界面...").then(() => {router.push("/");})
      } else {
        messageApi.error(res.info || "设置管理员失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setLoadingAction(undefined);
    }
  };

  // 解除管理员
  const removeAdmin = async (memberId: number) => {
    if (!conversationId) {
      messageApi.error("请选择一个聊天");
      return;
    }
    
    setLoadingAction(memberId);
    const token = Cookies.get("jwtToken");

    try {
      const response = await fetch(`/api/conversations/manage/admin`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          user: memberId,
        }),
      });

      const res = await response.json();
      
      if (res.code === 0) {
        messageApi.success("解除管理员成功");
      } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.error("JWT token无效或过期，正在跳转回登录界面...").then(() => {router.push("/");})
      } else {
        messageApi.error(res.info || "解除管理员失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setLoadingAction(undefined);
    }
  };

  // 转让群主
  const transferOwnership = async () => {
    if (!conversationId) {
      messageApi.error("请选择一个聊天");
      return;
    }
    if (!targetMember) {
      messageApi.error("请选择一个转让对象");
      return;
    }
    
    setTransferLoading(true);
    const token = Cookies.get("jwtToken");

    try {
      const response = await fetch(`/api/conversations/manage/ownership_transfer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          user: targetMember.id,
        }),
      });

      const res = await response.json();
      
      if (res.code === 0) {
        messageApi.success(res.message || "群主转让成功");
        setTransferModalVisible(false);
        setTargetMember(undefined);
      } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.error("JWT token无效或过期，正在跳转回登录界面...").then(() => {router.push("/");})
      } else if (res.code === -3) {
        if (res.info === "非群主不能转让群主") {
          messageApi.error("你不是群主，无法转让群主身份");
        } else if (res.info === "不能转让给自己") {
          messageApi.error("不能将群主转让给自己");
        } else {
          messageApi.error(res.info || "转让群主失败");
        }
      } else if (res.code === -1) {
        messageApi.error(res.info || "群聊或用户不存在");
      } else if (res.code === 1) {
        messageApi.error("该用户不在群聊中");
      } else {
        messageApi.error(res.info || "转让群主失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setTransferLoading(false);
    }
  };

  // 发布群公告
  const postNotification = async () => {
    if (!conversationId) {
      messageApi.error("请选择一个聊天");
      return;
    }
    if (!notificationContent.trim()) {
      messageApi.error("请不要发送空公告");
      return;
    }
    
    setIsPostingNotification(true);
    const token = Cookies.get("jwtToken");

    try {
      const response = await fetch(`/api/conversations/manage/notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          content: notificationContent.trim(),
        }),
      });

      const res = await response.json();
      
      if (res.code === 0) {
        messageApi.success(res.message || "发布群公告成功");
        setIsNotificationModalVisible(false);
        setNotificationContent('');
      } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.error("JWT token无效或过期，正在跳转回登录界面...").then(() => {router.push("/");})
      } else if (res.code === -3) {
        messageApi.error("你不是群主或管理员，无法发布群公告");
      } else {
        messageApi.error(res.info || "发布群公告失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setIsPostingNotification(false);
    }
  };

  // 删除群公告
  const deleteNotification = async (notificationId: number) => {
    if (!notificationId) {
      messageApi.error("请选择一个待删除的群公告");
      return;
    }

    setDeletingNotificationId(notificationId);
    const token = Cookies.get("jwtToken");

    try {
      const response = await fetch(`/api/conversations/manage/notifications`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
        body: JSON.stringify({
          notification_id: notificationId,
        }),
      });

      const res = await response.json();
      
      if (res.code === 0) {
        messageApi.success(res.message || "删除群公告成功");
        // 从本地状态中移除已删除的公告
       } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.error("JWT token无效或过期，正在跳转回登录界面...").then(() => {router.push("/");})
      } else if (res.code === -3) {
        messageApi.error("你不是群主或管理员，无法删除群公告");
      } else if (res.code === -1) {
        messageApi.error("公告不存在或已被删除");
        // 重新获取群公告列表
        fetchNotifications();
      } else {
        messageApi.error(res.info || "删除群公告失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setDeletingNotificationId(undefined);
    }
  };

  // 获取群聊邀请列表
  const fetchInvitations = async () => {
    if (!conversationId) {
      messageApi.error("请选择一个聊天");
      return;
    }
    if (!isGroup) {
      messageApi.error("非群聊没有邀请列表");
      return;
    }
    
    setInvitationLoading(true);
    const token = Cookies.get("jwtToken");

    try {
      const response = await fetch(`/api/conversations/invitation?conversation_id=${conversationId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
      });

      const res = await response.json();
      
      if (res.code === 0) {
        setInvitations(res.invitations || []);
      } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.error("JWT token无效或过期，正在跳转回登录界面...").then(() => {router.push("/");})
      } else {
        messageApi.error(res.info || "获取群聊邀请列表失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setInvitationLoading(false);
    }
  };

  // 处理邀请（接受或拒绝）
  const handleInvitation = async (inviteId: number, accept: boolean) => {
    setProcessingInviteId(inviteId);
    const token = Cookies.get("jwtToken");

    try {
      const response = await fetch(`/api/conversations/manage/handle_invitation`, {
        method: accept ? "POST" : "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
        body: JSON.stringify({
          invite_id: inviteId,
        }),
      });

      const res = await response.json();
      
      if (res.code === 0) {
        messageApi.success(res.message || (accept ? "已接受邀请" : "已拒绝邀请"));
      } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.error("JWT token无效或过期，正在跳转回登录界面...").then(() => {router.push("/");})
      } else if (res.code === -3) {
        messageApi.error("非群主或管理员不能处理邀请");
      } else if (res.code === -4) {
        messageApi.warning("该邀请已被处理");
        // 刷新邀请列表
        fetchInvitations();
      } else if (res.code === -5) {
        messageApi.error("邀请不存在");
        // 从当前列表中移除
        setInvitations(prevInvitations => 
          prevInvitations.filter(invitation => invitation.invite_id !== inviteId)
        );
      } else if (res.code === -6) {
        messageApi.warning("该用户已在群聊中");
        // 更新邀请状态
        fetchInvitations();
      } else {
        messageApi.error(res.info || "处理邀请失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setProcessingInviteId(undefined);
    }
  };

  // 更新会话设置
  const updateConversationSettings = async (settingType: 'ontop' | 'notification', value: boolean) => {
    if (!conversationId) {
      messageApi.error("请选择一个聊天");
      return;
    }
    
    setSettingLoading(true);
    const token = Cookies.get("jwtToken");
    
    const requestBody: {
      conversationId: number;
      ontop?: boolean;
      notification?: boolean;
      unreads?: boolean;
    } = {
      conversationId
    };
    
    if (settingType === 'ontop') {
      requestBody.ontop = value;
    } else if (settingType === 'notification') {
      requestBody.notification = value;
    }
    
    try {
      const response = await fetch("/api/interface", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const res = await response.json();
      
      if (res.code === 0) {
        messageApi.success(`${settingType === 'ontop' ? '置顶' : '通知'}设置已更新`);
        
        // 更新本地状态
        if (settingType === 'ontop') {
          setTopState(value);
        } else if (settingType === 'notification') {
          setNotificationState(value);
        }
        
        // 刷新会话列表
        refreshConversations();
      } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.error("JWT token无效或过期，正在跳转回登录界面...").then(() => {router.push("/");})
      } else {
        messageApi.error(res.info || "设置更新失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setSettingLoading(false);
    }
  };

  const convertToDateTime = (isoString: string) => {
    const date = new Date(isoString);
  
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const seconds = date.getUTCSeconds().toString().padStart(2, '0');
  
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  // 筛选聊天记录
  const searchMessages = async (values: any) => {
    if (!conversationId) {
      messageApi.error("请选择一个聊天");
      return;
    }
    
    setMessageLoading(true);
    setSelectedMessages([]);
    const token = Cookies.get("jwtToken");
    
    // 准备请求体
    const requestBody: {
      conversationId: number;
      start_time?: string;
      end_time?: string;
      sender_id?: number;
      content?: string;
    } = {
      conversationId
    };
    
    // 如果有时间范围
    if (values.timeRange && values.timeRange.length === 2) {
      requestBody.start_time = convertToDateTime(values.timeRange[0].toISOString());
      requestBody.end_time = convertToDateTime(values.timeRange[1].toISOString());
    }
    
    // 如果选择了发送者
    if (values.sender_id) {
      requestBody.sender_id = values.sender_id;
    }
    
    // 如果有关键词
    if (values.content && values.content.trim()) {
      requestBody.content = values.content.trim();
    }

    try {
      const response = await fetch(`/api/conversations/sift`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const res = await response.json();
      
      if (res.code === 0) {
        setFilteredMessages(res.messages || []);
        if (res.messages.length === 0 && messageSearchModalVisible === false)
          messageApi.error(`未找到符合条件的消息`);
        else if (res.messages.length !== 0)
          messageApi.success(`共找到 ${res.messages.length} 条消息`);
        if (res.messages.length > 0) {
          setMessageSearchModalVisible(true);
        }
      } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.error("JWT token无效或过期，正在跳转回登录界面...").then(() => {router.push("/");})
      } else {
        messageApi.error(res.info || "筛选消息失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setMessageLoading(false);
    }
  };

  // 新增删除聊天记录的函数
const deleteMessages = async () => {
  if (selectedMessages.length === 0) {
    messageApi.warning("请至少选择一条消息");
    return;
  }
  
  setDeletingMessages(true);
  const token = Cookies.get("jwtToken");

  try {
    const response = await fetch(`/api/conversations/delete_messages`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${token}`,
      },
      body: JSON.stringify({
        message_ids: selectedMessages
      }),
    });

    const res = await response.json();
    
    if (res.code === 0) {
      messageApi.success(res.message || "删除聊天记录成功");
      // 从筛选结果中移除已删除的消息
      searchMessages(messageSearchForm.getFieldsValue());
      // 清空选择
      setSelectedMessages([]);
      fetchMessages(conversationId, false, undefined);
    } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
      Cookies.remove("jwtToken");
      Cookies.remove("userEmail");
      messageApi.error("JWT token无效或过期，正在跳转回登录界面...").then(() => {router.push("/");})
    } else if (res.code === -1) {
      messageApi.error("部分或全部消息不存在");
      // 重新获取筛选结果
      await searchMessages(messageSearchForm.getFieldsValue());
    } else {
      messageApi.error(res.info || "删除聊天记录失败");
    }
  } catch (error) {
    messageApi.error("网络错误，请稍后重试");
  } finally {
    setDeletingMessages(false);
  }
};

  // 当抽屉可见时，获取相关数据
  useEffect(() => {
    if (visible && conversationId !== 0) {
      setActiveMenu("聊天成员");
      fetchChatMembers();
      setSearchText(""); // 重置搜索框

      //重置聊天记录搜索状态
      messageSearchForm.resetFields();
      setFilteredMessages([]);
      setMessageLoading(false);

      if (isGroup) {
        fetchNotifications(); // 获取群公告
        fetchInvitations(); // 获取群聊邀请列表
      }

    }
  }, [visible, conversationId]);

  // 获取身份标签
  const getIdentityTag = (identity: number) => {
    switch (identity) {
      case 1:
        return <Tag icon={<CrownOutlined />} color="gold">群主</Tag>;
      case 2:
        return <Tag icon={<UserSwitchOutlined />} color="blue">管理员</Tag>;
      case 3:
        return <Tag icon={<UserOutlined />} color="default">成员</Tag>;
      default:
        return undefined;
    }
  };

  // 处理图片上传前的操作
  const getBase64 = (img: File, callback: (base64: string) => void): void => {
    const reader = new FileReader();
    reader.addEventListener('load', () => callback(reader.result as string));
    reader.readAsDataURL(img);
  };

  const beforeUpload = (file: File) => {
    const isJPG = file.type === 'image/jpeg';
    if (!isJPG) {
      messageApi.error("只能上传JPG格式的图片");
      return false;
    }

    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      messageApi.error("图片大小需要小于2MB");
      return false;
    }

    setUploading(true);
    getBase64(file, (base64) => {
      const base64Length = base64.length - (base64.indexOf(',') + 1);
      const isBase64Lt2M = base64Length < 2 * 1024 * 1024;
      if (!isBase64Lt2M) {
        messageApi.error("转换后的图片大小超过2MB");
        setUploading(false);
        return;
      }

      groupInfoForm.setFieldsValue({ avatar: base64 });
      setUploading(false);
      messageApi.success("上传成功");
    });

    return false;
  };

  // 更新群信息
  const updateGroupInfo = async (values: any) => {
    if (!conversationId) {
      messageApi.error("请选择一个聊天");
      return;
    }
    
    setIsSubmitting(true);
    const token = Cookies.get("jwtToken");
    
    // 准备请求体，只包含有变化的字段
    const requestBody: {
      conversation_id: number;
      name?: string;
      avatar?: string;
    } = {
      conversation_id: conversationId
    };
    
    if (values.name && values.name !== groupInfo.name) {
      requestBody.name = values.name;
    }
    
    if (values.avatar && values.avatar !== groupInfo.avatar) {
      requestBody.avatar = values.avatar;
    }
    
    // 如果没有任何更改，直接返回
    if (!requestBody.name && !requestBody.avatar) {
      messageApi.info("没有检测到任何更改");
      setIsSubmitting(false);
      setIsGroupInfoModalVisible(false);
      return;
    }

    try {
      const response = await fetch(`/api/conversations/manage/info`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const res = await response.json();
      
      if (res.code === 0) {
        messageApi.success(res.message || "修改群信息成功");
        // 更新本地群信息
        // setGroupInfo({
        //   name: values.name || groupInfo.name,
        //   avatar: values.avatar || groupInfo.avatar
        // });
        // 关闭模态框
        setIsGroupInfoModalVisible(false);
      } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.error("JWT token无效或过期，正在跳转回登录界面...").then(() => {router.push("/");})
      } else if (res.code === -3) {
        messageApi.error("非群主或管理员不能更新群信息");
      } else {
        messageApi.error(res.info || "修改群信息失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const dissolveOrLeaveGroup = async() => {
    if (!conversationId) {
      messageApi.error("请选择一个聊天");
      return;
    }

    const token = Cookies.get("jwtToken");

    try {
      const response = await fetch(`/api/conversations/member/remove`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
        body: JSON.stringify({
          conversation_id: conversationId
        }),
      });

      const res = await response.json();
      
      if (res.code === 0) {
        messageApi.success(res.message || "操作成功");
      } else {
        messageApi.error(res.info || "操作失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    }
  }

  const removeMember = async(memberId: number) => {
    if (!conversationId) {
      messageApi.error("请选择一个聊天");
      return;
    }

    if (!memberId) {
      messageApi.error("请选择一个用户");
      return;
    }

    const token = Cookies.get("jwtToken");

    try {
      const response = await fetch(`/api/conversations/member/remove`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          user: memberId
        }),
      });

      const res = await response.json();
      
      if (res.code === 0) {
        messageApi.success(res.message || "移除成功");
      } else {
        messageApi.error(res.info || "移除失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    }
  }

  // 过滤成员列表
  const filteredMembers = members.filter(member => 
    member.name.toLowerCase().includes(searchText.toLowerCase())
  );

  // 菜单项
  const menuItems = isGroup ? [
    { key: "聊天成员", icon: <TeamOutlined />, title: "聊天成员" },
    { key: "聊天管理", icon: <SettingOutlined />, title: "聊天管理" },
    { key: "群公告", icon: <NotificationOutlined />, title: "群公告" },
    { key: "群邀请", icon: <UserAddOutlined />, title: "群邀请", 
      badge: (userIdentity < 3) ? true : false // 只有群主和管理员才显示badge
    },
    { key: "聊天记录", icon: <HistoryOutlined />, title: "聊天记录" }
  ] : [
    { key: "联系人", icon: <UserOutlined />, title: "联系人" },
    { key: "聊天记录", icon: <HistoryOutlined />, title: "聊天记录" }
  ];

  // 渲染成员列表内容
  const renderMemberList = () => {
    return (
      <>
        {isGroup && (
          <div style={{ padding: "16px 24px", backgroundColor: "white" }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center"
            }}>
              <Text type="secondary">
                {members.length} 位成员
                {userIdentity === 1 && " · 你是群主"}
                {userIdentity === 2 && " · 你是管理员"}
              </Text>
              
              {/* 添加邀请按钮 */}
              <Button
                type="primary"
                icon={<UserAddOutlined />}
                size="small"
                onClick={handleOpenInviteModal}
                style={{ 
                  background: "#8A2BE2", 
                  borderColor: "#8A2BE2",
                  borderRadius: "16px",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 12px",
                  height: "28px"
                }}
              >
                邀请好友
              </Button>
            </div>
            
            <Input
              placeholder="搜索群成员"
              prefix={<SearchOutlined style={{ color: "#8A2BE2" }} />}
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ 
                marginTop: "16px",
                borderRadius: "20px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
              }}
            />
          </div>
        )}

        <div style={{ 
          height: isGroup ? "calc(100% - 120px)" : "100%",
          overflowY: "auto",
          padding: "0 16px",
          backgroundColor: "white"
        }}>
          {memberloading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
              <Spin />
            </div>
          ) : filteredMembers.length > 0 ? (
            <List
              itemLayout="horizontal"
              dataSource={filteredMembers}
              renderItem={(item) => (
                <List.Item
                  style={{
                    padding: "12px 8px",
                    borderRadius: "8px",
                    transition: "all 0.3s ease",
                    border: "none"
                  }}
                  onMouseEnter={(e) => {
                    if (item.id !== userId)
                      e.currentTarget.style.backgroundColor = "rgba(138, 43, 226, 0.05)";
                  }}
                  onMouseLeave={(e) => {
                    if (item.id !== userId)
                      e.currentTarget.style.backgroundColor = "transparent";
                  }}
                  actions={
                    isGroup && userIdentity === 1 && item.identity !== 1 ? [
                      <Dropdown
                        menu={{
                          items: [
                            {
                              key: item.identity === 2 ? 'removeAdmin' : 'setAdmin',
                              label: item.identity === 2 ? '解除管理员' : '设置为管理员',
                              onClick: () => item.identity === 2 ? removeAdmin(item.id) : setAdmin(item.id)
                            },
                            {
                              key: 'transferOwnership',
                              label: '转让群主',
                              onClick: () => {
                                setTargetMember(item);
                                setTransferModalVisible(true);
                              }
                            },
                            {
                              key: 'removeMember',
                              label: '移除成员',
                              onClick: () => {
                                removeMember(item.id);
                              }
                            }
                          ]
                        }}
                      >
                        <Button 
                          type="text" 
                          icon={<MoreOutlined />} 
                          loading={loadingAction === item.id}
                        />
                      </Dropdown>
                    ] : [
                      isGroup && userIdentity === 2 && item.identity === 3 ? [
                        <Dropdown
                        menu={{
                          items: [
                            {
                              key: 'removeMember',
                              label: '移除成员',
                              onClick: () => {
                                removeMember(item.id);
                              }
                            }
                          ]
                        }}
                      >
                        <Button 
                          type="text" 
                          icon={<MoreOutlined />} 
                          loading={loadingAction === item.id}
                        />
                      </Dropdown>
                      ] : []
                    ]
                  }
                >
                  <List.Item.Meta
                    avatar={<Avatar 
                              src={item.avatar} 
                              size={46} 
                              onClick={() => {if (item.id !== userId) fetchUserDetail(item.id); }}
                              style={{ cursor: item.id === userId ? "default" : "pointer" }}
                            />}
                    title={
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Text strong style={{ fontSize: "15px" }}>{item.name}</Text>
                        {isGroup && getIdentityTag(item.identity)}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <Empty 
              description={isGroup ? "未找到成员" : "无法获取联系人信息"}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ margin: "40px 0" }}
            />
          )}
        </div>
      </>
    );
  };

  // 渲染聊天管理内容
  const renderChatManagement = () => {
    return (
      <div style={{ padding: "16px 24px" }}>
        <div style={{ marginBottom: "24px" }}>
          <Title level={5} style={{ color: "#8A2BE2", marginBottom: "16px" }}>群聊设置</Title>
          <List
            itemLayout="horizontal"
            dataSource={[
              {
                key: 'groupInfo',
                title: '群聊信息',
                content: (
                  <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "12px" }}>
                    <Avatar src={groupInfo.avatar} size={40} />
                    <Text type="secondary" style={{ display: "block" }}>
                      {groupInfo.name || "当前群聊"}
                    </Text>
                  </div>
                ),
                clickable: userIdentity < 3,
                onClick: () => {
                  if (userIdentity < 3) {
                    groupInfoForm.setFieldsValue({
                      name: groupInfo.name,
                      avatar: groupInfo.avatar
                    });
                    setIsGroupInfoModalVisible(true);
                  }
                }
              },
              // 新增置顶设置
              {
                key: 'topSetting',
                title: '置顶聊天',
                content: (
                  <div style={{ marginTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Text type="secondary">
                      {topState ? "已置顶此会话" : "未置顶此会话"}
                    </Text>
                    <Switch 
                      checked={topState} 
                      onChange={(checked) => updateConversationSettings('ontop', checked)}
                      loading={settingLoading}
                      style={{ backgroundColor: topState ? '#8A2BE2' : undefined }}
                    />
                  </div>
                ),
                clickable: false
              },
              // 新增免打扰设置
              {
                key: 'notificationSetting',
                title: '消息通知',
                content: (
                  <div style={{ marginTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Text type="secondary">
                      {notificationState ? "未开启免打扰" : "已开启消息免打扰"}
                    </Text>
                    <Switch 
                      checked={!notificationState} 
                      onChange={(checked) => updateConversationSettings('notification', !checked)}
                      loading={settingLoading}
                      style={{ backgroundColor: !notificationState ? '#8A2BE2' : undefined }}
                    />
                  </div>
                ),
                clickable: false
              },
            ]}
            renderItem={item => (
              <List.Item
                style={{
                  padding: "16px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(138, 43, 226, 0.05)",
                  marginBottom: "12px",
                  cursor: item.clickable ? "pointer" : "default",
                  opacity: item.clickable ? 1 : 0.7,
                  border: "none" 
                }}
                onClick={item.onClick}
              >
                <div style={{ width: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Text strong>{item.title}</Text>
                    {item.clickable && <Text type="secondary">查看详情</Text>}
                  </div>
                  {item.content}
                </div>
              </List.Item>
            )}
          />
        </div>

        <div style={{ marginTop: "32px" }}>
          <Title level={5} style={{ color: "red", marginBottom: "16px" }}>其他操作</Title>
          <List
            itemLayout="horizontal"
            dataSource={[
              userIdentity === 1 ? (
              {
                key: 'dissolveGroup',
                title: '解散群聊',
                content: (
                  <Text type="secondary" style={{ marginTop: "8px", display: "block" }}>
                    群聊被解散后，所有聊天记录将被清除
                  </Text>
                ),
                onClick: () => setDissolveOrLeaveModalVisible(true)
              }) : ({
                key: 'leaveGroup',
                title: '退出群聊',
                content: (
                  <Text type="secondary" style={{ marginTop: "8px", display: "block" }}>
                    退出群聊后，将无法查看群聊中的消息
                  </Text>
                ),
                onClick: () => setDissolveOrLeaveModalVisible(true)
              })
            ]}
            renderItem={item => (
              <List.Item
                style={{
                  padding: "16px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(255, 0, 0, 0.05)",
                  // cursor: "pointer",
                  border: "none" // 移除边框，解决黑点问题
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Button 
                    type="primary"
                    danger
                    onClick={item.onClick}>{item.title}</Button>
                  <Text type="secondary" style={{ marginLeft: "16px" }}>
                    {item.content}
                  </Text>
                </div>
              </List.Item>
            )}
          />
        </div>
      </div>
    );
  };

  // 渲染群公告内容
  const renderNotifications = () => {
    return (
      <div style={{ padding: "16px 24px" }}>
        {userIdentity < 3 && (
          <Button 
            type="primary"
            style={{ 
              marginBottom: "24px", 
              background: "linear-gradient(135deg, #8A2BE2, #6A1B9A)",
              borderColor: "#6A1B9A",
              width: "100%",
              height: "42px",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(138, 43, 226, 0.2)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "8px",
              fontSize: "15px"
            }}
            icon={<EditOutlined />}
            onClick={() => setIsNotificationModalVisible(true)}
          >
            发布新公告
          </Button>
        )}
        
        {notificationLoading ? (
          <div style={{ 
            textAlign: "center", 
            padding: "60px 0", 
            background: "rgba(255, 255, 255, 0.7)", 
            borderRadius: "12px" 
          }}>
            <Spin size="large" />
            <div style={{ marginTop: "16px", color: "#8A2BE2" }}>加载群公告中...</div>
          </div>
        ) : notifications.length > 0 ? (
          <div style={{ marginBottom: "16px" }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px"
            }}>
              <Text type="secondary" style={{ fontSize: "13px" }}>
                共 {notifications.length} 条公告
              </Text>
              <Text type="secondary" style={{ fontSize: "13px" }}>
                最新公告排在最前
              </Text>
            </div>
            
            <List
              itemLayout="vertical"
              dataSource={notifications}
              renderItem={(item) => (
                <List.Item
                  style={{
                    padding: "20px",
                    borderRadius: "12px",
                    backgroundColor: "white",
                    marginBottom: "16px",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                    border: "1px solid rgba(138, 43, 226, 0.1)",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    position: "relative"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(138, 43, 226, 0.12)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.05)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div>
                    <div style={{ 
                      marginBottom: "16px", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "space-between"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <NotificationOutlined style={{ color: "#8A2BE2", fontSize: "18px" }} />
                        <Text strong style={{ fontSize: "17px" }}>
                          {item.sender_name}
                        </Text>
                      </div>
                      <Text type="secondary" style={{ fontSize: "14px" }}>
                        {new Date(item.timestamp).toLocaleString('zh-CN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </div>
                    <div style={{ 
                      whiteSpace: "pre-wrap", 
                      wordBreak: "break-word",
                      padding: "16px",
                      backgroundColor: "rgba(138, 43, 226, 0.03)",
                      borderRadius: "8px",
                      fontSize: "15px",
                      lineHeight: "1.6",
                      border: "1px solid rgba(138, 43, 226, 0.08)"
                    }}>
                      {item.content}
                    </div>

                    {userIdentity < 3 && (
                      <div style={{ 
                        marginTop: "16px", 
                        display: "flex", 
                        justifyContent: "flex-end" 
                      }}>
                        <Button 
                          danger
                          type="text" 
                          icon={<DeleteOutlined />}
                          loading={deletingNotificationId === item.notification_id}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(item.notification_id);
                          }}
                          style={{
                            borderRadius: "6px",
                            padding: "0 16px",
                            height: "32px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "13px",
                            opacity: 0.9,
                            transition: "all 0.2s"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = "1";
                            e.currentTarget.style.backgroundColor = "rgba(255, 0, 0, 0.08)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = "0.9";
                            e.currentTarget.style.backgroundColor = "transparent";
                          }}
                        >
                          删除
                        </Button>
                      </div>
                    )}
                  </div>
                </List.Item>
              )}
            />
          </div>
        ) : (
          <Empty 
            image={
              <div style={{ 
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                marginBottom: "20px" 
              }}>
                <NotificationOutlined style={{ 
                  fontSize: "48px", 
                  color: "rgba(138, 43, 226, 0.3)"
                }} />
              </div>
            }
            description={
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px"
              }}>
                <p style={{ fontSize: "16px", fontWeight: "500", color: "#333" }}>
                  暂无群公告
                </p>
                {userIdentity < 3 && (
                  <p style={{ 
                    fontSize: "14px", 
                    color: "#999",
                    maxWidth: "240px",
                    textAlign: "center",
                    lineHeight: "1.6"
                  }}>
                    您可以点击上方按钮发布新公告，让群成员了解最新动态
                  </p>
                )}
              </div>
            }
            style={{ 
              margin: "60px 0",
              padding: "20px",
              backgroundColor: "rgba(138, 43, 226, 0.02)",
              borderRadius: "12px"
            }}
          />
        )}
      </div>
    );
  };

  // 渲染群邀请内容
  const renderInvitations = () => {
    return (
      <div style={{ padding: "16px 24px" }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px"
        }}>
          <Title level={5} style={{ margin: 0, color: "#8A2BE2" }}>邀请列表</Title>
          <Button 
            type="text" 
            icon={<div style={{ transform: "rotate(90deg)" }}>↻</div>} 
            onClick={fetchInvitations}
            loading={invitationLoading}
          >
            刷新
          </Button>
        </div>
        
        {invitationLoading ? (
          <div style={{ 
            textAlign: "center", 
            padding: "60px 0", 
            background: "rgba(255, 255, 255, 0.7)", 
            borderRadius: "12px" 
          }}>
            <Spin size="large" />
            <div style={{ marginTop: "16px", color: "#8A2BE2" }}>加载邀请列表中...</div>
          </div>
        ) : invitations.length > 0 ? (
          <List
            itemLayout="vertical"
            dataSource={invitations}
            renderItem={(item) => (
              <List.Item
                style={{
                  padding: "16px",
                  borderRadius: "12px",
                  backgroundColor: item.status === 0 ? "white" : "rgba(245, 245, 245, 0.6)",
                  marginBottom: "16px",
                  boxShadow: item.status === 0 
                    ? "0 2px 12px rgba(0,0,0,0.05)"
                    : "none",
                  border: "1px solid",
                  borderColor: item.status === 0 
                    ? "rgba(138, 43, 226, 0.1)" 
                    : "rgba(0,0,0,0.06)",
                  position: "relative"
                }}
              >
                {/* 修改卡片布局结构，使其更灵活 */}
                <div>
                  {/* 用户信息和时间 */}
                  <div style={{ 
                    marginBottom: "12px", 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "flex-start" 
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <Avatar src={item.sender_avatar} size={42} />
                      <Text strong style={{ fontSize: "15px", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.sender_name}
                      </Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: "13px", flexShrink: 0 }}>
                      {new Date(item.timestamp).toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </div>
                  
                  {/* 邀请信息 */}
                  <div style={{ 
                    backgroundColor: "rgba(138, 43, 226, 0.03)",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    marginBottom: "12px",
                    border: "1px dashed rgba(138, 43, 226, 0.15)"
                  }}>
                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px"
                    }}>
                      <div style={{ fontSize: "14px", color: "#666" }}>
                        邀请成员加入群聊
                      </div>
                      <div style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "8px",
                        padding: "4px 12px 4px 4px",
                        backgroundColor: "white",
                        borderRadius: "20px",
                        width: "fit-content",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                        border: "1px solid rgba(138, 43, 226, 0.08)"
                      }}>
                        <Avatar src={item.receiver_avatar} size={24} />
                        <Text strong style={{
                          maxWidth: "120px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}>
                          {item.receiver_name}
                        </Text>
                      </div>
                    </div>
                  </div>

                  {/* 操作按钮或状态标签 */}
                  <div>
                    {userIdentity > 2 ? (
                      <div style={{ 
                          textAlign: "right"
                        }}>
                        <Tag color={
                          item.status === 0 ? "processing" : 
                          item.status === 1 ? "error" : // 已拒绝
                          item.status === 2 ? "success" : // 已同意
                          item.status === 3 ? "green" : 
                          "default" // 其他状态
                        }>
                          {
                            item.status === 0 ? "等待审核" : 
                            item.status === 1 ? "已拒绝" : 
                            item.status === 2 ? "已同意" : 
                            item.status === 3 ? "用户已在群中" :
                            "未知状态"
                          }
                        </Tag>
                      </div>
                      ) : (item.status === 0 ? (
                        <div style={{ 
                          display: "flex", 
                          justifyContent: "flex-end", 
                          gap: "12px",
                        }}>
                          <Button 
                            danger
                            size="middle"
                            onClick={() => handleInvitation(item.invite_id, false)}
                            loading={processingInviteId === item.invite_id}
                            disabled={processingInviteId !== undefined && processingInviteId !== item.invite_id}
                          >
                            拒绝
                          </Button>
                          <Button 
                            type="primary" 
                            size="middle"
                            style={{ 
                              background: "#8A2BE2", 
                              borderColor: "#8A2BE2" 
                            }}
                            onClick={() => handleInvitation(item.invite_id, true)}
                            loading={processingInviteId === item.invite_id}
                            disabled={processingInviteId !== undefined && processingInviteId !== item.invite_id}
                          >
                            同意
                          </Button>
                        </div>
                      ) : (
                        <div style={{ 
                          textAlign: "right"
                        }}>
                          <Tag color={
                            item.status === 1 ? "error" : // 已拒绝
                            item.status === 2 ? "success" : // 已同意
                            "default" // 其他状态
                          }>
                            {
                              item.status === 1 ? "已拒绝" : 
                              item.status === 2 ? "已同意" : 
                              item.status === 3 ? "用户已在群中" :
                              "未知状态"
                            }
                          </Tag>
                        </div>
                    ))}
                  </div>
                </div>
              </List.Item>
            )}
          />
        ) : (
          <Empty 
            image={
              <div style={{ 
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                marginBottom: "20px" 
              }}>
                <UserAddOutlined style={{ 
                  fontSize: "48px", 
                  color: "rgba(138, 43, 226, 0.3)"
                }} />
              </div>
            }
            description={
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px"
              }}>
                <p style={{ fontSize: "16px", fontWeight: "500", color: "#333" }}>
                  暂无邀请
                </p>
                <p style={{ 
                  fontSize: "14px", 
                  color: "#999",
                  maxWidth: "240px",
                  textAlign: "center",
                  lineHeight: "1.6"
                }}>
                  当前没有待处理的群聊邀请
                </p>
              </div>
            }
            style={{ 
              margin: "60px 0",
              padding: "20px",
              backgroundColor: "rgba(138, 43, 226, 0.02)",
              borderRadius: "12px"
            }}
          />
        )}
      </div>
    );
  };

  // 渲染聊天记录筛选界面
  const renderChatHistory = () => {
    const resetSearchForm = () => {
      messageSearchForm.resetFields();
      setFilteredMessages([]);
      setMessageLoading(false);
    }
    return (
      <div style={{ padding: "16px 24px" }}>
        {/* 添加返回按钮，只在私聊模式下显示 */}
        {!isGroup && (
          <Button
            icon={<div style={{ marginRight: '4px' }}>←</div>}
            onClick={() => {
              resetSearchForm();
              setActiveMenu("联系人");
            }}
            style={{
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '8px',
              background: 'rgba(138, 43, 226, 0.08)',
              color: '#8A2BE2',
              fontWeight: '500',
              border: '1px solid rgba(138, 43, 226, 0.2)',
              boxShadow: '0 2px 6px rgba(138, 43, 226, 0.1)',
              padding: '4px 16px',
              height: '36px'
            }}
          >
            返回私聊设置
          </Button>
        )}
        
        <div style={{ marginBottom: "20px" }}>
          <Title level={5} style={{ color: "#8A2BE2", marginBottom: "16px" }}>筛选聊天记录</Title>
          
          <Form
            form={messageSearchForm}
            layout="vertical"
            onFinish={searchMessages}
            style={{ 
              backgroundColor: "rgba(138, 43, 226, 0.05)",
              padding: "16px",
              borderRadius: "8px"
            }}
          >
            <Form.Item name="timeRange" label="时间范围">
              <RangePicker 
                showTime 
                style={{ width: '100%' }} 
                placeholder={['开始时间', '结束时间']}
              />
            </Form.Item>
            
            {isGroup && (
            <Form.Item name="sender_id" label="发送者">
              <Select 
                allowClear
                placeholder="选择发送者"
                style={{ width: '100%' }}
                options={members.map(member => ({
                  label: (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Avatar src={member.avatar} size="small" />
                      <span>{member.name}</span>
                    </div>
                  ),
                  value: member.id,
                }))}
              />
            </Form.Item>)}

            {!isGroup && (
            <Form.Item name="sender_id" label="发送者">
              <Select 
                allowClear
                placeholder="选择发送者"
                style={{ width: '100%' }}
                options={[
                  ...members.map(member => ({
                    label: (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Avatar src={member.avatar} size="small" />
                        <span>{member.name}</span>
                      </div>
                    ),
                    value: member.id,
                  })),
                  {
                    label: (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Avatar src={userInfo.avatar} size="small" />
                        <span>{userInfo.name}</span>
                      </div>
                    ),
                    value: userInfo.id,
                  }
                ]}
              />
            </Form.Item>)}
            
            <Form.Item name="content" label="消息关键词">
              <Input placeholder="请输入要搜索的关键词" />
            </Form.Item>
            
            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={messageLoading}
                icon={<FilterOutlined />}
                style={{ 
                  background: "#8A2BE2", 
                  borderColor: "#8A2BE2",
                  width: "100%"
                }}
              >
                筛选消息
              </Button>
            </Form.Item>
          </Form>
        </div>
        
        {filteredMessages.length > 0 && (
          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <Button 
              type="primary"
              icon={<SearchOutlined />}
              onClick={() => setMessageSearchModalVisible(true)}
              style={{ 
                background: "#8A2BE2", 
                borderColor: "#8A2BE2",
                borderRadius: "8px",
                height: "40px",
                padding: "0 24px"
              }}
            >
              查看筛选结果 ({filteredMessages.length}条记录)
            </Button>
          </div>
        )}
      </div>
    );
  };

  // 增强非群聊会话的设置项
  const renderPrivateChatSettings = () => {
    return (
      <div style={{ padding: "16px 24px" }}>
        <Title level={5} style={{ margin: 0, marginBottom: "16px", color: "#8A2BE2" }}>私聊设置</Title>
        
        <List
          itemLayout="vertical"
          dataSource={[
            {
              key: 'contactInfo',
              title: '联系人',
              content: (
                <div style={{ marginTop: "8px" }}>
                  {members.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", backgroundColor: "rgba(138, 43, 226, 0.05)", borderRadius: "8px" }}>
                      <Avatar src={members[0].avatar} size={46} />
                      <div>
                        <Text strong style={{ fontSize: "15px", display: "block", marginBottom: "4px" }}>
                          {members[0].name}
                        </Text>
                      </div>
                    </div>
                  )}
                </div>
              ),
              clickable: false
            },
            // 置顶设置
            {
              key: 'topSetting',
              title: '置顶聊天',
              content: (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                  <Text type="secondary">
                    {topState ? "已置顶此会话" : "未置顶此会话"}
                  </Text>
                  <Switch 
                    checked={topState} 
                    onChange={(checked) => updateConversationSettings('ontop', checked)}
                    loading={settingLoading}
                    style={{ backgroundColor: topState ? '#8A2BE2' : undefined }}
                  />
                </div>
              ),
              clickable: false
            },
            // 免打扰设置
            {
              key: 'notificationSetting',
              title: '消息通知',
              content: (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                  <Text type="secondary">
                    {notificationState ? "未开启免打扰" : "已开启消息免打扰"}
                  </Text>
                  <Switch 
                    checked={!notificationState} 
                    onChange={(checked) => updateConversationSettings('notification', !checked)}
                    loading={settingLoading}
                    style={{ backgroundColor: !notificationState ? '#8A2BE2' : undefined }}
                  />
                </div>
              ),
              clickable: false
            }
          ]}
          renderItem={item => (
            <List.Item
              style={{
                padding: "16px",
                borderRadius: "8px",
                backgroundColor: "white",
                marginBottom: "12px",
                cursor: item.clickable ? "pointer" : "default",
                border: "1px solid rgba(138, 43, 226, 0.1)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
              }}
            >
              <List.Item.Meta
                title={<Text strong>{item.title}</Text>}
                description={item.content}
              />
            </List.Item>
          )}
        />
        {/* 添加聊天记录管理按钮 */}
        <Button
          type="primary"
          icon={<HistoryOutlined />}
          onClick={() => setActiveMenu("聊天记录")}
          style={{
            marginTop: "20px",
            width: "100%", 
            height: "42px",
            background: "linear-gradient(135deg, #8A2BE2, #6A1B9A)",
            borderColor: "#6A1B9A",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(138, 43, 226, 0.1)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px",
            fontSize: "15px"
          }}
        >
          查看聊天记录
        </Button>
      </div>
    );
  };

  // 更新渲染内容函数
  const renderContent = () => {
    if (isGroup) {
      switch (activeMenu) {
        case "聊天成员":
          return renderMemberList();
        case "聊天管理":
          return renderChatManagement();
        case "群公告":
          return renderNotifications();
        case "群邀请":
          return renderInvitations();
        case "聊天记录":
          return renderChatHistory();
        default:
          return renderMemberList();
      }
    } else {
      if (activeMenu === "聊天记录") {
        return renderChatHistory();
      } else {
        return renderPrivateChatSettings();
      }
    }
  };

  return (
    <>
      {contextHolder}
      <Drawer
        title={isGroup ? "群聊管理" : "聊天管理"}
        placement="right"
        onClose={onClose}
        open={visible}
        width={isGroup ? 500 : 320}
        styles={{
          body: {
            padding: 0,
            backgroundColor: "#f8f8fc"
          },
          header: {
            background: "linear-gradient(135deg, #8A2BE2, #6A1B9A)",
            color: "white",
            borderBottom: "none"
          }
        }}
        closeIcon={<div style={{ color: "white", fontSize: "16px" }}>✕</div>}
      >
        {isGroup ? (
          <div style={{ display: "flex", height: "100%" }}>
            {/* 左侧菜单 */}
            <div
              style={{
                width: "140px",
                borderRight: "1px solid rgba(138, 43, 226, 0.1)",
                padding: "24px 0",
                background: "rgba(255, 255, 255, 0.7)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ padding: "0 16px 16px", marginBottom: "8px" }}>
                <Title level={5} style={{ margin: 0, color: "#8A2BE2", fontSize: "16px" }}>群聊信息</Title>
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
                    justifyContent: "space-between",
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
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span style={{ 
                      marginRight: "12px", 
                      fontSize: "16px",
                      color: activeMenu === item.key ? "#8A2BE2" : "#777",
                    }}>
                      {item.icon}
                    </span>
                    {item.title}
                  </div>
                  
                  {/* 如果是群邀请菜单项，并且是群主或管理员，显示提示徽章 */}
                  {item.key === "群邀请" && item.badge && userIdentity < 3 && (
                    <div style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "#ff4d4f",
                      display: invitations.some(inv => inv.status === 0) ? "block" : "none"
                    }} />
                  )}
                </div>
              ))}
            </div>

            {/* 右侧内容 */}
            <div
              style={{
                flex: 1,
                background: "#fff",
                overflowY: "auto",
                height: "100%"
              }}
            >
              <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(138, 43, 226, 0.1)" }}>
                <Title level={5} style={{ margin: 0, color: "#8A2BE2" }}>{activeMenu}</Title>
              </div>
              
              {renderContent()}
            </div>
          </div>
        ) : (
          <div style={{ height: "100%", backgroundColor: "white" }}>
            {renderContent()}
          </div>
        )}
      </Drawer>

      {/* 群信息修改模态框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', color: '#8A2BE2' }}>
            <EditOutlined style={{ marginRight: '8px' }} />
            <span>修改群信息</span>
          </div>
        }
        open={isGroupInfoModalVisible}
        onCancel={() => {
          setIsGroupInfoModalVisible(false);
          groupInfoForm.resetFields();
        }}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => {
              setIsGroupInfoModalVisible(false);
              groupInfoForm.resetFields();
            }}
          >
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={isSubmitting}
            onClick={() => groupInfoForm.submit()}
            style={{ background: '#8A2BE2', borderColor: '#8A2BE2' }}
          >
            保存
          </Button>,
        ]}
        styles={{
          mask: { backdropFilter: 'blur(2px)', background: 'rgba(0,0,0,0.4)' },
          header: { borderBottom: '1px solid rgba(138, 43, 226, 0.1)' },
          footer: { borderTop: '1px solid rgba(138, 43, 226, 0.1)' }
        }}
      >
        <Form
          form={groupInfoForm}
          layout="vertical"
          onFinish={updateGroupInfo}
          initialValues={{
            name: groupInfo.name,
            avatar: groupInfo.avatar
          }}
        >
          <Form.Item 
            label="群头像" 
            name="avatar"
          >
            <Upload
              name="avatar"
              listType="picture-card"
              className="avatar-uploader"
              showUploadList={false}
              beforeUpload={beforeUpload}
            >
              {groupInfoForm.getFieldValue('avatar') ? (
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  <img 
                    src={groupInfoForm.getFieldValue('avatar')} 
                    alt="avatar" 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover', 
                      borderRadius: '4px' 
                    }} 
                  />
                  <div style={{ 
                    position: 'absolute', 
                    bottom: 0, 
                    left: 0,
                    right: 0,
                    background: 'rgba(0,0,0,0.6)',
                    padding: '4px',
                    color: 'white',
                    fontSize: '12px',
                    textAlign: 'center'
                  }}>
                    点击更换
                  </div>
                </div>
              ) : (
                <div style={{ 
                  padding: '10px', 
                  textAlign: 'center', 
                  color: '#8A2BE2',
                }}>
                  {uploading ? (
                    <div>
                      <Spin size="small" style={{ marginBottom: '8px' }} />
                      <div>上传中...</div>
                    </div>
                  ) : (
                    <div>
                      <UploadOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
                      <div>点击上传</div>
                      <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                        仅支持 JPG 格式，小于 2MB
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Upload>
          </Form.Item>
          
          <Form.Item 
            label="群名称" 
            name="name"
            rules={[
              {
                required: true,
                message: '请输入群名称',
              },
            ]}
          >
            <Input placeholder="请输入群名称" maxLength={20} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 群公告发布模态框 */}
      <Modal
        title={
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            color: '#8A2BE2',
            fontSize: '18px',
            fontWeight: '500'
          }}>
            <NotificationOutlined style={{ marginRight: '12px', fontSize: '20px' }} />
            <span>发布群公告</span>
          </div>
        }
        open={isNotificationModalVisible}
        onCancel={() => {
          setIsNotificationModalVisible(false);
          setNotificationContent('');
        }}
        footer={[]}
        styles={{
          mask: { backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.45)' },
          header: { 
            borderBottom: '1px solid rgba(138, 43, 226, 0.1)',
            padding: '16px 24px'
          },
          content: {
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
          },
          body: {
            padding: '24px'
          }
        }}
      >
        <div style={{ 
          margin: "0",
          display: "flex",
          flexDirection: "column",
          gap: "20px"
        }}>
          <div>
            <div style={{ 
              marginBottom: "12px", 
              display: "flex", 
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <Text style={{ fontSize: "15px", fontWeight: "500" }}>公告内容</Text>
              <Text type="secondary" style={{ fontSize: "13px" }}>
                所有群成员都将看到该公告
              </Text>
            </div>
            
            <div style={{ 
              backgroundColor: "rgba(138, 43, 226, 0.03)",
              border: "1px solid rgba(138, 43, 226, 0.1)",
              borderRadius: "8px",
              padding: "2px"
            }}>
              <Input.TextArea 
                placeholder="请输入群公告内容..." 
                value={notificationContent}
                onChange={(e) => setNotificationContent(e.target.value)}
                autoSize={{ minRows: 6, maxRows: 10 }}
                showCount
                maxLength={500}
                style={{ 
                  padding: "12px", 
                  fontSize: "15px",
                  border: "none",
                  backgroundColor: "transparent",
                  boxShadow: "none"
                }}
              />
            </div>
          </div>

          <div style={{ 
            display: "flex", 
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "8px"
          }}>
            <Button 
              onClick={() => {
                setIsNotificationModalVisible(false);
                setNotificationContent('');
              }}
              style={{ 
                padding: "0 16px",
                height: "40px"
              }}
            >
              取消
            </Button>

            <Button 
              type="primary" 
              loading={isPostingNotification}
              onClick={postNotification}
              disabled={!notificationContent.trim()}
              style={{ 
                background: !notificationContent.trim() 
                  ? "#d9d9d9" 
                  : "linear-gradient(135deg, #8A2BE2, #6A1B9A)",
                borderColor: !notificationContent.trim() ? "#d9d9d9" : "#6A1B9A",
                height: "40px",
                padding: "0 24px",
                borderRadius: "6px",
                boxShadow: !notificationContent.trim() 
                  ? "none" 
                  : "0 4px 12px rgba(138, 43, 226, 0.2)",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <NotificationOutlined />
              发布公告
            </Button>
          </div>
        </div>
      </Modal>

      {/* 转让群主确认对话框 */}
      <Modal
        title="转让群主"
        open={transferModalVisible}
        onCancel={() => {setTransferModalVisible(false); setTargetMember(undefined);}}
        footer={[
          <Button 
            key="submit" 
            type="primary" 
            danger
            loading={transferLoading}
            onClick={transferOwnership}
          >
            确认转让
          </Button>,
        ]}
      >
        <div style={{ padding: "20px 0" }}>
          {targetMember && (
            <>
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <Avatar src={targetMember.avatar} size={64} />
                <Typography.Title level={5} style={{ marginTop: "10px", marginBottom: "10px" }}>
                  {targetMember.name}
                </Typography.Title>
              </div>
              <Text type="secondary" style={{ textAlign: "center", display: "block" }}>
                确认将群主转让给该成员？
              </Text>
            </>
          )}
        </div>
      </Modal>

      {/* 邀请好友模态框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', color: '#8A2BE2' }}>
            <UserAddOutlined style={{ marginRight: '8px' }} />
            <span>邀请好友加入群聊</span>
          </div>
        }
        open={isInviteModalVisible}
        onCancel={() => {
          setIsInviteModalVisible(false);
          setSelectedFriend(undefined);
        }}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => {
              setIsInviteModalVisible(false);
              setSelectedFriend(undefined);
            }}
          >
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={inviteLoading}
            onClick={inviteFriends}
            disabled={selectedFriend === undefined}
            style={{ 
              background: selectedFriend === undefined ? '#d9d9d9' : '#8A2BE2', 
              borderColor: selectedFriend === undefined ? '#d9d9d9' : '#8A2BE2' 
            }}
          >
            发送邀请
          </Button>,
        ]}
        styles={{
          mask: { backdropFilter: 'blur(2px)', background: 'rgba(0,0,0,0.4)' },
          header: { borderBottom: '1px solid rgba(138, 43, 226, 0.1)' },
          footer: { borderTop: '1px solid rgba(138, 43, 226, 0.1)' }
        }}
      >
        <div style={{ marginBottom: "16px" }}>
          <Input
            placeholder="搜索好友"
            prefix={<SearchOutlined style={{ color: "#8A2BE2" }} />}
            allowClear
            value={searchFriendText}
            onChange={(e) => setSearchFriendText(e.target.value)}
            style={{ 
              borderRadius: "8px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
            }}
          />
        </div>
        <div style={{ 
          height: "300px", 
          overflowY: "auto", 
          borderRadius: "8px", 
          border: "1px solid #f0f0f0",
          padding: "4px" 
        }}>
          {friendsLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
              <Spin />
            </div>
          ) : friends.length > 0 ? (
            <List
              itemLayout="horizontal"
              dataSource={friends.filter(friend => 
                friend.name.toLowerCase().includes(searchFriendText.toLowerCase()) ||
                friend.email.toLowerCase().includes(searchFriendText.toLowerCase())
              )}
              renderItem={(item) => (
                <List.Item
                  style={{
                    padding: "10px 8px",
                    cursor: "pointer",
                    borderRadius: "8px",
                    transition: "all 0.2s ease",
                    backgroundColor: selectedFriend === item.id 
                      ? "rgba(138, 43, 226, 0.1)" 
                      : "transparent",
                    border: "1px solid",
                    borderColor: selectedFriend === item.id 
                      ? "rgba(138, 43, 226, 0.3)" 
                      : "transparent",
                    marginBottom: "6px"
                  }}
                  onClick={() => {
                    setSelectedFriend(selectedFriend === item.id ? undefined : item.id);
                  }}
                >
                  <List.Item.Meta
                    avatar={
                      <div style={{ position: "relative" }}>
                        <Avatar src={item.avatar} size={40} />
                        {selectedFriend === item.id && (
                          <div
                            style={{
                              position: "absolute",
                              bottom: -2,
                              right: -2,
                              width: "16px",
                              height: "16px",
                              borderRadius: "50%",
                              backgroundColor: "#52c41a",
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              color: "white",
                              fontSize: "12px",
                              border: "2px solid white",
                            }}
                          >
                            <CheckCircleOutlined style={{ fontSize: '10px' }} />
                          </div>
                        )}
                      </div>
                    }
                    title={<Text strong>{item.name}</Text>}
                    description={<Text type="secondary" style={{ fontSize: "12px" }}>{item.email}</Text>}
                  />
                  <div>
                    <Radio 
                      checked={selectedFriend === item.id}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFriend(item.id);
                        } else {
                          setSelectedFriend(undefined);
                        }
                      }}
                    />
                  </div>
                </List.Item>
              )}
            />
          ) : (
            <Empty 
              description={searchFriendText ? "未找到匹配的好友" : "没有可邀请的好友"}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ margin: "40px 0" }}
            />
          )}
        </div>
      </Modal>

      {/* 退出或者解散群聊模态框 */}
      <Modal
        title={
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            color: 'red',
            fontSize: '18px',
            fontWeight: '500'
          }}>
            <WarningOutlined style={{ marginRight: '12px', fontSize: '20px' }} />
            {userIdentity === 1 ? (
              <span>解散群聊</span>
            ) : (
              <span>退出群聊</span>
            )}
          </div>
        }
        open={dissolveOrLeaveModalVisible}
        onCancel={() => {
          setDissolveOrLeaveModalVisible(false);
        }}
        footer={[]}
        styles={{
          mask: { backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.45)' },
          header: { 
            borderBottom: '1px solid rgba(138, 43, 226, 0.1)',
            padding: '16px 24px'
          },
          body: {
            padding: '24px'
          }
        }}
        style={{ marginTop: '50px' }}
      >
        <div style={{ 
          margin: "0",
          display: "flex",
          flexDirection: "column",
          gap: "20px"
        }}>
          <div>
            <div style={{ 
              marginBottom: "12px", 
              display: "flex", 
              justifyContent: "center",
              alignItems: "center"
            }}>
              {userIdentity === 1 ? (
                <Text style={{ fontSize: "15px", fontWeight: "500", color: "red" }}>
                  该操作不可逆，请确认是否解散群聊
                </Text>
              ) : (
                <Text style={{ fontSize: "15px", fontWeight: "500", color: "red" }}>
                  该操作不可逆，请确认是否退出群聊
                </Text>
              )}
            </div>
          </div>

          <div style={{ 
            display: "flex", 
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "8px"
          }}>
            <Button 
              onClick={() => {
                setDissolveOrLeaveModalVisible(false);
              }}
              style={{ 
                padding: "0 16px",
                height: "40px"
              }}
            >
              取消
            </Button>

            <Button 
              type="primary" 
              onClick={dissolveOrLeaveGroup}
              style={{ 
                background: "red",
                height: "40px",
                padding: "0 24px",
                borderRadius: "6px",
                boxShadow: !notificationContent.trim() 
                  ? "none" 
                  : "0 4px 12px rgba(138, 43, 226, 0.2)",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <WarningOutlined />
              确认
            </Button>
          </div>
        </div>
      </Modal>

      {/* 聊天记录查询结果模态窗口 */}
      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <HistoryOutlined style={{ marginRight: '10px', color: '#8A2BE2' }} />
              <span>聊天记录查询结果</span>
            </div>
              <Text type="secondary" style={{ marginLeft: '20px' }}>共 {filteredMessages.length} 条记录</Text>
          </div>
        }
        open={messageSearchModalVisible}
        onCancel={() => setMessageSearchModalVisible(false)}
        footer={[
          <Button 
            key="back" 
            onClick={() => setMessageSearchModalVisible(false)}
          >
            关闭
          </Button>,
          <Button
            key="delete"
            type="primary"
            danger
            disabled={selectedMessages.length === 0}
            loading={deletingMessages}
            onClick={deleteMessages}
            icon={<DeleteOutlined />}
          >
            删除选中消息({selectedMessages.length})
          </Button>,
        ]}
        width={800}
        styles={{
          mask: { backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.45)' },
          body: { maxHeight: '600px', overflow: 'auto' }
        }}
      >
        {messageLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Spin size="large" />
            <div style={{ marginTop: "16px" }}>加载中...</div>
          </div>
        ) : filteredMessages.length > 0 ? (
          <Table 
            dataSource={filteredMessages} 
            rowKey="id"
            rowSelection={{
              type: 'checkbox',
              selectedRowKeys: selectedMessages,
              onChange: (selectedRowKeys) => {
                setSelectedMessages(selectedRowKeys as number[]);
              }
            }}
            columns={[
              {
                title: '发送者',
                dataIndex: 'sender_name',
                key: 'sender_name',
                width: 120,
                render: (text: string, record: Message) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Avatar src={record.sender_avatar} size="small" />
                    <span>{text}</span>
                  </div>
                ),
              },
              {
                title: '消息内容',
                dataIndex: 'content',
                key: 'content',
                render: (text: string, record: Message) => (
                  <div>
                    {record.type === 0 ? (
                      <div style={{wordBreak: 'break-word'}}>
                        {text.split('\n').map((line, index) => (
                          <span key={index}>
                            {line}
                            <br />
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div>
                        <Tag color="blue">图片</Tag>
                        <a href={text} target="_blank" rel="noopener noreferrer">查看图片</a>
                      </div>
                    )}
                  </div>
                ),
              },
              {
                title: '发送时间',
                dataIndex: 'timestamp',
                key: 'timestamp',
                width: 180,
                render: (text: string) => (
                  <span>
                    {new Date(text).toLocaleString('zh-CN', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </span>
                ),
              },
            ]}
            style={{ 
              backgroundColor: "white",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)"
            }}
          />
        ) : (
          <Empty 
            description="未找到匹配的消息记录" 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ 
              margin: "32px 0",
              padding: "32px",
              backgroundColor: "white",
              borderRadius: "8px" 
            }}
          />
        )}
      </Modal>

      {/* 用户详情模态框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', color: '#8A2BE2' }}>
            <UserOutlined style={{ marginRight: '8px' }} />
            <span>用户详情</span>
          </div>
        }
        open={userDetailModalVisible}
        onCancel={() => {
          setUserDetailModalVisible(false);
          setUserDetail(undefined);
          setAddFriendMessageText('');
        }}
        footer={[]}
        styles={{
          mask: { backdropFilter: 'blur(3px)', background: 'rgba(0,0,0,0.45)' },
          header: { borderBottom: '1px solid rgba(138, 43, 226, 0.1)' },
          body: { padding: '20px' }
        }}
        width={420}
        centered
      >
        {loadingUserDetail ? (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: '16px' }}>加载用户信息中...</div>
          </div>
        ) : userDetail ? (
          <div>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              marginBottom: '20px',
              padding: '20px',
              backgroundColor: 'rgba(138, 43, 226, 0.05)',
              borderRadius: '12px'
            }}>
              <Avatar 
                src={userDetail.avatar} 
                size={80}
                style={{
                  border: userDetail.is_deleted 
                    ? "3px solid rgba(255, 77, 79, 0.5)"
                    : "3px solid rgba(138, 43, 226, 0.5)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                }}
              />
              <Title level={4} style={{ margin: '12px 0 4px', color: userDetail.is_deleted ? '#ff4d4f' : '#333' }}>
                {userDetail.name}
              </Title>
              
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <MailOutlined style={{ fontSize: '14px', marginRight: '6px', color: '#8A2BE2' }} />
                <Text type="secondary">{userDetail.email}</Text>
              </div>

              <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                {userDetail.is_deleted && (
                  <Tag color="error">已注销</Tag>
                )}
                {userDetail.is_friend && (
                  <Tag color="success" icon={<CheckCircleOutlined />}>已是好友</Tag>
                )}
                {userDetail.email === Cookies.get("userEmail") && (
                  <Tag color="blue">自己</Tag>
                )}
              </div>
            </div>

            {!userDetail.is_deleted && 
            !userDetail.is_friend && 
            userDetail.email !== Cookies.get("userEmail") && (
              <div style={{ marginTop: '20px' }}>
                <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong>发送好友请求</Text>
                  <Text type="secondary" style={{ fontSize: '13px' }}>添加为好友</Text>
                </div>
                
                <Input.TextArea
                  placeholder="请输入好友申请的附言..."
                  value={addFriendMessageText}
                  onChange={(e) => setAddFriendMessageText(e.target.value)}
                  autoSize={{ minRows: 3, maxRows: 5 }}
                  showCount
                  maxLength={100}
                  style={{ 
                    borderRadius: '8px',
                    marginBottom: '16px',
                    border: addFriendMessageText.trim() ? '1px solid rgba(138, 43, 226, 0.3)' : '1px solid #d9d9d9'
                  }}
                />
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                  <Button
                    type="primary"
                    disabled={!addFriendMessageText.trim()}
                    loading={sendingFriendRequest}
                    onClick={() => sendFriendRequest(Number(userDetail.id))}
                    icon={<UserAddOutlined />}
                    style={{ 
                      backgroundColor: addFriendMessageText.trim() ? "#8A2BE2" : undefined, 
                      borderColor: addFriendMessageText.trim() ? "#8A2BE2" : undefined
                    }}
                  >
                    发送好友请求
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Empty description="用户信息加载失败" />
        )}
      </Modal>
    </>
  );
};

export default ChatInfoDrawer;