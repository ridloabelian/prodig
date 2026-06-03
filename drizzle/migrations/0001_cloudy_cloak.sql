CREATE TABLE `landing_pages` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`seller_id` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`subtitle` text,
	`theme` text DEFAULT 'midnight' NOT NULL,
	`prompt` text,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`hero_title` text NOT NULL,
	`hero_subtitle` text NOT NULL,
	`hero_features` text,
	`features` text NOT NULL,
	`testimonials` text,
	`faqs` text,
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `landing_pages_product_id_unique` ON `landing_pages` (`product_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `landing_pages_slug_unique` ON `landing_pages` (`slug`);