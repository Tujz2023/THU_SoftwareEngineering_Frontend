import React, { useCallback, useState, useEffect, useRef, useActionState } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import { Input, Button, Layout, List, Avatar, Typography, message, Badge, Empty, Tooltip, Spin, Divider, Tag, Popover, Modal } from "antd";
import { MessageOutlined, TeamOutlined, SettingOutlined, PictureOutlined, SmileOutlined, MoreOutlined, ContactsOutlined, SendOutlined, SearchOutlined, ClockCircleOutlined, PlusCircleOutlined, CloseOutlined, CheckCircleOutlined, PushpinOutlined, BellOutlined, RobotOutlined} from "@ant-design/icons";
import 'antd/dist/reset.css';
import SettingsDrawer from "../components/SettingsDrawer";
import FriendsListDrawer from "../components/FriendsListDrawer";
import GroupManagementDrawer from "../components/GroupManagementDrawer";
import CreateCovModal from "../components/CreateCovModal";
import { FriendRequest } from "../utils/types";
import ChatInfoDrawer from "../components/ChatInfoDrawer";
import { useMessageListener } from "../utils/websocket";
import { emojis } from "../utils/emojis"; 
import QwenChatPage from "./qwen_chat";

const { Header, Sider, Content } = Layout;
const { Text, Title } = Typography;
const { TextArea } = Input;

interface Conversation {
  id: number;
  name: string;
  avatar: string;
  last_message: string;
  last_message_type: number;
  last_message_time: string;
  is_chat_group: boolean;
  is_top: boolean;
  notice_able: boolean;
  unread_count: number;
  friend_id?: number;
}

interface Message {
  id: number;
  type: number;
  content: string;
  sender: string;
  senderid: number;
  sendername: string;
  senderavatar: string;
  reply_to?: string;
  reply_to_type?: number;
  reply_to_id?: number;
  conversation: string;
  created_time: string;
  already_read?: boolean;
}

interface MessageReply {
  reply_id: number;
  reply_type: number;
  sender_id: number;
  sender_name: string;
  sender_avatar: string;
  content: string;
  time: string;
}

