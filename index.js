
import "dotenv/config";

import app from "./server.js";

import {
  initializeDatabase,
  pool
} from "./database/pool.js";

import {
  loadCommands
} from "./handler.js";

import {
  restoreSessions,
  shutdownSockets
} from "./services/sessionManager.js";

const PORT = Number(process.env.PORT || 3000);

let httpServer;
let shuttingDown = false;

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

async function start() {
  try {
    console.log(`
☠️ 𝐓𝐇𝐄 𝐏𝐀𝐈𝐍 𝐌𝐃 ☠️
🩸 MULTI-SESSION BACKEND
`);

    // 1. DATABASE
    console.log("⏳ Initialisation PostgreSQL...");

    await initializeDatabase();

    console.log("✅ PostgreSQL prêt.");

    // 2. COMMANDS
    console.log("⏳ Chargement des commandes...");

    const commandCount = await loadCommands();

    console.log(`✅ ${commandCount} commandes chargées.`);

    // 3. RESTORE WHATSAPP SESSIONS
    console.log("⏳ Restauration des sessions WhatsApp...");

    await restoreSessions();

    console.log("✅ Sessions restaurées.");

    // 4. START HTTP SERVER
    httpServer = app.listen(PORT, "0.0.0.0", () => {
      console.log(`
╭────────────────────────────╮
│  ☠️ THE PAIN MD API        │
│                            │
│  🚀 Serveur démarré        │
│  🌐 Port : ${PORT}
│  🩸 Multi-session : ACTIVE │
│  📦 Commandes : ${commandCount}
╰────────────────────────────╯
`);
    });

    httpServer.on("error", error => {
      console.error("❌ Erreur serveur HTTP :", error);
      shutdown("HTTP_ERROR", 1);
    });

  } catch (error) {
    console.error("❌ Erreur au démarrage :", error);

    await shutdown("STARTUP_ERROR", 1);
  }
}

// --------------------------------------------------
// GRACEFUL SHUTDOWN
// --------------------------------------------------

async function shutdown(signal, exitCode = 0) {
  if (shuttingDown) return;

  shuttingDown = true;

  console.log(`⏳ Arrêt demandé : ${signal}`);

  try {
    // Stop accepting new HTTP requests.
    if (httpServer) {
      await new Promise(resolve => {
        httpServer.close(resolve);
      });
    }

    // Stop WhatsApp sockets without deleting credentials.
    await shutdownSockets();

    // Close PostgreSQL connection pool.
    await pool.end();

    console.log(
      "✅ Arrêt terminé. Authentifications conservées."
    );

  } catch (error) {
    console.error("❌ Erreur pendant l'arrêt :", error);
    exitCode = 1;
  }

  process.exit(exitCode);
}

// --------------------------------------------------
// PROCESS SIGNALS
// --------------------------------------------------

process.on("SIGTERM", () => {
  shutdown("SIGTERM", 0);
});

process.on("SIGINT", () => {
  shutdown("SIGINT", 0);
});

process.on("uncaughtException", error => {
  console.error("❌ Erreur fatale :", error);

  shutdown("UNCAUGHT_EXCEPTION", 1);
});

process.on("unhandledRejection", error => {
  console.error("❌ Promesse rejetée :", error);
});

// --------------------------------------------------
// BOOT
// --------------------------------------------------

start();
