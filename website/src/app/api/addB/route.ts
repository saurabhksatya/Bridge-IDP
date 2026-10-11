import { db } from "@/server/db";

export async function GET() {
  await db.bridge.create({
    data: {
      name: "Test",
    },
  });

  return new Response("Bridge added");
}
