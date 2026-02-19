import type { Party, PartyKitServer, Connection } from "partykit/server";

export default {
  onConnect(_conn: Connection, _room: Party) {
    // Client connected — no welcome message needed
  },

  onMessage(message: string | ArrayBuffer | ArrayBufferView, sender: Connection, room: Party) {
    // Broadcast to all OTHER clients in the room
    const msg = typeof message === "string" ? message : new TextDecoder().decode(message as ArrayBuffer);
    room.broadcast(msg, [sender.id]);
  },

  async onRequest(req: Request, room: Party) {
    // HTTP POST from our API routes → broadcast to all connected clients
    if (req.method === "POST") {
      const body = await req.text();
      room.broadcast(body);
      return new Response("ok", { status: 200 });
    }

    return new Response("Method not allowed", { status: 405 });
  },
} satisfies PartyKitServer;
