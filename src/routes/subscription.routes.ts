import { Router } from "express";
import { subscriptionRequestSchema } from "../validators/subscription.validator.js";
import { SubscriptionService } from "../services/subscription.service.js";

const router = Router();
const service = new SubscriptionService();

router.post("/subscribe", async (request, response, next) => {
  try {
    const subscribeDto = subscriptionRequestSchema.parse({
      ...request.body,
      channelId: Number(request.body.channelId)
    });

    const result = await service.subscribe(subscribeDto);

    response.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post("/unsubscribe", async (request, response, next) => {
  try {
    const unsubscribeDto = subscriptionRequestSchema.parse({
      ...request.body,
      channelId: Number(request.body.channelId)
    });

    const result = await service.unsubscribe(unsubscribeDto);

    response.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.get("/members/:phoneNumber", async (request, response, next) => {
  try {
    const result = await service.getMember(request.params.phoneNumber);
    response.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;