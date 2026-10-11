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

            const peakAccel = Number((Math.random() * 0.08).toFixed(3));
            const rmsAccel = Number((peakAccel * 0.707).toFixed(3));
            const frequency = Number((Math.random() * 12 + 1).toFixed(2));
            const status =
              weight > 150 || rmsAccel > 0.15
                ? "DANGER"
                : weight > 130 || rmsAccel > 0.08
                  ? "WARNING"
                  : "SAFE";

            await db.records.create({
              data: {
                bridgeId: "cmncwvehk0000kxhogldfmffq",
                weight,
                peakAccel,
                rmsAccel,
                frequency,
                status,
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
