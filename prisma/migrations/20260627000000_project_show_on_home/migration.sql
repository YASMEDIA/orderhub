-- Controls whether an enabled storefront is listed on the public homepage.
ALTER TABLE "Project" ADD COLUMN "showOnHome" BOOLEAN NOT NULL DEFAULT false;
