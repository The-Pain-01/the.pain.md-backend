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


const PORT =
  Number(process.env.PORT || 3000);


async function start() {

  /*
   * DATABASE
   */

  await initializeDatabase();

  console.log(
    "✅ PostgreSQL schema ready"
  );


  /*
   * COMMANDS
   */

  const count =
    await loadCommands();

  console.log(
    `📦 ${count} THE PAIN MD commands loaded`
  );


  /*
   * RESTORE ACTIVE WHATSAPP SESSIONS
   */

  await restoreSessions();


  /*
   * HTTP SERVER
   */

  const server = app.listen(
    PORT,
    "0.0.0.0",
    () => {

      console.log(`
☠️ 𝐓𝐇𝐄 𝐏𝐀𝐈𝐍 𝐌𝐃 ☠️

🚀 BACKEND ONLINE

🌐 PORT: ${PORT}

🗄️ POSTGRESQL: CONNECTED

🔐 SESSION STORAGE: ACTIVE

🩸 PAIN SYSTEM: READY
`);

    }
  );


  /*
   * GRACEFUL SHUTDOWN
   *
   * Important:
   * We close sockets without WhatsApp logout.
   * PostgreSQL authentication data stays intact.
   */

  let closing = false;


  async function shutdown(signal) {

    if (closing) return;

    closing = true;


    console.log(
      `[${signal}] Stopping sockets without logging WhatsApp out...`
    );


    await shutdownSockets();


    server.close(async () => {

      await pool.end();

      process.exit(0);

    });


    setTimeout(
      () => process.exit(1),
      10000
    ).unref();

  }


  process.on(
    "SIGTERM",
    () => shutdown("SIGTERM")
  );


  process.on(
    "SIGINT",
    () => shutdown("SIGINT")
  );

}


start().catch(error => {

  console.error(
    "❌ THE PAIN MD startup failed:",
    error
  );

  process.exit(1);

});
