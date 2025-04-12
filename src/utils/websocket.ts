import { useEffect } from 'react';


// 使用 React 的 useEffect 钩子来监听 WebSocket 消息
export const useMessageListener = (token: string) => {
  useEffect(() => {
    let websocket: WebSocket | null = null;
    let isClosedManually = false;

    // 建立 WebSocket 连接
    const initializeWebSocket = () => {
      const wsUrl = `https://backend-eyjhbgci.app.spring25b.secoder.net/?token=${token}`.replace("https://", "ws://");
      websocket = new WebSocket(wsUrl);

      // WebSocket 连接成功
      websocket.onopen = () => {
        console.log("WebSocket 已连接");
      };

      // 接收 WebSocket 消息
      websocket.onmessage = async (event) => {
        if (event.data) {
          try {
            const message = JSON.parse(event.data);
            if (message.type === "notify") {
              //onNotify();
            }
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
  }, [token]);
};