CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_image_idx" ON "user" USING btree ("image");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "media_uploaded_by_idx" ON "media" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "species_media_media_idx" ON "species_media" USING btree ("media_id");--> statement-breakpoint
CREATE INDEX "event_media_media_idx" ON "event_media" USING btree ("media_id");