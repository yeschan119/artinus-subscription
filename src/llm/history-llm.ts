import type { History } from "../data/memory.js";

type HistoryLLMResponse = {
    success: boolean;
    summary: string;
};

class HistoryLLM {
    private readonly endpoint =
        "https://artinus-llm.onrender.com/histories";

    private async postHistories(
        histories: unknown,
        timeoutMs = 5000
    ): Promise<Response> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
        return await fetch(this.endpoint, {
            method: "POST",
            headers: {
            "Content-Type": "application/json"
            },
            body: JSON.stringify({ histories }),
            signal: controller.signal
        });
        } finally {
        clearTimeout(timer);
        }
    }

    async warmUp(): Promise<void> {
        try {
            const res = await this.postHistories(
                [
                {
                    phoneNumber: "warmup",
                    channelId: 0,
                    action: "SUBSCRIBE",
                    fromStatus: "NONE",
                    toStatus: "BASIC",
                    createdAt: new Date().toISOString()
                }
                ],
                4000
            );

            if (!res.ok) {
                console.warn(`[HistoryLLM] warm-up failed: ${res.status}`);
                return;
            }

            console.log("[HistoryLLM] warm-up completed");
        } catch (error) {
            console.warn("[HistoryLLM] warm-up skipped");
        }
    }

    async getHistoryLLM(histories: History[]): Promise<string> {
        if (!histories.length) {
            return "구독 이력이 없습니다.";
        }

        try {
            const res = await this.postHistories(histories, 8000);

            if (!res.ok) {
                throw new Error(`History LLM API failed: ${res.status}`);
            }

            const data = (await res.json()) as HistoryLLMResponse;

            return data.summary ?? "이력 요약 생성 실패";
        } catch {
            const latest = histories
                .slice()
                .sort(
                (a, b) =>
                    new Date(a.createdAt).getTime() -
                    new Date(b.createdAt).getTime()
                )
                .at(-1);

            return latest
                ? `총 ${histories.length}건의 구독 변경 이력이 있으며, 현재 최종 상태는 ${latest.toStatus}입니다.`
                : "이력 요약 생성 실패";
        }
    }
}

const historyLLM = new HistoryLLM();
export default historyLLM;