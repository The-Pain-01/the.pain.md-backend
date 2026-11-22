CREATE TABLE IF NOT EXISTS bot_sessions (
    id UUID PRIMARY KEY,

    owner_token_hash CHAR(64) NOT NULL UNIQUE,

    status TEXT NOT NULL DEFAULT 'starting',

    method TEXT NOT NULL
        CHECK (method IN ('qr', 'pair')),

    phone TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    last_connected_at TIMESTAMPTZ,

    ended_at TIMESTAMPTZ,

    last_error TEXT
);

CREATE INDEX IF NOT EXISTS bot_sessions_status_idx
ON bot_sessions(status);


CREATE TABLE IF NOT EXISTS baileys_auth_state (
    session_id UUID NOT NULL
        REFERENCES bot_sessions(id)
        ON DELETE CASCADE,

    key_type TEXT NOT NULL,

    key_id TEXT NOT NULL,

    encrypted_value TEXT NOT NULL,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (
        session_id,
        key_type,
        key_id
    )
);
