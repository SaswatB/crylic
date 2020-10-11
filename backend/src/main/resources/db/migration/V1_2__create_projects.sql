-- public."Project" definition
-- Drop table
-- DROP TABLE public."Project";
CREATE TABLE public."Project" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  "name" varchar NOT NULL,
  "type" varchar NOT NULL,
  metadata jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "Project_pkey" PRIMARY KEY (id)
);
-- Table Triggers
-- DROP TRIGGER "set_public_Project_updated_at" ON public."Project";
create trigger "set_public_Project_updated_at" before
update on public."Project" for each row execute function set_current_timestamp_updated_at();
-- public."Project" foreign keys
ALTER TABLE public."Project"
ADD CONSTRAINT "Project_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES "User"(id) ON UPDATE RESTRICT ON DELETE RESTRICT;