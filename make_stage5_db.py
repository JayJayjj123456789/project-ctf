import sqlite3, os
db_path = '/home/acerv2/.openclaw/workspace-stage5/workspace-stage5/assets/sector7_audit.db'
os.makedirs(os.path.dirname(db_path), exist_ok=True)
conn = sqlite3.connect(db_path)
c = conn.cursor()
c.executescript("""
DROP TABLE IF EXISTS agents;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS vault_access;
CREATE TABLE agents (id TEXT PRIMARY KEY, codename TEXT, clearance_level TEXT, status TEXT, last_seen TEXT);
CREATE TABLE sessions (id TEXT PRIMARY KEY, agent_id TEXT, timestamp TEXT, action TEXT, target TEXT, exit_code INTEGER);
CREATE TABLE vault_access (id INTEGER PRIMARY KEY, session_id TEXT, vault_id TEXT, key_fragment TEXT, access_type TEXT);
INSERT INTO agents VALUES ('A001','archive_keeper','OMEGA','ACTIVE','2026-04-08 08:59:00');
INSERT INTO agents VALUES ('A002','rogue_7f3a','SIGMA','SUSPENDED','2026-04-08 09:00:01');
INSERT INTO agents VALUES ('A003','director_chen','OMEGA','ACTIVE','2026-04-08 09:01:00');
INSERT INTO agents VALUES ('A004','ghost_runner','DELTA','INACTIVE','2026-04-07 22:00:00');
INSERT INTO sessions VALUES ('S001','A002','2026-04-08 09:00:00.050','AUTH_BYPASS','sector7_vault',0);
INSERT INTO sessions VALUES ('S002','A002','2026-04-08 09:00:00.388','DATA_READ','sector7_vault',0);
INSERT INTO sessions VALUES ('S003','A002','2026-04-08 09:00:00.512','EXFIL_PREP','sector7_vault',0);
INSERT INTO sessions VALUES ('S004','A001','2026-04-08 08:59:55.000','ROUTINE_CHECK','sector7_vault',0);
INSERT INTO sessions VALUES ('S005','A003','2026-04-08 09:01:00.000','AUDIT_REVIEW','sector7_vault',0);
INSERT INTO vault_access VALUES (1,'S001','vault_9k2m','PIPE','READ');
INSERT INTO vault_access VALUES (2,'S002','vault_9k2m','LINE_','READ');
INSERT INTO vault_access VALUES (3,'S003','vault_9k2m','7F3A','EXFIL');
INSERT INTO vault_access VALUES (4,'S004','vault_9k2m','HEALTH','VERIFY');
""")
conn.commit()
tables = [r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
print('Tables:', tables)
frags = c.execute("SELECT key_fragment FROM vault_access WHERE session_id IN (SELECT id FROM sessions WHERE agent_id='A002') ORDER BY id").fetchall()
concat = ''.join(f[0] for f in frags)
print('Fragments:', [f[0] for f in frags], '-> PIPELINE_SIG =', concat)
conn.close()
print('Done:', db_path)