interface ReadUser {
  avatar: string;
  name: string;
}
const ChatPage = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [search, setSearch] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState<number>(0);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [isFriendsDrawerVisible, setIsFriendsDrawerVisible] = useState(false);
  const [isGroupDrawerVisible, setIsGroupDrawerVisible] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(undefined);
  const router = useRouter();
  const [showAlert, setShowAlert] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [unhandleRequests, setUnhandleRequests] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState(false);
  const [isChatInfoVisible, setIsChatInfoVisible] = useState(false);
  const [isCreateCovModalVisible, setIsCreateCovModalVisible] = useState(false);  // 添加创建群聊模态框的状态

  const [friendListDrwaerWebsocket, setFriendListDrwaerWebsocket] = useState(false);
  const [groupDrawerWebsocket, setGroupDrawerWebsocket] = useState(false);
  const [createConvWebsocket, setCreateConvWebsocket] = useState(false);

  const [chatWebsocket, setChatWebsocket] = useState(false);
  const [messageWebsocket, setMessageWebsocket] = useState(false);
  const [messageWebsocket2, setMessageWebsocket2] = useState(false);
  // 添加回复相关状态及功能
  const [replyToMessage, setReplyToMessage] = useState<Message | undefined>(undefined);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | undefined>(undefined);
  const [rightClickedMessage, setRightClickedMessage] = useState<Message | undefined>(undefined);

  // 添加标记初次加载的状态
  const [isFirstLoad, setIsFirstLoad] = useState<boolean>(true);

    // 在Chat组件中添加新的状态来跟踪高亮的消息
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | undefined>(undefined);

  // 为每个消息添加ref，以便能够滚动到指定消息
  const messageRefs = useRef<{ [key: number]: HTMLDivElement }>({} as { [key: number]: HTMLDivElement });
  
  // 添加回复列表相关状态
  const [showReplyList, setShowReplyList] = useState(false);
  // const [replyListMessageId, setReplyListMessageId] = useState<number | undefined>(undefined);
  const [replyListLoading, setReplyListLoading] = useState(false);
  const [replyList, setReplyList] = useState<MessageReply[]>([]);

  // 已读列表相关状态
  const [showReadList, setShowReadList] = useState(false);
  const [readListLoading, setReadListLoading] = useState(false);
  const [readList, setReadList] = useState<ReadUser[]>([]);

  // websocket相关
  const [chatInfoWebsocket, setChatInfoWebsocket] = useState<number>(0);

  //表情相关状态
  const [emojiVisible, setEmojiVisible] = useState(false);

  // 添加 qwen 聊天窗口相关状态
  const [isqwenVisible, setIsqwenVisible] = useState(false);
  const [qwenKey, setqwenKey] = useState(0);
  // 打开/关闭 qwen 聊天窗口
  const toggleqwenModal = () => {
    if (isqwenVisible) {
      // 如果是关闭模态框，则在下次打开时更新 key 值
      setIsqwenVisible(false);
      setqwenKey(prevKey => prevKey + 1);
    } else {
      setIsqwenVisible(true);
    }
  };
  
  // 添加滚动到指定消息的函数
  const scrollToMessage = (messageId: number) => {
    if (messageRefs.current[messageId]) {
      messageRefs.current[messageId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
      
      // 设置高亮，然后在一段时间后取消高亮
      setHighlightedMessageId(messageId);
      setTimeout(() => {
        setHighlightedMessageId(undefined);
      }, 2000); // 2秒后取消高亮
    }
  };

  // 处理点击回复预览
  const handleReplyPreviewClick = () => {
    if (replyToMessage?.id) {
      scrollToMessage(replyToMessage.id);
    }
  };

  //取消回复函数
  const cancelReply = () => {
    setReplyToMessage(undefined);
  }

  //处理消息右键点击
  const handleMessageRightClick = (event: React.MouseEvent, message: Message) => {
    event.preventDefault(); // 阻止默认右键菜单
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
    setRightClickedMessage(message);
  }

  //处理菜单项点击
  const handleMenuClick = (action: string) => {
    if (action === "reply") {
      setReplyToMessage(rightClickedMessage);
    }
    else if(action === "viewOriginal" && rightClickedMessage?.reply_to_id) {
    // 跳转到原始消息
      scrollToMessage(rightClickedMessage.reply_to_id);
    }
    else if (action === "viewReplies" && rightClickedMessage?.id) {
      fetchReplyList(rightClickedMessage.id);
    }
    else if (action === "viewReadList" && rightClickedMessage?.id) {
      fetchReadList(rightClickedMessage.id);
    }
    setContextMenuPosition(undefined); // 关闭菜单
  }

  // 处理点击文档关闭上下文菜单
  useEffect(() => {
    const handleClickOutside = () => setContextMenuPosition(undefined);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const messagesContainerRef = useRef<HTMLDivElement>({
    scrollIntoView: () => {}, // 添加一个空的 scrollIntoView 方法
  } as unknown as HTMLDivElement);

  // 滚动到消息底部的函数
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // 从 Cookie 中获取 JWT Token
  const token = Cookies.get("jwtToken");

  const fetchUserInfo = () => {
    fetch("/api/account/info", {
      method: "GET",
      headers: {
        Authorization: `${token}`,
      },
    })
      .then((res) => res.json())
      .then((res) => {
        if (Number(res.code) === 0) {
          setUserInfo(res);
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
          messageApi.open({
            type: "error",
            content: res.info || "获取用户信息失败",
          });
        }
      })
      .catch((err) => {
        messageApi.open({
          type: "error",
          content: `网络错误，请稍后重试: ${err}`,
        });
      });
  };

  const fetchFriendRequests = async () => {
    const token = Cookies.get("jwtToken");

    try {
      const response = await fetch("/api/friend_requests", {
        method: "GET",
        headers: {
          Authorization: `${token}`,
        },
      });

      const res = await response.json();

      if (res.code === 0) {
        const requests = res.requests;
        setFriendRequests(res.requests);
        const unhandledCount = requests.filter((request: FriendRequest) => request.status === 0).length;
        setUnhandleRequests(unhandledCount);
      } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.open({
          type: "error",
          content: "JWT token无效或过期，正在跳转回登录界面...",
        }).then(() => {
          router.push("/");
        });
      } else if (res.code === -7) {
        setFriendRequests([]);
      } else {
        messageApi.error(res.info || "获取好友申请失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    }
  };

  // 获取会话列表
  const fetchConversations = async (extraParam?: string) => {
    try {
      const response = await fetch("/api/conversations", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
      });

      const res = await response.json();
      if (res.code === 0) {
        setConversations(res.conversation);
        const conversationExists = res.conversation.some((conv: Conversation) => conv.id === selectedConversationId);
        if (!conversationExists) {
          if (isChatInfoVisible) {
            if (extraParam !== undefined && extraParam === 'true')
              setChatInfoWebsocket(6);
            else setChatInfoWebsocket(4);
          }
          setSelectedConversationId(0); // 如果不存在，则将selectedConversationId置为空
        }
      } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.error("JWT token无效或过期，正在跳转回登录界面...").then(() => {router.push("/");})
      } else {
        messageApi.error(res.info || "获取会话列表失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  // 在 fetchMessages 函数中增加参数来控制是否需要滚动到底部
  const fetchMessages = async (conversationId: number, shouldScroll: boolean = true, fromTime?: string ) => {
    try {
      // 构建请求URL，支持从特定时间开始获取消息
      const url = `/api/conversations/messages?conversationId=${conversationId}`;
      // if (fromTime) {
      //   url += `&from=${fromTime}`;
      // }

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
      });

      const res = await response.json();
      if (res.code === 0) {
        // 转换消息格式以适应UI展示
        const formattedMessages = res.messages.map((msg: any) => ({
          id: msg.id,
          type: msg.type,
          content: msg.content,
          sender: msg.senderid === userInfo?.id ? "me" : "other",
          senderid: msg.senderid,
          sendername: msg.sendername,
          senderavatar: msg.senderavatar,
          reply_to: msg?.reply_to,
          reply_to_type: msg?.reply_to_type,
          reply_to_id: msg?.reply_to_id,
          created_time: msg.created_time,
          conversation: msg.conversation,
          already_read: msg?.already_read
        }));
        
        setMessages(formattedMessages);
        setMessageWebsocket2(true);

        // 仅在应该滚动且消息非空的情况下滚动到底部
        if (shouldScroll && formattedMessages.length > 0) {
          setTimeout(scrollToBottom, 100); // 稍微延迟确保 DOM 已更新
        }
        setLoadingMessage(false);
        
        // 在成功获取消息后刷新会话列表，因为未读消息数会变化
        fetchConversations();
      } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.error("JWT token无效或过期，正在跳转回登录界面...").then(() => {router.push("/");})
      } else {
        messageApi.error(res.info || "获取消息失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    }
  };

  const fetchReadList = async (messageId: number) => {
    setReadListLoading(true);
    const csrfToken = Cookies.get('csrftoken');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Authorization: `${token}`,
    };
            
    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken;
    }
    else {
      messageApi.error('CSRF错误');
      return ;
    }
    try {
      const response = await fetch(`/api/conversations/readlist`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          message_id: messageId
        }),
        credentials: 'include',
      });

      const res = await response.json();
      if (res.code === 0) {
        setReadList(res.read_users);
        setShowReadList(true);
      } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.error("JWT token无效或过期，正在跳转回登录界面...").then(() => {router.push("/");})
      } else {
        messageApi.error(res.info || "获取已读列表失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setReadListLoading(false);
    }
  };

  const fn = useCallback((param: number, extraParam: string) => {
    if (param === 2) fetchFriendRequests();
    else if (param === 3) { 
      if (isFriendsDrawerVisible === true) {
        setFriendListDrwaerWebsocket(true);
      }
      if (isGroupDrawerVisible === true) {
        setGroupDrawerWebsocket(true);
      }
      if (isCreateCovModalVisible === true) {
        setCreateConvWebsocket(true);
      }
      if (isChatInfoVisible) 
        setChatInfoWebsocket(5);
      fetchConversations();
    } //删除需要的函数
    else if (param === 1) {
      if (selectedConversationId) {
        if (extraParam === 'true')
          fetchMessages(selectedConversationId, true, undefined);
        else
          fetchMessages(selectedConversationId, false, undefined);
      }
      else
        fetchConversations();
    }
    else if (param === 4) fetchConversations();
    else if (param === 5) {
      if (Number(extraParam) === selectedConversationId)
        setChatInfoWebsocket(1);
    }
    else if (param === 6) {
      if (Number(extraParam) === selectedConversationId)
        setChatInfoWebsocket(2);
    }
    else if (param === 7) {
      if (Number(extraParam) === selectedConversationId)
        setChatInfoWebsocket(3);
    }
    else if (param === 8) {
      fetchConversations(extraParam);
    }
    else if (param === 9) {
      if (Number(extraParam) === selectedConversationId)
      {
        const isChatGroup = conversations.find(conv => conv.id === selectedConversationId)?.is_chat_group;        
        if (isChatGroup === true) {
          setChatWebsocket(true);
        }
        else {
          setMessageWebsocket(true);
        }
      }
    }
    else {
      messageApi.error("Websocket错误");
    }
  // }, []);
  }, [selectedConversationId, isFriendsDrawerVisible, isGroupDrawerVisible, isCreateCovModalVisible, isChatInfoVisible, conversations]);

  if (token) {
    useMessageListener(token, fn);
  }

  useEffect(() => {
    if (messageWebsocket === true && messageWebsocket2 === true) {
      const timer = setTimeout(() => {
        setMessages(messages => messages.map(message => ({
          ...message,
          already_read: true
        })));
        setMessageWebsocket(false);
        setMessageWebsocket2(false);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [messages, messageWebsocket, messageWebsocket2]);

  useEffect(() => {
    if (chatWebsocket === true && showReadList === true && rightClickedMessage !== undefined) {
      fetchReadList(rightClickedMessage.id);
      setChatWebsocket(false);
    }
  }, [showReadList, chatWebsocket]);

  // 检查 JWT Token 的有效性
  useEffect(() => {
    // 检查 cookies 中是否已存在 jwtToken
    const jwtToken = Cookies.get("jwtToken");
    if (!jwtToken) {
      setInitialLoading(false);
      setIsAuthenticated(false);
      router.push("/").then(() => setShowAlert(true));
    } else {
      setIsAuthenticated(true);
      // 短暂延迟以显示加载动画
      setTimeout(() => {
        setInitialLoading(false);
      }, 800);
    }
  }, [router]);

  useEffect(() => {
    if (showAlert) {
      alert("Cookies不存在或已经失效，请先登录!");
      setShowAlert(false);
    }
  }, [showAlert]);

  
  useEffect(() => {
    if (Cookies.get("jwtToken")) {
      fetchUserInfo();
      fetchConversations();
      fetchFriendRequests();
    } 
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim()) {
      messageApi.error("不能发送空消息");
      return;
    }
    if (!selectedConversationId) {
      messageApi.error("请选择一个聊天");
      return;
    }

    const csrfToken = Cookies.get('csrftoken');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Authorization: `${token}`,
    };
            
    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken;
    }
    else {
      messageApi.error('CSRF错误');
      return ;
    }
    try {
      const response = await fetch("/api/conversations/messages", {
        method: "POST",
        headers,
        body: JSON.stringify({
          conversationId: selectedConversationId,
          content: input.trim(),
          reply_to: replyToMessage?.id 
        }),
        credentials: 'include',
      });

      const res = await response.json();
      if (res.code === 0) {
        // 发送消息之后notify会发送websocket消息，因此不需要前端更新
        setInput("");
        setReplyToMessage(undefined); // 清除回复状态
      } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.error("JWT token无效或过期，正在跳转回登录界面...").then(() => {router.push("/");})
      } else {
        messageApi.error(res.info || "发送消息失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    }
  };

  //添加插入表情的函数
  const handleEmojiSelect = (emoji: string) => {
    setInput((prevInput) => prevInput + emoji);
    //setEmojiVisible(false);
  }

  //处理图片上传
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      messageApi.error("请选择要上传的图片");
      return;
    }

    const file = files[0];
    
    // 检查文件是否为图片
    if (!file.type.startsWith("image/")) {
      messageApi.error("请选择有效的图片文件");
      return;
    }

    // 检查是否选择了会话
    if (!selectedConversationId) {
      messageApi.error("请选择一个聊天");
      return;
    }

    // 显示加载提示
    // const loadingMessage = messageApi.loading("正在上传图片...", 0);

    const csrfToken = Cookies.get('csrftoken');
    const headers: HeadersInit = {
      Authorization: `${token}`,
    };
            
    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken;
    }
    else {
      messageApi.error('CSRF错误');
      return ;
    }
    try {
      const formData = new FormData();
      formData.append("conversationId", selectedConversationId.toString());
      formData.append("image", file);

      const response = await fetch('/api/conversations/image', {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      });

      const res = await response.json();

      // 关闭加载提示
      // loadingMessage();

      if (res.code === 0) {
        messageApi.success("图片发送成功");
        // 清空文件输入框
        if (event.target) event.target.value = "";
      } else if (res.code === -2 && res.info === "Invalid or expired JWT") {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.error("JWT token无效或过期，正在跳转回登录界面...").then(() => {
          router.push("/");
        });
      } else if (res.code === 1) {
        messageApi.error("当前用户不在会话中");
      } else if (res.code === -1) {
        messageApi.error("会话不存在");
      } else {
        messageApi.error(res.info || "图片上传失败");
      }
    } catch (error) {
      // 关闭加载提示
      // loadingMessage();
      messageApi.error("网络错误，请稍后重试");
    }
  };

  const fetchReplyList = async (messageId: number) => {
    setReplyListLoading(true);
    try {
      const response = await fetch(`/api/conversations/get_reply?message_id=${messageId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`
        }
      });

      const res = await response.json();
      if (res.code === 0) {
        setReplyList(res.replies);
        setShowReplyList(true);
        // setReplyListMessageId(messageId);
      } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.error("JWT token无效或过期，正在跳转回登录界面...").then(() => {router.push("/");})
      } else {
        messageApi.error(res.info || "获取回复列表失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setReplyListLoading(false);
    }
  };
  
  useEffect(() => {
    if (selectedConversationId) {
      setIsFirstLoad(true); // 重置为首次加载状态
      // fetchMessages(selectedConversationId, undefined, true);
      setTimeout(() => {
        fetchMessages(selectedConversationId, true, undefined); // true 表示需要自动滚动
      }, 0);
    }
  }, [selectedConversationId]);

  // 修改会话点击处理函数
  const handleConversationClick = (conversationId: number) => {
    // 如果点击的是当前已选中的会话，刷新该会话的消息
    if (conversationId === selectedConversationId) {
      // setLoadingMessage(true);
      // setMessages([]); // 清空消息，显示加载状态
      fetchMessages(conversationId, false, undefined); // 重新获取消息
      return;
    }
    setLoadingMessage(true);
    setMessages([]);
    setSelectedConversationId(conversationId);
  };

  const fromFriendListToConversation = (friendId: number) => {
    const matchingConversation = conversations.find(conv => conv.friend_id === friendId);
    // 如果找到了匹配的会话，则调用 handleConversationClick 并传入会话的 id
    if (matchingConversation) {
      handleConversationClick(matchingConversation.id);
    } else {
      // 如果没有找到匹配的会话，可以在这里处理，例如显示错误消息或进行其他操作
      messageApi.error('无法找到该会话');
    }
  }

  const handleIconClick = (iconName: string) => {
    if (iconName === "Settings") {
      setIsDrawerVisible(true); // 打开设置抽屉
    } else if (iconName === "Users") {
      setIsFriendsDrawerVisible(true); // 打开好友列表抽屉
    } else if (iconName === "Groups") {
      setIsGroupDrawerVisible(true); // 打开分组管理抽屉
    } else if (iconName === "CreateConversation") {
      setIsCreateCovModalVisible(true); // 打开创建群聊模态框
    } else {
      console.log(`${iconName} icon clicked`);
    }
  };

  const handleAvatarClick = () => {
    setIsDrawerVisible(true);
  };

  // 格式化时间显示
  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      const now = new Date();
      const isToday = date.getDate() === now.getDate() && 
                     date.getMonth() === now.getMonth() && 
                     date.getFullYear() === now.getFullYear();
      
      if (isToday) {
        return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      } else {
        return date.toLocaleDateString([], {month: 'short', day: 'numeric'});
      }
    } catch {
      return timeString;
    }
  };

  // 添加右键菜单相关状态
  const [conversationMenuPosition, setConversationMenuPosition] = useState<{ x: number; y: number } | undefined>(undefined);
  const [rightClickedConversationId, setRightClickedConversationId] = useState<number | undefined>(undefined);

  // 标记会话为未读
  const markAsUnread = async (conversationId: number) => {
    const token = Cookies.get("jwtToken");

    const csrfToken = Cookies.get('csrftoken');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Authorization: `${token}`,
    };
            
    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken;
    }
    else {
      messageApi.error('CSRF错误');
      return ;
    }
    try {
      const response = await fetch("/api/interface", {
        method: "POST",
        headers,
        body: JSON.stringify({
          conversationId,
          unreads: true
        }),
        credentials: 'include',
      });

      const res = await response.json();
      
      if (res.code === 0) {
        messageApi.success("已标记为未读");
        fetchConversations(); // 刷新会话列表
      } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.error("JWT token无效或过期，正在跳转回登录界面...").then(() => {router.push("/");})
      } else {
        messageApi.error(res.info || "操作失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    } finally {
      setConversationMenuPosition(undefined); // 关闭菜单
    }
  };

  // 扩展处理会话菜单点击的功能
  const handleConversationMenuClick = (action: string) => {
    if (action === "markAsUnread" && rightClickedConversationId) {
      markAsUnread(rightClickedConversationId);
    } else if (action === "toggleTop" && rightClickedConversationId) {
      const conversation = conversations.find(c => c.id === rightClickedConversationId);
      if (conversation) {
        toggleConversationTop(rightClickedConversationId, !conversation.is_top);
      }
    } else if (action === "toggleNotification" && rightClickedConversationId) {
      const conversation = conversations.find(c => c.id === rightClickedConversationId);
      if (conversation) {
        toggleConversationNotification(rightClickedConversationId, !conversation.notice_able);
      }
    }
    setConversationMenuPosition(undefined); // 关闭菜单
  };

  // 添加切换置顶状态的函数
  const toggleConversationTop = async (conversationId: number, isTop: boolean) => {
    const token = Cookies.get("jwtToken");

    const csrfToken = Cookies.get('csrftoken');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Authorization: `${token}`,
    };
            
    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken;
    }
    else {
      messageApi.error('CSRF错误');
      return ;
    }
    try {
      const response = await fetch("/api/interface", {
        method: "POST",
        headers,
        body: JSON.stringify({
          conversationId,
          ontop: isTop
        }),
        credentials: 'include',
      });

      const res = await response.json();
      
      if (res.code === 0) {
        messageApi.success(isTop ? "会话已置顶" : "会话已取消置顶");
        fetchConversations(); // 刷新会话列表
      } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.error("JWT token无效或过期，正在跳转回登录界面...").then(() => {router.push("/");})
      } else {
        messageApi.error(res.info || "操作失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    }
  };

  // 添加切换通知状态的函数
  const toggleConversationNotification = async (conversationId: number, noticeAble: boolean) => {
    const token = Cookies.get("jwtToken");

    const csrfToken = Cookies.get('csrftoken');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Authorization: `${token}`,
    };
            
    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken;
    }
    else {
      messageApi.error('CSRF错误');
      return ;
    }

    try {
      const response = await fetch("/api/interface", {
        method: "POST",
        headers,
        body: JSON.stringify({
          conversationId,
          notification: noticeAble
        }),
        credentials: 'include',
      });

      const res = await response.json();
      
      if (res.code === 0) {
        messageApi.success(noticeAble ? "已开启消息通知" : "已设为免打扰");
        fetchConversations(); // 刷新会话列表
      } else if (Number(res.code) === -2 && res.info === "Invalid or expired JWT") {
        Cookies.remove("jwtToken");
        Cookies.remove("userEmail");
        messageApi.error("JWT token无效或过期，正在跳转回登录界面...").then(() => {router.push("/");})
      } else {
        messageApi.error(res.info || "操作失败");
      }
    } catch (error) {
      messageApi.error("网络错误，请稍后重试");
    }
  };

  // 处理会话右键点击
  const handleConversationRightClick = (event: React.MouseEvent, conversationId: number) => {
    event.preventDefault(); // 阻止默认右键菜单
    setConversationMenuPosition({ x: event.clientX, y: event.clientY });
    setRightClickedConversationId(conversationId);
  };

  // 添加点击文档关闭会话菜单的效果
  useEffect(() => {
    const handleClickOutside = () => {
      setConversationMenuPosition(undefined);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (initialLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-r from-blue-50 to-indigo-50">
        <div style={{ textAlign: 'center' }}>
          <Spin size="large" />
          <Text style={{ display: 'block', marginTop: '16px', color: '#8A2BE2' }}>正在加载...</Text>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #f9f9ff, #f0f0ff)'
      }}>
        <Spin size="large" />
        <Text style={{ marginLeft: 12 }}>您未登录，正在跳转...</Text>
      </div>
    );
  }
  //渲染表情选择器内容
  const renderEmojiContent = () => {
    return (
      <div style={{ 
        width: '300px', 
        maxHeight: '200px', 
        overflowY: 'auto',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        padding: '8px'
      }}>
        {emojis.map((emoji, index) => (
          <div 
            key={index}
            onClick={() => handleEmojiSelect(emoji)}
            style={{ 
              cursor: 'pointer',
              fontSize: '24px',
              width: '36px',
              height: '36px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: '4px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(138, 43, 226, 0.1)';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {emoji}
          </div>
        ))}
      </div>
    );
  };
  return (
    <>
      {contextHolder}
      <Layout style={{ height: "100vh" }}>
        {/* 侧边工具栏 */}
        <Sider
          width={70}
          style={{
            background: "linear-gradient(180deg, #8A2BE2, #6A1B9A)",
            borderRight: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 0",
            boxShadow: "2px 0 10px rgba(0,0,0,0.1)",
          }}
        >
          {/* 用户头像 */}
          {userInfo && (
            <div style={{ position: 'relative', marginBottom: '40px' }}>
              <Avatar 
                src={userInfo.avatar} 
                size={46} 
                style={{ 
                  cursor: "pointer",
                  border: "3px solid rgba(255,255,255,0.8)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                  transition: "all 0.3s ease"
                }} 
                onClick={handleAvatarClick} 
              />
              {/* 在线状态指示器 */}
              <div style={{ 
                position: 'absolute',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#4caf50',
                border: '2px solid white',
                bottom: '-2px',
                right: '-2px'
              }}/>
            </div>
          )}
          
          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            gap: "24px", 
            flex: 1,
            justifyContent: "space-between" // 添加空间分布，让按钮分布在容器的两端
          }}>
            {/* 顶部按钮区域 */}
            <div style={{ 
              display: "flex", 
              flexDirection: "column", 
              alignItems: "center", 
              gap: "24px"
            }}>
              <Tooltip title="好友" placement="right">
                <div style={{ 
                  position: 'relative',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '12px', 
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  transition: 'all 0.3s ease',
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                onClick={() => handleIconClick("Users")}
                >
                  <ContactsOutlined style={{ fontSize: "22px", color: "#fff" }} />
                  {unhandleRequests > 0 && (
                    <Badge
                      count={unhandleRequests}
                      style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        backgroundColor: "#ff4d4f",
                        color: "#ffffff",
                        fontSize: "10px",
                        minWidth: "16px",
                        height: "16px",
                        lineHeight: "16px",
                        boxShadow: "0 0 0 2px rgba(255,255,255,0.8)",
                      }}
                    />
                  )}
                </div>
              </Tooltip>
              
              <Tooltip title="好友分组" placement="right">
                <div style={{ 
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '12px', 
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  transition: 'all 0.3s ease',
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                onClick={() => handleIconClick("Groups")}
                >
                  <TeamOutlined style={{ fontSize: "22px", color: "#fff" }} />
                </div>
              </Tooltip>
              
              <Tooltip title="创建群聊" placement="right">
                <div style={{ 
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '12px', 
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  transition: 'all 0.3s ease',
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                onClick={() => handleIconClick("CreateConversation")}
                >
                  <PlusCircleOutlined style={{ fontSize: "22px", color: "#fff" }} />
                </div>
              </Tooltip>
              
            {/* 添加 qwen AI 助手按钮 */}
            <Tooltip title="AI 助手" placement="right">
              <div style={{ 
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '12px', 
                backgroundColor: 'rgba(255,255,255,0.1)',
                transition: 'all 0.3s ease',
                cursor: "pointer",
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              onClick={toggleqwenModal}
              >
                <RobotOutlined style={{ fontSize: "22px", color: "#fff" }} />
              </div>
            </Tooltip>
          </div>
            {/* 底部的设置按钮 */}
            <Tooltip title="设置" placement="right">
              <div style={{ 
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '12px', 
                backgroundColor: 'rgba(255,255,255,0.1)',
                transition: 'all 0.3s ease',
                cursor: "pointer",
                marginBottom: '0px' // 不再需要底部边距，会自动与侧边栏底部保持一定距离
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              onClick={() => handleIconClick("Settings")}
              >
                <SettingOutlined style={{ fontSize: "22px", color: "#fff" }} />
              </div>
            </Tooltip>
          </div>
        </Sider>

        {/* 会话列表 */}
        <Sider width={320} style={{ background: "#f8f8fc", borderRight: "1px solid #e6e6f0" }}>
          <div style={{ padding: "16px", display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ margin: '8px 0 24px 0' }}>
              <Title level={4} style={{ margin: 0, color: '#8A2BE2' }}>聊天列表</Title>
            </div>
            <Input
              placeholder="搜索会话..."
              prefix={<SearchOutlined style={{ color: '#8A2BE2' }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ 
                marginBottom: "16px", 
                borderRadius: '8px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                border: 'none'
              }}
            />
            <div style={{ flex: 1, overflow: 'auto' }}>
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                  <Spin />
                </div>
              ) : conversations.length === 0 ? (
                <Empty 
                  description="暂无会话" 
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ margin: '60px 0' }}
                />
              ) : (
                <List
                  itemLayout="horizontal"
                  dataSource={conversations.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))}
                  renderItem={(conversation) => (
                    <List.Item 
                      onClick={() => {handleConversationClick(conversation.id);}} 
                      onContextMenu={(e) => handleConversationRightClick(e, conversation.id)}
                      style={{ 
                        cursor: "pointer",
                        padding: "12px 16px",
                        borderRadius: "12px",
                        marginBottom: "8px",
                        background: selectedConversationId === conversation.id 
                          ? "rgba(138, 43, 226, 0.1)" 
                          : "white",
                        border: selectedConversationId === conversation.id 
                          ? "1px solid rgba(138, 43, 226, 0.3)" 
                          : "1px solid transparent",
                        transition: "all 0.3s ease",
                        boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                      }}

                      onMouseEnter={(e) => {
                        if (selectedConversationId !== conversation.id) {
                          e.currentTarget.style.background = "#f9f9ff";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.08)";
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.border = "1px solid rgba(138, 43, 226, 0.15)";
                        } else {
                          e.currentTarget.style.background = "rgba(138, 43, 226, 0.15)";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(138, 43, 226, 0.15)";
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedConversationId !== conversation.id) {
                          e.currentTarget.style.background = "white";
                          e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.03)";
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.border = "1px solid transparent";
                        } else {
                          e.currentTarget.style.background = "rgba(138, 43, 226, 0.1)";
                          e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.03)";
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.border = "1px solid rgba(138, 43, 226, 0.3)";
                        }
                      }}
                    >
                      <List.Item.Meta
                        avatar={
                          <div style={{ position: 'relative' }}>
                            <Avatar 
                              src={conversation.avatar} 
                              size={46}
                              style={{ 
                                border: conversation.is_chat_group 
                                  ? "none" 
                                  : "2px solid rgba(138, 43, 226, 0.3)" 
                              }}
                            />
                            {/* 未读消息提示 */}
                            {conversation.unread_count > 0 && conversation.notice_able && (
                              <Badge 
                                count={conversation.unread_count} 
                                style={{
                                  position: 'absolute',
                                  right: -5,
                                  top: -5,
                                  boxShadow: '0 0 0 2px white'
                                }}
                              />
                            )}
                            
                            {/* 免打扰标志 - 更醒目的显示方式 */}
                            {!conversation.notice_able && (
                              <Tooltip title="消息免打扰" placement="top">
                                <div style={{
                                  position: 'absolute',
                                  right: -8,
                                  top: -8,
                                  backgroundColor: '#f5f5f5',
                                  borderRadius: '50%',
                                  width: '22px',
                                  height: '22px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  border: '2px solid white',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                }}>
                                  <BellOutlined style={{ 
                                    fontSize: '12px', 
                                    color: '#ff7875',
                                    position: 'relative',
                                    zIndex: 2
                                  }} />
                                </div>
                              </Tooltip>
                            )}
                            
                            {/* 未读消息但处于免打扰状态 */}
                            {conversation.unread_count > 0 && !conversation.notice_able && (
                              <Badge 
                                dot 
                                style={{
                                  position: 'absolute',
                                  right: -2,
                                  top: 16,
                                  boxShadow: '0 0 0 2px white'
                                }}
                              />
                            )}
                          </div>
                        }
                        title={
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text strong style={{ fontSize: '15px' }}>{conversation.name}</Text>
                            {conversation.last_message_time && <Text type="secondary" style={{ fontSize: '12px' }}>
                              {formatTime(conversation.last_message_time)}
                            </Text>}
                          </div>
                        }
                        description={
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text ellipsis style={{ maxWidth: '180px', fontSize: '13px', color: '#666' }}>
                              {conversation.last_message_time === '' ? '暂无消息' : (conversation.last_message_type === 1 ? '[图片]' : conversation.last_message)}
                            </Text>
                            {conversation.is_top && (
                              <Tag color="#8A2BE2" style={{ margin: 0, fontSize: '10px' }}>置顶</Tag>
                            )}
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </div>
          </div>
        </Sider>

        <Layout>
          {/* 聊天头部 */}
          {selectedConversationId ? (
            <Header
              style={{
                background: "#fff",
                padding: "0 24px",
                borderBottom: "1px solid #f0f0f0",
                display: "flex",
                alignItems: "center",
                height: "70px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
              }}
            >
              <Avatar src={conversations.find((c) => c.id === selectedConversationId)?.avatar} size="large" />
              <div style={{ marginLeft: "16px", display: "flex", flexDirection: "column" }}>
                <Text strong style={{ fontSize: '16px' }}>
                  {conversations.find((c) => c.id === selectedConversationId)?.name}
                </Text>
              </div>
              {/* TODO(暂无需考虑): 额外信息===================================================================== */}
              <div style={{ marginLeft: "auto" }}>
                <Tooltip title="聊天信息">
                  <Button
                    type="text"
                    shape="circle"
                    icon={<MoreOutlined style={{ fontSize: "18px", color: "#8A2BE2" }} />}
                    onClick={() => setIsChatInfoVisible(true)}
                  />
                </Tooltip>
              </div>
              {/* TODO(暂无需考虑): 额外信息===================================================================== */}
            </Header>
          ) : (
            <Header
              style={{
                background: "#fff",
                padding: "0 24px",
                borderBottom: "1px solid #f0f0f0",
                display: "flex",
                alignItems: "center",
                height: "70px"
              }}
            >
              <Text style={{ fontSize: '16px', color: '#8A2BE2' }}>
                欢迎使用聊天应用
              </Text>
            </Header>
          )}

          {/* 聊天内容区域 */}
          <Content 
            // key = {selectedConversationId}
            style={{ 
              padding: "24px", 
              background: "#fff", 
              backgroundImage: 'linear-gradient(135deg, rgba(246, 246, 255, 0.4) 25%, rgba(236, 236, 255, 0.4) 25%, rgba(236, 236, 255, 0.4) 50%, rgba(246, 246, 255, 0.4) 50%, rgba(246, 246, 255, 0.4) 75%, rgba(236, 236, 255, 0.4) 75%, rgba(236, 236, 255, 0.4) 100%)',
              backgroundSize: '40px 40px',
              height: 'calc(100vh - 200px)', // 固定高度，减去header和输入框的高度
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
            ref={messagesContainerRef} // 绑定滚动容器的引用
          >
            {selectedConversationId ? (
              loadingMessage ? (
                <div style={{ 
                  flex: 1, 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  height: '100%'
                }}>
                  <Spin tip="正在加载消息..." size="large" />
                </div>
              ) : (
                messages?.length > 0 ? (
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    justifyContent: messages.length < 10 ? 'flex-start' : 'flex-end', // 当消息少时，靠上显示
                  }}>
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        ref={(el) => {
                          if (el) {
                            messageRefs.current[msg.id] = el;
                          }
                        }} // 绑定每个消息的引用
                        style={{ 
                        display: "flex", 
                        justifyContent: msg.sender === "me" ? "flex-end" : "flex-start", // 确保自己的消息在右侧
                        marginBottom: "24px",
                        // 添加高亮效果
                        padding: highlightedMessageId === msg.id ? "8px" : "0px",
                        borderRadius: highlightedMessageId === msg.id ? "8px" : "0px",
                        backgroundColor: highlightedMessageId === msg.id ? "rgba(138, 43, 226, 0.1)" : "transparent",
                        transition: "all 0.3s ease"
                      }}>
                        {/* 如果不是自己的消息，在左侧显示头像 */}
                        {msg.sender !== "me" && (
                          <Avatar 
                            src={msg.senderavatar} 
                            style={{ marginRight: '8px', alignSelf: 'flex-start' }}
                          />
                        )}
                        <div 
                          style={{ 
                            position: 'relative',
                            maxWidth: "60%", 
                            padding: msg.type === 0 ? "12px 16px" : "8px", 
                            borderRadius: msg.sender === "me" 
                              ? "18px 18px 0 18px" 
                              : "0 18px 18px 18px", 
                            background: msg.sender === "me" 
                              ? "linear-gradient(135deg, #9F4BDF, #8A2BE2)" 
                              : "#fff",
                            boxShadow: msg.sender === "me"
                              ? "0 2px 10px rgba(138, 43, 226, 0.25)"
                              : "0 2px 10px rgba(0, 0, 0, 0.08)",
                            border: msg.sender === "me"
                              ? "none"
                              : "1px solid rgba(0, 0, 0, 0.05)",
                            cursor: "context-menu",
                            transition : "all 0.2s ease",
                          }}
                          onContextMenu={(e) => handleMessageRightClick(e, msg)}
                          onMouseEnter={(e) => {
                            // 鼠标悬停效果
                            if (msg.sender === "me") {
                              e.currentTarget.style.background = "linear-gradient(135deg, #A64CEB, #9535E0)";
                              e.currentTarget.style.boxShadow = "0 4px 12px rgba(138, 43, 226, 0.4)";
                              e.currentTarget.style.transform = "translateY(-2px)";
                            } else {
                              e.currentTarget.style.background = "#f9f9ff";
                              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.12)";
                              e.currentTarget.style.transform = "translateY(-2px)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            // 恢复原始样式
                            if (msg.sender === "me") {
                              e.currentTarget.style.background = "linear-gradient(135deg, #9F4BDF, #8A2BE2)";
                              e.currentTarget.style.boxShadow = "0 2px 10px rgba(138, 43, 226, 0.25)";
                              e.currentTarget.style.transform = "translateY(0)";
                            } else {
                              e.currentTarget.style.background = "#fff";
                              e.currentTarget.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.08)";
                              e.currentTarget.style.transform = "translateY(0)";
                            }
                          }}
                        >
                          {/* 群聊中且不是自己的消息时，显示发送者姓名 */}
                          {conversations.find(c => c.id === selectedConversationId)?.is_chat_group && 
                          msg.sender !== "me" && (
                            <div style={{ 
                              fontSize: '12px', 
                              fontWeight: '500',
                              marginBottom: '4px', 
                              color: '#8A2BE2',
                              paddingLeft: '2px'
                            }}>
                              {msg.sendername}
                            </div>
                          )}

                          {/* 如果有回复，显示回复的原消息 */}
                          {msg.reply_to_id && (
                            <div style={{
                              padding: '8px',
                              marginBottom: '8px',
                              borderRadius: '8px',
                              backgroundColor: msg.sender === "me" ? 'rgba(255, 255, 255, 0.2)' : 'rgba(138, 43, 226, 0.08)',
                              borderLeft: msg.sender === "me" ? '3px solid rgba(255, 255, 255, 0.5)' : '3px solid #8A2BE2',
                              fontSize: '13px',
                              color: msg.sender === "me" ? 'rgba(255, 255, 255, 0.9)' : '#666'
                            }}>
                              <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                                {messages.find(m => m.id === msg.reply_to_id)?.sendername || "回复消息"}
                              </div>
                              <div style={{ 
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {msg.reply_to_type === 0 ? (
                                    msg.reply_to?.split('\n').map((line, index) => (
                                      <span key={index}>
                                        {line}
                                        <br />
                                      </span>
                                    ))
                                  ) : 
                                  <img src={msg.reply_to} alt="回复图片" style={{ maxWidth: '100%', maxHeight: '100px' }} />
                                }
                              </div>
                            </div>
                          )}
                          {/* 根据消息类型显示不同内容 */}
                          {msg.type === 0 ? (
                            // 文本消息
                            <p style={{ 
                              margin: 0, 
                              color: msg.sender === "me" ? "white" : "#333",
                              fontSize: '15px',
                              lineHeight: '1.5',
                              wordBreak: 'break-word'
                            }}>
                              {msg.content.split('\n').map((line, index) => (
                                <span key={index}>
                                  {line}
                                  <br />
                                </span>
                              ))}
                            </p>
                          ) : msg.type === 1 ? (
                            // 图片消息
                            <img 
                              src={msg.content} 
                              alt="图片消息" 
                              style={{ 
                                maxWidth: '100%', 
                                borderRadius: '8px',
                                cursor: 'pointer'
                              }} 
                              onClick={() => window.open(msg.content, '_blank')}
                            />
                          ) : (
                            // 其他类型消息
                            <p style={{ 
                              margin: 0, 
                              color: msg.sender === "me" ? "white" : "#333",
                              fontSize: '15px',
                              lineHeight: '1.5'
                            }}>未知消息类型</p>
                          )}

                          <div style={{ 
                            display: 'flex',
                            justifyContent: 'flex-end',
                            marginTop: '4px',
                            gap: '4px',
                            alignItems: 'center'
                          }}>
                            <ClockCircleOutlined style={{ 
                              fontSize: '10px', 
                              color: msg.sender === "me" ? "rgba(255,255,255,0.7)" : "#999" 
                            }} />
                            <Text style={{ 
                              fontSize: "11px", 
                              color: msg.sender === "me" ? "rgba(255,255,255,0.7)" : "#999",
                            }}>{formatTime(msg.created_time)}</Text>

                            {/* 为自己发送的消息添加已读状态显示 */}
                            {!conversations.find(c => c.id === selectedConversationId)?.is_chat_group && 
                            msg.sender === "me" && (
                              <Text style={{ 
                                fontSize: "11px", 
                                marginLeft: "4px",
                                color: msg.already_read 
                                  ? "rgba(255,255,255,0.7)"  
                                  : "rgba(255, 220, 160, 0.95)", 
                                fontWeight: msg.already_read ? "normal" : "500", 
                                textShadow: "0px 1px 2px rgba(0,0,0,0.1)" 
                              }}>
                                {msg.already_read ? "已读" : "未读"}
                              </Text>
                            )}
                          </div>
                        </div>
                        {/* 如果是自己的消息，在右侧显示头像 */}
                        {msg.sender === "me" && (
                          <Avatar 
                            src={userInfo?.avatar} 
                            style={{ marginLeft: '8px', alignSelf: 'flex-end' }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column',
                    justifyContent: 'center', 
                    alignItems: 'center',
                    color: '#999',
                    height: '100%'
                  }}>
                    <Empty 
                      description="暂无消息，开始聊天吧！" 
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  </div>
                ))
            ) : (
              <div style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'center', 
                alignItems: 'center',
                color: '#999',
                height: '100%'
              }}>
                <MessageOutlined style={{ fontSize: '60px', color: '#8A2BE2', opacity: 0.3, marginBottom: '24px' }} />
                <Text style={{ fontSize: '16px', color: '#666' }}>
                  请选择一个会话或开始新的聊天
                </Text>
              </div>
            )}

            {/* 右键菜单 */}
              {contextMenuPosition && (
                <div style={{
                  position: 'fixed',
                  left: contextMenuPosition.x,
                  top: contextMenuPosition.y,
                  backgroundColor: 'white',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)',
                  borderRadius: '8px',
                  padding: '4px 0',
                  zIndex: 1000,
                  minWidth: '120px'
                }}>
                  <div 
                    onClick={() => handleMenuClick('reply')}
                    style={{
                      padding: '8px 16px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(138, 43, 226, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <MessageOutlined style={{ fontSize: '14px', color: '#8A2BE2' }} />
                    回复
                </div>
                {/* 添加查看回复列表选项 */}
                <div 
                  onClick={() => handleMenuClick('viewReplies')}
                  style={{
                    padding: '8px 16px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(138, 43, 226, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <TeamOutlined style={{ fontSize: '14px', color: '#8A2BE2' }} />
                  查看回复列表
                </div>
                {/* 添加查看已读列表选项，仅在群聊中显示 */}
                {conversations.find(c => c.id === selectedConversationId)?.is_chat_group && (
                  <div 
                    onClick={() => handleMenuClick('viewReadList')}
                    style={{
                      padding: '8px 16px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(138, 43, 226, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <CheckCircleOutlined style={{ fontSize: '14px', color: '#8A2BE2' }} />
                    查看已读列表
                  </div>
                )}
                {/* 添加查看原消息选项，当消息有回复时才显示 */}
                {rightClickedMessage?.reply_to_id && (
                  <div 
                    onClick={() => handleMenuClick('viewOriginal')}
                    style={{
                      padding: '8px 16px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(138, 43, 226, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <SearchOutlined style={{ fontSize: '14px', color: '#8A2BE2' }} />
                    定位到原文位置
                  </div>
                )}
                </div>
              )}            
          </Content>

          {/* 消息输入区域 */}
          {selectedConversationId && (
            <div style={{ 
              padding: "16px 24px", 
              borderTop: "1px solid #f0f0f0", 
              background: "#fff", 
              display: "flex",
              flexDirection: "column",
              gap: "12px"
            }}>
              {/* 回复消息预览*/}
              {replyToMessage && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  backgroundColor: 'rgba(138, 43, 226, 0.08)',
                  borderRadius: '8px',
                  borderLeft: '3px solid #8A2BE2',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative'//为提示添加定位上下文
                }}
                onClick={handleReplyPreviewClick}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(138, 43, 226, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(138, 43, 226, 0.08)';
                }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '13px', color: '#666' }}>
                      回复 <span style={{ color: '#8A2BE2', fontWeight: 'bold' }}>{replyToMessage.sendername}</span>
                    </div>
                    <div style={{ color: '#666', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {replyToMessage.type === 1 ? (
                      <img src={replyToMessage.content} alt="回复图片" style={{ maxWidth: '100%', maxHeight: '100px' }} />
                    ) : (
                      replyToMessage.content.split('\n').map((line, index) => (
                        <span key={index}>
                          {line}
                          <br />
                        </span>
                      ))
                    )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <small style={{ color: '#999', fontSize: '12px', marginRight: '8px' }}>点击跳转到原文位置</small>
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<CloseOutlined />} 
                    onClick={(e) => {
                      e.stopPropagation(); // 阻止事件冒泡，避免触发父元素的点击事件
                      cancelReply();
                    }}
                    style={{ color: '#999' }}
                  />
                  </div>
                </div>
              )} 
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Popover 
                    content={renderEmojiContent()} 
                    trigger="click" 
                    open={emojiVisible}
                    onOpenChange={setEmojiVisible}
                    placement="topLeft"
                    style={{ maxWidth: '320px'}}
                    title={
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid #f0f0f0',
                        paddingBottom: '8px'
                      }}>
                        <Text strong style={{ color: '#8A2BE2' }}>表情选择</Text>
                        <Button 
                          type="text" 
                          size="small" 
                          icon={<CloseOutlined />} 
                          onClick={() => setEmojiVisible(false)}
                        />
                      </div>
                    }
                  >
                    <Button 
                      type="text" 
                      shape="circle" 
                      icon={<SmileOutlined style={{ fontSize: 18, color: '#8A2BE2' }}/>}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        transition: 'all 0.3s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(138, 43, 226, 0.1)';
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    />
                  </Popover>
                  <Tooltip title="图片">
                    <Button 
                      type="text" 
                      shape="circle" 
                      icon={<PictureOutlined style={{ fontSize: 18, color: '#8A2BE2' }}/>}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        transition: 'all 0.3s'
                      }}
                      onClick={() => document.getElementById('imageUpload')?.click()}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(138, 43, 226, 0.1)';
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    />
                  </Tooltip>
                  <input
                    type="file"
                    id="imageUpload"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleImageUpload}
                  />
                </div>
                
                <TextArea
                  placeholder="输入消息..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                  style={{ 
                    flex: 1, 
                    resize: 'none',
                    borderRadius: '16px',
                    padding: '10px 16px',
                    minHeight: '44px',
                    maxHeight: '120px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    border: '1px solid #e6e6f0',
                    transition: 'all 0.3s ease'
                  }}
                  autoSize={{ minRows: 1, maxRows: 4 }}
                />
                
                <Tooltip title="发送消息">
                  <Button 
                    type="primary" 
                    shape="circle"
                    icon={<SendOutlined />}
                    onClick={handleSendMessage} 
                    style={{ 
                      backgroundColor: "#8A2BE2", 
                      borderColor: "#8A2BE2",
                      width: '44px',
                      height: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(138, 43, 226, 0.3)',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#7B1FA2';
                      e.currentTarget.style.borderColor = '#7B1FA2';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#8A2BE2';
                      e.currentTarget.style.borderColor = '#8A2BE2';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  />
                </Tooltip>
              </div>
            </div>
          )}
        </Layout>

        {/* 创建群聊模态框 */}
        <CreateCovModal
          visible={isCreateCovModalVisible}
          onClose={() => setIsCreateCovModalVisible(false)}
          onSuccess={fetchConversations}
          websocket={createConvWebsocket}
          setWebsocket={setCreateConvWebsocket}
        />

        {/* 设置抽屉 */}
        <SettingsDrawer
          visible={isDrawerVisible}
          onClose={() => setIsDrawerVisible(false)}
          userInfo={userInfo}
          fetchUserInfo={fetchUserInfo}
        />

        {/* 好友列表抽屉 */}
        <FriendsListDrawer
          visible={isFriendsDrawerVisible}
          onClose={() => setIsFriendsDrawerVisible(false)}
          fetchFriendRequests={fetchFriendRequests}
          friendRequests={friendRequests}
          unhandleRequests={unhandleRequests}
          websocket={friendListDrwaerWebsocket}
          setWebsocket={setFriendListDrwaerWebsocket}
          gotoConversation={fromFriendListToConversation}
        />

        {/* 分组管理抽屉 */}
        <GroupManagementDrawer
          visible={isGroupDrawerVisible}
          onClose={() => setIsGroupDrawerVisible(false)}
          websocket={groupDrawerWebsocket}
          setWebsocket={setGroupDrawerWebsocket}
        />
        {/* 聊天信息抽屉 */}
        <ChatInfoDrawer
          visible={isChatInfoVisible}
          onClose={() => setIsChatInfoVisible(false)}
          conversationId={selectedConversationId}
          isGroup={conversations.find((c) => c.id === selectedConversationId)?.is_chat_group || false}
          groupName={conversations.find((c) => c.id === selectedConversationId)?.name}
          groupAvatar={conversations.find((c) => c.id === selectedConversationId)?.avatar}
          isTop={conversations.find((c) => c.id === selectedConversationId)?.is_top || false}
          noticeAble={conversations.find((c) => c.id === selectedConversationId)?.notice_able || true}
          refreshConversations={fetchConversations}
          userId={userInfo?.id}
          userInfo={userInfo}
          fetchMessages={fetchMessages}
          websocket={chatInfoWebsocket}
          setWebsocket={setChatInfoWebsocket}
        />
        {/* 回复列表弹窗 */}
        {showReplyList && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1010,
          }}>
            <div style={{
              width: '500px',
              maxHeight: '80vh',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              {/* 弹窗标题 */}
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'rgba(138, 43, 226, 0.03)'
              }}>
                <Text strong style={{ fontSize: '16px', color: '#8A2BE2' }}>
                  回复列表
                </Text>
                <Button 
                  type="text" 
                  icon={<CloseOutlined />} 
                  onClick={() => {
                    setShowReplyList(false);
                    // setReplyListMessageId(undefined);
                    setReplyList([]);
                  }} 
                />
              </div>
              
              {/* 回复列表内容 */}
              <div style={{
                padding: '0',
                overflowY: 'auto',
                flex: 1,
                maxHeight: 'calc(80vh - 70px)'
              }}>
                {replyListLoading ? (
                  <div style={{ padding: '40px 0', display: 'flex', justifyContent: 'center' }}>
                    <Spin />
                  </div>
                ) : replyList.length === 0 ? (
                  <Empty 
                    description="暂无回复" 
                    style={{ margin: '40px 0' }} 
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ) : (
                  <List
                    dataSource={replyList}
                    renderItem={item => (
                      <List.Item style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid #f0f0f0'
                      }}>
                        <List.Item.Meta
                          avatar={<Avatar src={item.sender_avatar} />}
                          title={
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Text strong>{item.sender_name}</Text>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                {formatTime(item.time)}
                              </Text>
                            </div>
                          }
                          description={
                            <div style={{
                              marginTop: '8px',
                              padding: '12px',
                              backgroundColor: '#f9f9f9',
                              borderRadius: '8px'
                            }}>
                              {item.content}
                            </div>
                          }
                        />
                      </List.Item>
                    )}
                  />
                )}
              </div>
            </div>
          </div>
        )}
        {/* 已读列表弹窗 */}
        {showReadList && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1010,
          }}>
            <div style={{
              width: '400px',
              maxHeight: '70vh',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              {/* 弹窗标题 */}
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'rgba(138, 43, 226, 0.03)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircleOutlined style={{ color: '#8A2BE2' }} />
                  <Text strong style={{ fontSize: '16px', color: '#8A2BE2' }}>
                    已读成员 ({readList.length})
                  </Text>
                </div>
                <Button 
                  type="text" 
                  icon={<CloseOutlined />} 
                  onClick={() => {
                    setShowReadList(false);
                    setReadList([]);
                  }} 
                />
              </div>
              
              {/* 已读列表内容 */}
              <div style={{
                padding: '0',
                overflowY: 'auto',
                flex: 1,
                maxHeight: 'calc(70vh - 60px)'
              }}>
                {readListLoading ? (
                  <div style={{ padding: '40px 0', display: 'flex', justifyContent: 'center' }}>
                    <Spin />
                  </div>
                ) : readList.length === 0 ? (
                  <Empty 
                    description="暂无已读成员" 
                    style={{ margin: '40px 0' }} 
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ) : (
                  <List
                    dataSource={readList}
                    renderItem={item => (
                      <List.Item style={{
                        padding: '12px 20px',
                        borderBottom: '1px solid #f0f0f0'
                      }}>
                        <List.Item.Meta
                          avatar={<Avatar src={item.avatar} />}
                          title={<Text>{item.name}</Text>}
                        />
                      </List.Item>
                    )}
                  />
                )}
              </div>
            </div>
          </div>
        )}
        {/* 会话右键菜单 */}
        {conversationMenuPosition && (
          <div style={{
            position: 'fixed',
            left: conversationMenuPosition.x,
            top: conversationMenuPosition.y,
            backgroundColor: 'white',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
            borderRadius: '8px',
            padding: '8px 0',
            zIndex: 1000,
            minWidth: '180px',
            border: '1px solid #f0f0f0'
          }}>
            {/* 标记为已读/未读 */}
            <div 
              onClick={() => handleConversationMenuClick('markAsUnread')}
              style={{
                padding: '10px 16px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#333333',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(138, 43, 226, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <ClockCircleOutlined style={{ fontSize: '16px', color: '#8A2BE2' }} />
              标记为未读
            </div>

            {/* 置顶/取消置顶 */}
            {rightClickedConversationId && (
              <div 
                onClick={() => handleConversationMenuClick('toggleTop')}
                style={{
                  padding: '10px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#333333',
                  fontWeight: '500'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(138, 43, 226, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {conversations.find(c => c.id === rightClickedConversationId)?.is_top ? (
                  <>
                    <PushpinOutlined style={{ fontSize: '16px', color: '#ff4d4f' }} />
                    取消置顶
                  </>
                ) : (
                  <>
                    <PushpinOutlined style={{ fontSize: '16px', color: '#8A2BE2' }} />
                    置顶会话
                  </>
                )}
              </div>
            )}

            {/* 消息通知设置 */}
            {rightClickedConversationId && (
              <div 
                onClick={() => handleConversationMenuClick('toggleNotification')}
                style={{
                  padding: '10px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#333333',
                  fontWeight: '500'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(138, 43, 226, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {conversations.find(c => c.id === rightClickedConversationId)?.notice_able ? (
                  <>
                    <BellOutlined style={{ fontSize: '16px', color: '#ff4d4f' }} />
                    设为免打扰
                  </>
                ) : (
                  <>
                    <BellOutlined style={{ fontSize: '16px', color: '#8A2BE2' }} />
                    开启消息通知
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </Layout>

      {/* 添加 qwen 聊天模态框 */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center" }}>
            <Avatar 
              icon={<RobotOutlined />} 
              style={{ 
                backgroundColor: "#8A2BE2", 
                color: "#fff",
                marginRight: 12
              }} 
            />
            <span>qwen AI 助手</span>
          </div>
        }
        open={isqwenVisible}
        onCancel={toggleqwenModal}
        footer={[]}
        width={800}
        style={{ top: 20 }}
        styles={{ body: { padding: 0, height: "70vh" } }}
      >
        <QwenChatPage key={qwenKey}/>
      </Modal>
    </>
  );
};

export default ChatPage;