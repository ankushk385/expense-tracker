import type { Conversation, Message } from "@shared/schema";

export interface IChatStorage {
  getConversation(id: number): Promise<Conversation | undefined>;
  getAllConversations(): Promise<Conversation[]>;
  createConversation(title: string): Promise<Conversation>;
  deleteConversation(id: number): Promise<void>;
  getMessagesByConversation(conversationId: number): Promise<Message[]>;
  createMessage(conversationId: number, role: string, content: string): Promise<Message>;
}

const conversations = new Map<number, Conversation>();
const messages = new Map<number, Message>();
let nextConversationId = 1;
let nextMessageId = 1;

export const chatStorage: IChatStorage = {
  async getConversation(id: number) {
    return conversations.get(id);
  },

  async getAllConversations() {
    return [...conversations.values()].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  },

  async createConversation(title: string) {
    const conversation: Conversation = {
      id: nextConversationId++,
      title,
      createdAt: new Date(),
    };
    conversations.set(conversation.id, conversation);
    return conversation;
  },

  async deleteConversation(id: number) {
    conversations.delete(id);
    for (const [messageId, message] of messages) {
      if (message.conversationId === id) messages.delete(messageId);
    }
  },

  async getMessagesByConversation(conversationId: number) {
    return [...messages.values()]
      .filter((message) => message.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  },

  async createMessage(conversationId: number, role: string, content: string) {
    const message: Message = {
      id: nextMessageId++,
      conversationId,
      role,
      content,
      createdAt: new Date(),
    };
    messages.set(message.id, message);
    return message;
  },
};

