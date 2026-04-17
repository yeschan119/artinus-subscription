export enum SubscriptionStatus {
  NONE = "NONE",
  BASIC = "BASIC",
  PREMIUM = "PREMIUM",
}

export enum ChannelType {
  BOTH = "BOTH",
  SUBSCRIBE_ONLY = "SUBSCRIBE_ONLY",
  UNSUBSCRIBE_ONLY = "UNSUBSCRIBE_ONLY",
}

export enum ActionType {
  SUBSCRIBE = "SUBSCRIBE",
  UNSUBSCRIBE = "UNSUBSCRIBE",
}

export const SUBSCRIBE_TRANSITIONS: Record<
    SubscriptionStatus,
    readonly SubscriptionStatus[]
  > = {
    [SubscriptionStatus.NONE]: [
      SubscriptionStatus.BASIC,
      SubscriptionStatus.PREMIUM,
    ],
    [SubscriptionStatus.BASIC]: [SubscriptionStatus.PREMIUM],
    [SubscriptionStatus.PREMIUM]: [],
};

export const UNSUBSCRIBE_TRANSITIONS: Record<
    SubscriptionStatus,
    readonly SubscriptionStatus[]
  > = {
  [SubscriptionStatus.NONE]: [],
  [SubscriptionStatus.BASIC]: [SubscriptionStatus.NONE],
  [SubscriptionStatus.PREMIUM]: [
    SubscriptionStatus.BASIC,
    SubscriptionStatus.NONE,
  ],
};