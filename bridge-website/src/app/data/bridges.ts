import { auth } from "@/server/better-auth";
import { db } from "@/server/db";
import { headers } from "next/headers";

export async function getUserBridges(take = 10) {
  const userSession = await auth.api.getSession({
    headers: await headers(),
  });

  if (!userSession) {
    return [];
  }

  const bridges = await db.bridge.findMany({
    where: {
      userId: userSession.user.id,
    },
    include: {
      Records: {
        orderBy: {
          createdAt: "desc",
        },
        take: take,
      },
    },
  });

  return bridges;
}
