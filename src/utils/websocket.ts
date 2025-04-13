import { useEffect } from 'react';


// 使用 React 的 useEffect 钩子来监听 WebSocket 消息
export const useMessageListener = (token: string, fn: (param: number) => void) => {
  useEffect(() => {
    let websocket: WebSocket | null = null;
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
            if (message.type === "notify") fn(1);
            else if (message.type === "request_message") fn(2);
            else if (message.type === "delete_friend") fn(3);
            else fn(4);
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