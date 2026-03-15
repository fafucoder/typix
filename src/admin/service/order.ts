import { eq, like, or, desc, and, gte, lte } from "drizzle-orm";
import { order, OrderStatus } from "@/admin/db/schemas/order";
import { user } from "@/admin/db/schemas/auth";
import { subscribe } from "@/admin/db/schemas/admin";
import { userCoupon } from "@/admin/db/schemas/admin";
import { coupon } from "@/admin/db/schemas/admin";
import { getContext } from "./context";

export interface Order {
  id: string;
  userId: string;
  subscribeId: string;
  orderNo: string;
  type: string;
  totalAmount: number;
  discountAmount: number;
  actualAmount: number;
  currency: string;
  couponId: string | null;
  status: OrderStatus;
  remark: string | null;
  expiresAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  subscribe?: {
    id: string;
    name: string;
  };
  coupon?: {
    id: string;
    code: string;
  };
}

export interface OrderListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  userName?: string;
}

export interface OrderListResult {
  orders: Order[];
  total: number;
  page: number;
  pageSize: number;
}

interface GetOrdersResult {
  success: boolean;
  data?: OrderListResult;
  error?: string;
}

interface GetOrderByIdResult {
  success: boolean;
  order?: Order;
  error?: string;
}

interface CancelOrderResult {
  success: boolean;
  error?: string;
}

interface RefundOrderResult {
  success: boolean;
  error?: string;
}

const getOrders = async (params: OrderListParams): Promise<GetOrdersResult> => {
  const { db } = getContext();
  const { page = 1, pageSize = 20, search, status, userName } = params;

  try {
    const offset = (page - 1) * pageSize;

    // 如果有用户名筛选，先查询匹配的用户ID
    let userIds: string[] = [];
    if (userName) {
      const users = await db
        .select({ id: user.id })
        .from(user)
        .where(like(user.name, `%${userName}%`));
      userIds = users.map(u => u.id);
      if (userIds.length === 0) {
        // 没有匹配的用户，返回空结果
        return {
          success: true,
          data: {
            orders: [],
            total: 0,
            page,
            pageSize,
          },
        };
      }
    }

    const conditions = [];
    if (status && status !== "all") {
      conditions.push(eq(order.status, status as OrderStatus));
    }
    if (userIds.length > 0) {
      // 使用 IN 查询匹配多个用户ID
      conditions.push(or(...userIds.map(id => eq(order.userId, id))));
    }
    if (search) {
      conditions.push(
        or(
          like(order.orderNo, `%${search}%`),
          like(order.remark, `%${search}%`)
        )
      );
    }

    // 首先查询订单基本信息
    const orderResults = await db
      .select({
        id: order.id,
        userId: order.userId,
        subscribeId: order.subscribeId,
        orderNo: order.orderNo,
        type: order.type,
        totalAmount: order.totalAmount,
        discountAmount: order.discountAmount,
        actualAmount: order.actualAmount,
        currency: order.currency,
        couponId: order.couponId,
        status: order.status,
        remark: order.remark,
        expiresAt: order.expiresAt,
        cancelledAt: order.cancelledAt,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        deletedAt: order.deletedAt,
      })
      .from(order)
      .where(and(...conditions))
      .orderBy(desc(order.createdAt))
      .limit(pageSize)
      .offset(offset);

    // 计算总数
    const total = await db
      .select({ count: order.id })
      .from(order)
      .where(and(...conditions))
      .then((res) => res.length);

    // 获取所有相关的用户ID和套餐ID
    const relatedUserIds = [...new Set(orderResults.map(o => o.userId))];
    const subscribeIds = [...new Set(orderResults.map(o => o.subscribeId))];

    // 分别查询用户信息和套餐信息
    const usersResult = relatedUserIds.length > 0 
      ? await db.select({ id: user.id, name: user.name, email: user.email }).from(user).where(eq(user.id, relatedUserIds[0]))
      : [];
    
    const subscribesResult = subscribeIds.length > 0 
      ? await db.select({ id: subscribe.id, name: subscribe.name }).from(subscribe).where(eq(subscribe.id, subscribeIds[0]))
      : [];

    // 创建用户和套餐的映射
    const userMap = new Map(usersResult.map(u => [u.id, u]));
    const subscribeMap = new Map(subscribesResult.map(s => [s.id, s]));

    // 对于剩余的用户和套餐，逐一查询
    for (let i = 1; i < relatedUserIds.length; i++) {
      const u = await db.select({ id: user.id, name: user.name, email: user.email }).from(user).where(eq(user.id, relatedUserIds[i])).limit(1);
      if (u.length > 0) userMap.set(u[0].id, u[0]);
    }
    
    for (let i = 1; i < subscribeIds.length; i++) {
      const s = await db.select({ id: subscribe.id, name: subscribe.name }).from(subscribe).where(eq(subscribe.id, subscribeIds[i])).limit(1);
      if (s.length > 0) subscribeMap.set(s[0].id, s[0]);
    }

    // 格式化订单数据并合并用户和套餐信息
    const formattedOrders = orderResults.map((row) => ({
      id: row.id,
      userId: row.userId,
      subscribeId: row.subscribeId,
      orderNo: row.orderNo,
      type: row.type,
      totalAmount: row.totalAmount,
      discountAmount: row.discountAmount,
      actualAmount: row.actualAmount,
      currency: row.currency,
      couponId: row.couponId,
      status: row.status,
      remark: row.remark,
      expiresAt: row.expiresAt?.toISOString() || null,
      cancelledAt: row.cancelledAt?.toISOString() || null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      deletedAt: row.deletedAt?.toISOString() || null,
      user: userMap.get(row.userId),
      subscribe: subscribeMap.get(row.subscribeId),
      coupon: undefined,
    }));

    return {
      success: true,
      data: {
        orders: formattedOrders,
        total,
        page,
        pageSize,
      },
    };
  } catch (error) {
    console.error("Get orders error:", error);
    return {
      success: false,
      error: "Failed to get orders",
    };
  }
};

