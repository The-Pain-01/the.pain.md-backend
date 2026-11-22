import {
  initAuthCreds,
  BufferJSON
} from "@whiskeysockets/baileys";

import {
  query,
  pool
} from "../database/pool.js";

import {
  encryptJson,
  decryptJson
} from "../utils/encryption.js";


const encode = value => {
  return JSON.parse(
    JSON.stringify(
      value,
      BufferJSON.replacer
    )
  );
};


const decode = value => {
  return JSON.parse(
    JSON.stringify(value),
    BufferJSON.reviver
  );
};


export async function usePostgresAuthState(sessionId) {

  const credsResult = await query(
    `SELECT encrypted_value
     FROM baileys_auth_state
     WHERE session_id = $1
     AND key_type = 'creds'
     AND key_id = 'main'`,
    [sessionId]
  );


  const creds = credsResult.rowCount
    ? decode(
        decryptJson(
          credsResult.rows[0].encrypted_value
        )
      )
    : initAuthCreds();


  const state = {
    creds,

    keys: {

      async get(type, ids) {

        if (!ids.length) return {};

        const result = await query(
          `SELECT key_id, encrypted_value
           FROM baileys_auth_state
           WHERE session_id = $1
           AND key_type = $2
           AND key_id = ANY($3::text[])`,
          [sessionId, type, ids]
        );

        const output = {};

        for (const row of result.rows) {
          output[row.key_id] = decode(
            decryptJson(row.encrypted_value)
          );
        }

        return output;
      },


      async set(data) {

        const client = await pool.connect();

        try {

          await client.query("BEGIN");

          for (const [type, entries] of Object.entries(data)) {

            for (const [id, value] of Object.entries(entries || {})) {

              if (value === null || value === undefined) {

                await client.query(
                  `DELETE FROM baileys_auth_state
                   WHERE session_id = $1
                   AND key_type = $2
                   AND key_id = $3`,
                  [sessionId, type, id]
                );

              } else {

                await client.query(
                  `INSERT INTO baileys_auth_state
                   (session_id, key_type, key_id, encrypted_value)
                   VALUES ($1, $2, $3, $4)

                   ON CONFLICT
                   (session_id, key_type, key_id)

                   DO UPDATE SET
                   encrypted_value = EXCLUDED.encrypted_value,
                   updated_at = NOW()`,
                  [
                    sessionId,
                    type,
                    id,
                    encryptJson(encode(value))
                  ]
                );

              }

            }

          }

          await client.query("COMMIT");

        } catch (error) {

          await client.query("ROLLBACK");

          throw error;

        } finally {

          client.release();

        }

      }

    }

  };


  return {

    state,

    saveCreds: async () => {

      await query(
        `INSERT INTO baileys_auth_state
         (session_id, key_type, key_id, encrypted_value)

         VALUES ($1, 'creds', 'main', $2)

         ON CONFLICT
         (session_id, key_type, key_id)

         DO UPDATE SET
         encrypted_value = EXCLUDED.encrypted_value,
         updated_at = NOW()`,

        [
          sessionId,
          encryptJson(encode(state.creds))
        ]
      );

    }

  };

}
