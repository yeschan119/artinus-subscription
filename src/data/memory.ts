import {
  ChannelType,
  SubscriptionStatus,
  ActionType,
} from "../constants/subscription.js";

export const channels = [
  { id: 1, name: "홈페이지", type: ChannelType.BOTH },
  { id: 2, name: "모바일앱", type: ChannelType.BOTH },
  { id: 3, name: "네이버", type: ChannelType.SUBSCRIBE_ONLY },
  { id: 4, name: "SKT", type: ChannelType.SUBSCRIBE_ONLY },
  { id: 5, name: "콜센터", type: ChannelType.UNSUBSCRIBE_ONLY },
  { id: 6, name: "이메일", type: ChannelType.UNSUBSCRIBE_ONLY },
];

export type Member = {
  phoneNumber: string;
  subscriptionStatus: SubscriptionStatus;
  createdAt: string;
  updatedAt: string;
};

export type History = {
  phoneNumber: string;
  channelId: number;
  action: ActionType;
  fromStatus: SubscriptionStatus;
  toStatus: SubscriptionStatus;
  createdAt: string;
};

export const members = new Map<string, Member>();

export const histories: History[] = [];

export function getMember(phoneNumber: string): Member | undefined {
  return members.get(phoneNumber);
}

export function createMember(phoneNumber: string): Member {
  const member: Member = {
    phoneNumber,
    subscriptionStatus: SubscriptionStatus.NONE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  members.set(phoneNumber, member);
  return member;
}