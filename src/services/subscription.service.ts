import createHttpError from "http-errors";
import historyLLM from "../llm/history-llm.js";

import {
  SubscriptionStatus,
  ChannelType,
  ActionType,
  SUBSCRIBE_TRANSITIONS,
  UNSUBSCRIBE_TRANSITIONS
} from "../constants/subscription.js";

import {
  channels,
  histories,
  getMember,
  createMember
} from "../data/memory.js";

import { CsrngService } from "./csrng.service.js";

type SubscribeDto = {
  phoneNumber: string;
  channelId: number;
  targetStatus: SubscriptionStatus;
};

export class SubscriptionService {
  csrng = new CsrngService();

  async subscribe({ phoneNumber, channelId, targetStatus }: SubscribeDto) {
    const channel = channels.find(c => c.id === channelId);
    let current = SubscriptionStatus.NONE;

    if (!channel) throw createHttpError(404, "채널 없음");

    if (
      ![
        ChannelType.BOTH,
        ChannelType.SUBSCRIBE_ONLY
      ].includes(channel.type)
    ) {
      throw createHttpError(400, "구독 불가능 채널");
    }

    let member = getMember(phoneNumber);
    if (member) {
      current = member.subscriptionStatus;
      const allowedStatuses = SUBSCRIBE_TRANSITIONS[current];

      if (!allowedStatuses.includes(targetStatus)) {
        throw createHttpError(
          400,
          this.createInvalidTransitionMessage(
            "subscribe",
            current,
            targetStatus,
            allowedStatuses
          )
        );
      }
    } else {
      member = createMember(phoneNumber);
      current = member.subscriptionStatus;
    }

    const random = await this.callExternalApiWithRetry();

    if (random === 0) {
      throw createHttpError(
        409,
        "외부 API 장애로 인해 재시도 후 트랜잭션이 롤백되었습니다."
      );
    }

    member.subscriptionStatus = targetStatus;
    member.updatedAt = new Date().toISOString();

    histories.push({
      phoneNumber,
      channelId,
      action: ActionType.SUBSCRIBE,
      fromStatus: current,
      toStatus: targetStatus,
      createdAt: new Date().toISOString()
    });

    return member;
  }

  async unsubscribe({ phoneNumber, channelId, targetStatus }: SubscribeDto) {
    const channel = channels.find(c => c.id === channelId);

    if (!channel) throw createHttpError(404, "채널 없음");

    if (
      ![
        ChannelType.BOTH,
        ChannelType.UNSUBSCRIBE_ONLY
      ].includes(channel.type)
    ) {
      throw createHttpError(400, "해지 불가능 채널");
    }

    const member = getMember(phoneNumber);
    if (!member) throw createHttpError(404, "회원 없음");

    const current = member.subscriptionStatus;
    const allowedStatuses = UNSUBSCRIBE_TRANSITIONS[current];

    if (!allowedStatuses.includes(targetStatus)) {
      throw createHttpError(
        400,
        this.createInvalidTransitionMessage(
          "unsubscribe",
          current,
          targetStatus,
          allowedStatuses
        )
      );
    }

    const random = await this.callExternalApiWithRetry();

    if (random === 0) {
      throw createHttpError(
        409,
        "외부 API 장애로 인해 재시도 후 트랜잭션이 롤백되었습니다."
      );
    }

    member.subscriptionStatus = targetStatus;
    member.updatedAt = new Date().toISOString();

    histories.push({
      phoneNumber,
      channelId,
      action: ActionType.UNSUBSCRIBE,
      fromStatus: current,
      toStatus: targetStatus,
      createdAt: new Date().toISOString()
    });

    return member;
  }

  private getStatusLabel(status: SubscriptionStatus): string {
    switch (status) {
      case SubscriptionStatus.NONE:
        return "구독 안함";
      case SubscriptionStatus.BASIC:
        return "일반 구독";
      case SubscriptionStatus.PREMIUM:
        return "프리미엄 구독";
      default:
        return status;
    }
  }

  private getAllowedStatusesText(
    allowedStatuses: readonly SubscriptionStatus[]
  ): string {
    if (allowedStatuses.length === 0) {
      return "없음";
    }

    return allowedStatuses
      .map(status => this.getStatusLabel(status))
      .join(", ");
  }

  private createInvalidTransitionMessage(
    action: "subscribe" | "unsubscribe",
    current: SubscriptionStatus,
    target: SubscriptionStatus,
    allowedStatuses: readonly SubscriptionStatus[]
  ): string {
    const currentLabel = this.getStatusLabel(current);
    const targetLabel = this.getStatusLabel(target);
    const allowedText = this.getAllowedStatusesText(allowedStatuses);

    if (action === "subscribe") {
      if (allowedStatuses.length === 0) {
        return `현재 상태가 ${currentLabel}이므로 구독 API로는 더 이상 변경할 수 없습니다. 요청한 상태는 ${targetLabel}입니다.`;
      }

      return `현재 상태가 ${currentLabel}이므로 구독 API로 ${targetLabel} 상태로 변경할 수 없습니다. 현재 상태에서 구독 API로 변경 가능한 상태는 ${allowedText}입니다.`;
    }

    if (allowedStatuses.length === 0) {
      return `현재 상태가 ${currentLabel}이므로 해지 API로는 변경할 수 없습니다. 요청한 상태는 ${targetLabel}입니다.`;
    }

    return `현재 상태가 ${currentLabel}이므로 해지 API로 ${targetLabel} 상태로 변경할 수 없습니다. 현재 상태에서 해지 API로 변경 가능한 상태는 ${allowedText}입니다.`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    ms: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error("External API timeout")), ms)
      )
    ]);
  }

  private async callExternalApiWithRetry(): Promise<number> {
    const maxRetries = 3;
    const timeoutMs = 3000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.withTimeout(
          this.csrng.getRandomCommitFlag(),
          timeoutMs
        );

        if (result === 1) {
          return 1;
        }
      } catch (error) {
        console.warn(
          `외부 API timeout/failure - attempt ${attempt}/${maxRetries}`
        );
      }

      if (attempt < maxRetries) {
        const delay = Math.min(300 * attempt, 1000);
        await this.sleep(delay);
      }
    }

    return 0;
  }

  async getMemberInfo(phoneNumber: string) {
    const member = getMember(phoneNumber);
    if (!member) throw createHttpError(404, "회원 없음");

    const memberHistories = histories.filter(
      h => h.phoneNumber === phoneNumber
    );

    const summary = await historyLLM.getHistoryLLM(memberHistories);

    return {
      member,
      history: memberHistories,
      summary: summary
        .split("\n")
        .map(line => line.trim())
        .filter(Boolean)
    };
  }
}