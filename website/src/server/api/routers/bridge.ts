import { addBridgeSchema } from "@/app/schema/add-bridge";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import z from "zod";

// await prisma.$queryRaw`
//   SELECT *
//   FROM (
//     SELECT *, ROW_NUMBER() OVER (ORDER BY id) as rn
//     FROM "YourModelName"
//   ) AS subquery
//   WHERE rn % ${n} = 0;
// `;

export const bridgeRouter = createTRPCRouter({
  addBridge: protectedProcedure
    .input(addBridgeSchema)
    .mutation(async ({ ctx, input }) => {
      const { bridgeName, bridgeId, bridgeSecret } = input;

      const bridge = await ctx.db.bridge.findFirst({
        where: {
          id: bridgeId,
          secretKey: bridgeSecret,
        },
      });

      if (!bridge) throw new Error("Bridge not found");

      if (bridge.userId) throw new Error("Bridge already registered");

      await ctx.db.bridge.update({
        where: {
          id: bridgeId,
        },
        data: {
          name: bridgeName,
          userId: ctx.session.user.id,
        },
      });

      return {
        success: true,
      };
    }),

  bridgeData: protectedProcedure
    .input(
      z.object({
        bridgeId: z.string(),
        timestamp: z.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { bridgeId, timestamp } = input;
      const bridge = await ctx.db.bridge.findFirst({
        where: {
          id: bridgeId,
        },
      });

      if (!bridge) throw new Error("Bridge not found");

      if (bridge.userId !== ctx.session.user.id)
        throw new Error("Unauthorized");

      const records = await ctx.db.records.findMany({
        where: {
          bridgeId: bridgeId,
          createdAt: {
            gte: timestamp,
          },
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          createdAt: true,
          weight: true,
          peakAccel: true,
          rmsAccel: true,
          frequency: true,
          status: true,
        },
        take: 1000,
      });

      return records.map((record) => ({
        ...record,
        createdAt: record.createdAt.toISOString(),
      }));
    }),

  getUserBridges: protectedProcedure.query(async ({ ctx }) => {
    const bridges = await ctx.db.bridge.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return bridges;
  }),
});
