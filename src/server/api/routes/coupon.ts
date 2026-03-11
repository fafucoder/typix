import { Hono } from "hono";
import { type Env, ok, unauthorized } from "@/server/api/util";
import { getContext } from "@/server/service/context";
import { coupon, userCoupon } from "@/server/db/schemas";
import { eq, and } from "drizzle-orm";

export const couponRoutes = new Hono<Env>()
  .basePath("/coupons")
  .use(async (c, next) => {
    const user = c.var.user;
    const userId = user?.id;
    if (!userId) {
      return c.json(unauthorized("请先登录"), 401);
    }
    await next();
  })
  .post("/validate", async (c) => {
  const context = getContext();
  const user = c.var.user;
  const userId = user?.id;
  const { db } = context;

  const { code, orderId } = await c.req.json();

  if (!code) {
    return c.json({ code: "error", message: "请输入优惠券码" });
  }

  // 查询优惠券
  const couponResult = await db
    .select()
    .from(coupon)
    .where(eq(coupon.code, code.toUpperCase()))
    .limit(1);

  if (couponResult.length === 0) {
    return c.json({ code: "error", message: "优惠券不存在" });
  }

  const couponData = couponResult[0];

  // 检查优惠券状态
  if (couponData.status !== "active") {
    return c.json({ code: "error", message: "优惠券已失效" });
  }

  // 检查时间
  const now = new Date();
  if (couponData.startAt && new Date(couponData.startAt) > now) {
    return c.json({ code: "error", message: "优惠券尚未生效" });
  }
  if (couponData.endAt && new Date(couponData.endAt) < now) {
    return c.json({ code: "error", message: "优惠券已过期" });
  }

  // 检查使用次数
  if (couponData.usageLimit > 0 && couponData.usageCount >= couponData.usageLimit) {
    return c.json({ code: "error", message: "优惠券已使用完毕" });
  }

  // 检查用户使用次数
  const userCouponResult = await db
    .select({
      id: userCoupon.id,
      userId: userCoupon.userId,
      couponId: userCoupon.couponId,
      status: userCoupon.status,
    })
    .from(userCoupon)
    .where(
      and(
        eq(userCoupon.userId, userId),
        eq(userCoupon.couponId, couponData.id)
      )
    );

  // 统计用户已使用的优惠券数量
  const usedCount = userCouponResult.filter(uc => uc.status === 'used').length;
  if (couponData.perUserLimit > 0 && usedCount >= couponData.perUserLimit) {
    return c.json({ code: "error", message: "您已使用过此优惠券" });
  }

  // 验证通过，返回优惠券信息
  return c.json({
    code: "ok",
    data: {
      id: couponData.id,
      code: couponData.code,
      name: couponData.name,
      type: couponData.type,
      value: couponData.value,
      minOrderAmount: couponData.minOrderAmount,
      maxDiscountAmount: couponData.maxDiscountAmount,
    },
  });
});