const getOrderById = async (id: string): Promise<GetOrderByIdResult> => {
  const { db } = getContext();

  try {
    const orderResult = await db
      .select({
        id: order.id,
        userId: order.userId,
        subscribeId: order.subscribeId,
        orderNo: order.orderNo,
        type: order.type,
        totalAmount: order.totalAmount,
        discountAmount: order.discountAmount,
        actualAmount: order.actualAmount,
        currency: order.currency,
        couponId: order.couponId,
        status: order.status,
        remark: order.remark,
        expiresAt: order.expiresAt,
        cancelledAt: order.cancelledAt,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        deletedAt: order.deletedAt,
      })
      .from(order)
      .where(eq(order.id, id))
      .limit(1);

    if (orderResult.length === 0) {
      return {
        success: false,
        error: "Order not found",
      };
    }

    const row = orderResult[0];
    
    // 查询用户信息
    const userResult = await db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .where(eq(user.id, row.userId))
      .limit(1);
    
    // 查询套餐信息
    const subscribeResult = await db
      .select({ id: subscribe.id, name: subscribe.name })
      .from(subscribe)
      .where(eq(subscribe.id, row.subscribeId))
      .limit(1);

    const formattedOrder: Order = {
      id: row.id,
      userId: row.userId,
      subscribeId: row.subscribeId,
      orderNo: row.orderNo,
      type: row.type,
      totalAmount: row.totalAmount,
      discountAmount: row.discountAmount,
      actualAmount: row.actualAmount,
      currency: row.currency,
      couponId: row.couponId,
      status: row.status,
      remark: row.remark,
      expiresAt: row.expiresAt?.toISOString() || null,
      cancelledAt: row.cancelledAt?.toISOString() || null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      deletedAt: row.deletedAt?.toISOString() || null,
      user: userResult.length > 0 ? userResult[0] : undefined,
      subscribe: subscribeResult.length > 0 ? subscribeResult[0] : undefined,
      coupon: undefined,
    };

    return {
      success: true,
      order: formattedOrder,
    };
  } catch (error) {
    console.error("Get order by id error:", error);
    return {
      success: false,
      error: "Failed to get order",
    };
  }
};

const cancelOrder = async (id: string): Promise<CancelOrderResult> => {
  const { db } = getContext();

  try {
    const orderResult = await db
      .select({ status: order.status })
      .from(order)
      .where(eq(order.id, id))
      .limit(1);

    if (orderResult.length === 0) {
      return {
        success: false,
        error: "Order not found",
      };
    }

    const currentOrder = orderResult[0];
    if (currentOrder.status !== "pending") {
      return {
        success: false,
        error: "Only pending orders can be cancelled",
      };
    }

    await db
      .update(order)
      .set({
        status: "cancelled" as OrderStatus,
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(order.id, id));

    return {
      success: true,
    };
  } catch (error) {
    console.error("Cancel order error:", error);
    return {
      success: false,
      error: "Failed to cancel order",
    };
  }
};

const refundOrder = async (id: string, refundAmount: number, refundReason: string): Promise<RefundOrderResult> => {
  const { db } = getContext();

  try {
    const orderResult = await db
      .select({ status: order.status, actualAmount: order.actualAmount })
      .from(order)
      .where(eq(order.id, id))
      .limit(1);

    if (orderResult.length === 0) {
      return {
        success: false,
        error: "Order not found",
      };
    }

    const currentOrder = orderResult[0];
    if (currentOrder.status !== "paid") {
      return {
        success: false,
        error: "Only paid orders can be refunded",
      };
    }

    if (refundAmount > currentOrder.actualAmount) {
      return {
        success: false,
        error: "Refund amount cannot exceed actual payment amount",
      };
    }

    await db
      .update(order)
      .set({
        status: "refunded" as OrderStatus,
        updatedAt: new Date(),
      })
      .where(eq(order.id, id));

    return {
      success: true,
    };
  } catch (error) {
    console.error("Refund order error:", error);
    return {
      success: false,
      error: "Failed to refund order",
    };
  }
};

export class OrderService {
  getOrders = getOrders;
  getOrderById = getOrderById;
  cancelOrder = cancelOrder;
  refundOrder = refundOrder;
}

export const orderService = new OrderService();
export type OrderServiceType = typeof orderService;