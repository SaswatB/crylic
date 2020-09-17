CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at() RETURNS trigger LANGUAGE plpgsql AS $function$
DECLARE _new record;
BEGIN _new := NEW;
_new."updated_at" = NOW();
RETURN _new;
END;
$function$;
-- public."User" definition
-- Drop table
-- DROP TABLE public."User";
CREATE TABLE public."User" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email varchar NOT NULL,
  "password" bpchar NOT NULL,
  first_name varchar NOT NULL,
  last_name varchar NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "User_pkey" PRIMARY KEY (id)
);
-- Table Triggers
-- DROP TRIGGER "set_public_User_updated_at" ON public."User";
create trigger "set_public_User_updated_at" before
update on public."User" for each row execute function set_current_timestamp_updated_at();