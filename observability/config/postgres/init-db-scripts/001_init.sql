-- Debezium user for logical replication.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'debezium') THEN
        CREATE ROLE debezium WITH REPLICATION LOGIN ENCRYPTED PASSWORD 'debezium';
    END IF;
END
$$;
