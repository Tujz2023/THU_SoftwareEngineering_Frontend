import Dexie from "dexie";

export interface Conversation {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: string;
  isChatGroup: boolean;
  isTop: boolean;
  noticeAble: boolean;
  unreadCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: string;
}

class ChatDatabase extends Dexie {
  conversations: Dexie.Table<Conversation, string>;
  messages: Dexie.Table<Message, string>;

  constructor() {
    super("ChatDatabase");

    this.version(1).stores({
      conversations: "id, name, lastMessage, lastMessageTime, isChatGroup, isTop, noticeAble, unreadCount",
      messages: "id, conversationId, senderId, content, timestamp",
    });

    this.conversations = this.table("conversations");
    this.messages = this.table("messages");
  }

  async cacheConversations(conversations: Conversation[]) {
    await this.conversations.bulkPut(conversations);
  }

  async cacheMessages(conversationId: string, messages: Message[]) {
    await this.messages.bulkPut(messages);
  }

  async getConversations() {
    return await this.conversations.toArray();
  }

  async getMessages(conversationId: string) {
    return await this.messages.where("conversationId").equals(conversationId).toArray();
  }
}

export default new ChatDatabase();