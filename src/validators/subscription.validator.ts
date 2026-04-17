import { z } from "zod";
import { SubscriptionStatus } from "../constants/subscription.js";

export const subscriptionRequestSchema = z.object({
    phoneNumber: z.string().min(1),
    channelId: z.number().int(),
    targetStatus: z.nativeEnum(SubscriptionStatus)
});