import { db } from "@/server/db";

export async function GET() {
  return new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        let running = true;

        while (running) {
          try {
            const weight = Math.floor(Math.random() * 301) + 100;

            await db.records.create({
              data: {
                bridgeId: "cmncwvehk0000kxhogldfmffq",
                weight,
              },
            });

            controller.enqueue(encoder.encode(`Added weight: ${weight}\n`));

            await new Promise((resolve) => setTimeout(resolve, 3000));
          } catch (error) {
            controller.enqueue(encoder.encode(`Error: ${String(error)}\n`));
            running = false;
          }
        }

        controller.close();
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    },
  );
}
