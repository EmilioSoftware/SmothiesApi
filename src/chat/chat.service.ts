import { HydratedDocument } from 'mongoose';

import { HttpError } from '../shared/http-error';
import { requiredText } from '../shared/validation';
import { ChatMessageDocument, ChatSender, ChatThreadDocument, ChatThreadModel } from './chat.model';

export interface ChatMessageDto {
  id: string;
  sender: ChatSender;
  body: string;
  timestamp: string;
  createdAt: string;
}

export interface ChatThreadDto {
  threadKey: string;
  clientId: string;
  orderId?: string;
  messages: ChatMessageDto[];
  lastMessage?: ChatMessageDto;
  updatedAt: string;
}

export async function getClientThread(clientId: string, orderId?: string): Promise<ChatThreadDto> {
  const thread = await findOrCreateThread(clientId, orderId);
  return toThreadDto(thread);
}

export async function listAdminThreads(): Promise<ChatThreadDto[]> {
  const threads = await ChatThreadModel.find({}).sort({ updatedAt: -1 }).limit(60);
  return threads.map((thread) => toThreadDto(thread));
}

export async function createChatMessage(input: {
  clientId: string;
  orderId?: string;
  sender: ChatSender;
  body: unknown;
}): Promise<ChatThreadDto> {
  const body = requiredText(input.body, 'body', 600);
  const thread = await findOrCreateThread(input.clientId, input.orderId);
  const now = new Date();

  thread.messages.push({
    id: `message-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    sender: input.sender,
    body,
    timestamp: input.sender === 'admin' ? 'Admin' : 'Tu',
    createdAt: now
  });

  await thread.save();
  return toThreadDto(thread);
}

export function resolveThreadKey(clientId: string, orderId?: string): string {
  return orderId ? `${clientId}:${orderId}` : clientId;
}

async function findOrCreateThread(clientId: string, orderId?: string): Promise<HydratedDocument<ChatThreadDocument>> {
  const normalizedClientId = clientId.trim();

  if (!normalizedClientId) {
    throw new HttpError(400, 'clientId es requerido.');
  }

  const normalizedOrderId = orderId?.trim() || undefined;

  return ChatThreadModel.findOneAndUpdate(
    { threadKey: resolveThreadKey(normalizedClientId, normalizedOrderId) },
    {
      $setOnInsert: {
        threadKey: resolveThreadKey(normalizedClientId, normalizedOrderId),
        clientId: normalizedClientId,
        orderId: normalizedOrderId,
        messages: []
      }
    },
    { upsert: true, new: true }
  );
}

function toThreadDto(thread: ChatThreadDocument): ChatThreadDto {
  const messages = thread.messages.map(toMessageDto);

  return {
    threadKey: thread.threadKey,
    clientId: thread.clientId,
    orderId: thread.orderId,
    messages,
    lastMessage: messages[messages.length - 1],
    updatedAt: thread.updatedAt.toISOString()
  };
}

function toMessageDto(message: ChatMessageDocument): ChatMessageDto {
  return {
    id: message.id,
    sender: message.sender,
    body: message.body,
    timestamp: message.timestamp,
    createdAt: message.createdAt.toISOString()
  };
}
