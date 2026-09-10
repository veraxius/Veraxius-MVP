-- Relax Evidence.uploadedBy to optional. Reversible (re-add NOT NULL) since
-- every existing row already has a value. Needed because MVP5 machine-
-- generated Evidence (outcomes, API responses) has no human uploader.
ALTER TABLE "Evidence" ALTER COLUMN "uploadedBy" DROP NOT NULL;
