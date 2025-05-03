import { useEffect } from 'react';


// 使用 React 的 useEffect 钩子来监听 WebSocket 消息
export const useMessageListener = (token: string, fn: (param: number, extraParam: string) => void) => {
  useEffect(() => {
    let websocket: WebSocket | undefined;
    let isClosedManually = false;

    // 建立 WebSocket 连接
    const initializeWebSocket = () => {
      const wsUrl = `https://backend-eyjhbgci.app.spring25b.secoder.net/ws/?token=${token}`.replace("https://", "wss://");
      websocket = new WebSocket(wsUrl);

      // WebSocket 连接成功
      websocket.onopen = () => {
        console.log("WebSocket 已连接");
      };

      // 接收 WebSocket 消息
      websocket.onmessage = async (event) => {
        console.log("接收到消息");
        if (event.data) {
          try {
            const message = JSON.parse(event.data);
            if (message.type === "notify") fn(1, message.scroll);
            else if (message.type === "request_message") fn(2, "");
            else if (message.type === "delete_friend") fn(3, "");
            else if (message.type === "conv_setting") fn(4, "");
            else if (message.type === "modify_members") fn(5, message.conversationId);
            else if (message.type === "notification_message") fn(6, message.conversationId);
            else if (message.type === "invitation_message") fn(7, message.conversationId);
            else if (message.type === "remove_members") fn(8, "");
            else fn(9, "");
          } catch (error) {
            console.error("解析 WebSocket 消息失败:", error);
          }
        }
      };

      // WebSocket 连接关闭
      websocket.onclose = () => {
        console.log("WebSocket 已断开");
        if (!isClosedManually) {
          console.log("尝试重新连接...");
          setTimeout(initializeWebSocket, 1000); // 1 秒后重连
        }
      };
    };

    // 初始化 WebSocket 连接
    initializeWebSocket();

    // 清理函数：关闭 WebSocket 连接
    return () => {
      if (websocket) {
        isClosedManually = true;
        websocket.close();
      }
    };
  }, [token, fn]);
};