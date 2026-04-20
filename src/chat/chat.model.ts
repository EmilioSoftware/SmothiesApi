import { Schema, model } from 'mongoose';

export type ChatSender = 'admin' | 'client';

export interface ChatMessageDocument {
  id: string;
  sender: ChatSender;
  body: string;
  timestamp: string;
  createdAt: Date;
}

export interface ChatThreadDocument {
  threadKey: string;
  clientId: string;
  orderId?: string;
  messages: ChatMessageDocument[];
  createdAt: Date;
  updatedAt: Date;
}

const chatMessageSchema = new Schema<ChatMessageDocument>(
  {
    id: { type: String, required: true },
    sender: { type: String, enum: ['admin', 'client'], required: true },
    body: { type: String, required: true, trim: true },
    timestamp: { type: String, required: true },
    createdAt: { type: Date, required: true }
  },
  { _id: false }
);

const chatThreadSchema = new Schema<ChatThreadDocument>(
  {
    threadKey: { type: String, required: true, unique: true, index: true },
    clientId: { type: String, required: true, index: true },
    orderId: { type: String },
    messages: { type: [chatMessageSchema], default: [] }
  },
  { timestamps: true, versionKey: false }
);

export const ChatThreadModel = model<ChatThreadDocument>('ChatThread', chatThreadSchema);
