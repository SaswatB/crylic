-- public."Integration" definition
-- Drop table
-- DROP TABLE public."Integration";
CREATE TABLE public."Integration" (
  id serial NOT NULL,
  user_id uuid NOT NULL,
  "type" varchar NOT NULL,
  "token" varchar NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "Integration_pkey" PRIMARY KEY (id)
);
-- Table Triggers
-- DROP TRIGGER "set_public_Integration_updated_at" ON public."Integration";
create trigger "set_public_Integration_updated_at" before
update on public."Integration" for each row execute function set_current_timestamp_updated_at();
-- public."Integration" foreign keys
ALTER TABLE public."Integration"
ADD CONSTRAINT "Integration_user_id_fkey" FOREIGN KEY (user_id) REFERENCES "User"(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
-- viewer function definition
CREATE OR REPLACE FUNCTION public.viewer(hasura_session json) RETURNS SETOF "User" LANGUAGE sql STABLE AS $function$
SELECT *
FROM "User"
WHERE id::text = (hasura_session->>'x-hasura-user-id') $function$;