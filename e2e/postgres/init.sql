-- Test databases, one role per service, as in production.
CREATE ROLE kratos LOGIN PASSWORD 'test'; CREATE DATABASE kratos OWNER kratos;
CREATE ROLE hydra  LOGIN PASSWORD 'test'; CREATE DATABASE hydra  OWNER hydra;
CREATE ROLE keto   LOGIN PASSWORD 'test'; CREATE DATABASE keto   OWNER keto;
