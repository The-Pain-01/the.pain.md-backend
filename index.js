
import "dotenv/config";

import app from "./server.js";

import {
  initializeDatabase,
  pool
} from "./database/pool.js";

import {
  restoreSessions,
  shutdownSockets
} from "./services/sessionManager.js";

const PORT = Number(process.env.PORT || 3000);

let httpServer;
let shuttingDown = false;

async function start() {
  try {
    console.log(`
☠️ 𝐓𝐇𝐄 𝐏𝐀𝐈𝐍 𝐌𝐃 ☠️
🩸 MULTI-SESSION BACKEND
`);

    console.log("⏳ Initialisation PostgreSQL...");

    await initializeDatabase();

    console.log("✅ PostgreSQL prêt.");

    console.log("⏳ Restauration des sessions WhatsApp...");

    await restoreSessions();

    console.log("✅ Sessions restaurées.");

    httpServer = app.listen(PORT, "0.0.0.0", () => {
      console.log(`
╭────────────────────────────╮
│  ☠️ THE PAIN MD API        │
│                            │
│  🚀 Serveur démarré        │
│  🌐 Port : ${PORT}           
│  🩸 Multi-session : ACTIVE │
╰────────────────────────────╯
`);
    });

  } catch (error) {
    console.error("❌ Erreur au démarrage :", error);
    process.exit(1);
  }
}

async function shutdown(signal) {
  if (shuttingDown) return;

  shuttingDown = true;

  console.log(`⏳ Arrêt demandé : ${signal}`);

  try {
    if (httpServer) {
      await new Promise(resolve => {
        httpServer.close(resolve);
      });
    }

    await shutdownSockets();

    await pool.end();

    console.log("✅ Arrêt terminé. Authentifications conservées.");

    process.exit(0);

  } catch (error) {
    console.error("❌ Erreur pendant l'arrêt :", error);
    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("uncaughtException", error => {
  console.error("❌ Erreur fatale :", error);
  shutdown("uncaughtException");
});

process.on("unhandledRejection", error => {
  console.error("❌ Promesse rejetée :", error);
});

start();
