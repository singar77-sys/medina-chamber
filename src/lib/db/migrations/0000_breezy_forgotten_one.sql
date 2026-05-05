CREATE TYPE "public"."organization_status" AS ENUM('prospect', 'active', 'courtesy', 'non_member', 'inactive', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."billing_cycle" AS ENUM('annual', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'pending', 'paid', 'past_due', 'void', 'uncollectible');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('pending', 'trial', 'active', 'past_due', 'lapsed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('draft', 'published', 'cancelled', 'completed');--> statement-breakpoint
CREATE TYPE "public"."registration_status" AS ENUM('pending', 'confirmed', 'waitlisted', 'cancelled', 'attended');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'scheduled', 'sending', 'sent', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."send_status" AS ENUM('queued', 'sent', 'opened', 'clicked', 'bounced', 'unsubscribed', 'spam', 'failed');--> statement-breakpoint
CREATE TYPE "public"."workflow_action_type" AS ENUM('send_email', 'wait', 'create_task', 'add_tag', 'update_membership_status');--> statement-breakpoint
CREATE TYPE "public"."workflow_run_status" AS ENUM('running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."workflow_trigger" AS ENUM('member_joined', 'renewal_approaching_30d', 'renewal_approaching_14d', 'renewal_approaching_7d', 'renewal_due', 'payment_failed', 'payment_recovered', 'membership_lapsed', 'event_registered', 'event_attended', 'member_inactive_90d', 'member_portal_claimed');--> statement-breakpoint
CREATE TYPE "public"."engagement_event_type" AS ENUM('directory_view', 'referral_click', 'hot_deal_view', 'chamberbot_mention', 'event_attended', 'event_registered', 'email_opened', 'email_clicked', 'portal_login', 'profile_updated', 'renewal_completed', 'payment_failed', 'membership_lapsed');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gz_id" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"parent_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_gz_id_unique" UNIQUE("gz_id"),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"gz_id" text,
	"gz_synced_at" timestamp with time zone,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"title" text,
	"is_primary_contact" boolean DEFAULT false NOT NULL,
	"clerk_user_id" text,
	"portal_claimed_at" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone,
	"bounce_count" integer DEFAULT 0 NOT NULL,
	"last_bounced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contacts_gz_id_unique" UNIQUE("gz_id"),
	CONSTRAINT "contacts_email_unique" UNIQUE("email"),
	CONSTRAINT "contacts_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE "organization_categories" (
	"organization_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	CONSTRAINT "organization_categories_organization_id_category_id_pk" PRIMARY KEY("organization_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gz_id" text,
	"gz_synced_at" timestamp with time zone,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" "organization_status" DEFAULT 'prospect' NOT NULL,
	"phone" text,
	"email" text,
	"website_url" text,
	"address1" text,
	"address2" text,
	"city" text DEFAULT 'Medina',
	"state" text DEFAULT 'OH',
	"zip" text,
	"latitude" double precision,
	"longitude" double precision,
	"description" text,
	"logo_url" text,
	"cover_image_url" text,
	"facebook" text,
	"twitter" text,
	"instagram" text,
	"linkedin" text,
	"youtube" text,
	"membership_tier" text,
	"stripe_customer_id" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_gz_id_unique" UNIQUE("gz_id"),
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug"),
	CONSTRAINT "organizations_stripe_customer_id_unique" UNIQUE("stripe_customer_id")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"membership_id" uuid,
	"stripe_invoice_id" text,
	"stripe_payment_intent_id" text,
	"amount_cents" integer NOT NULL,
	"amount_paid_cents" integer DEFAULT 0 NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"description" text,
	"due_date" date,
	"paid_at" timestamp with time zone,
	"period_start" date,
	"period_end" date,
	"line_items" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_stripe_invoice_id_unique" UNIQUE("stripe_invoice_id")
);
--> statement-breakpoint
CREATE TABLE "membership_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"annual_price_cents" integer NOT NULL,
	"monthly_price_cents" integer,
	"stripe_price_id_annual" text,
	"stripe_price_id_monthly" text,
	"benefits" jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "membership_tiers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"tier_id" uuid NOT NULL,
	"status" "membership_status" DEFAULT 'pending' NOT NULL,
	"billing_cycle" "billing_cycle" DEFAULT 'annual' NOT NULL,
	"start_date" date NOT NULL,
	"renewal_date" date NOT NULL,
	"stripe_subscription_id" text,
	"gz_id" text,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id"),
	CONSTRAINT "memberships_gz_id_unique" UNIQUE("gz_id")
);
--> statement-breakpoint
CREATE TABLE "event_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"ticket_id" uuid,
	"contact_id" uuid,
	"organization_id" uuid,
	"guest_name" text,
	"guest_email" text,
	"status" "registration_status" DEFAULT 'pending' NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"stripe_payment_intent_id" text,
	"checked_in_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_cents" integer DEFAULT 0 NOT NULL,
	"stripe_price_id" text,
	"max_quantity" integer,
	"sold_count" integer DEFAULT 0 NOT NULL,
	"is_member_only" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"gz_id" text,
	"title" text NOT NULL,
	"description" text,
	"short_description" text,
	"status" "event_status" DEFAULT 'draft' NOT NULL,
	"is_members_only" boolean DEFAULT false NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"location" text,
	"location_lat" double precision,
	"location_lng" double precision,
	"virtual_url" text,
	"max_capacity" integer,
	"registration_count" integer DEFAULT 0 NOT NULL,
	"waitlist_count" integer DEFAULT 0 NOT NULL,
	"featured_image_url" text,
	"stripe_product_id" text,
	"registration_open_at" timestamp with time zone,
	"registration_close_at" timestamp with time zone,
	"external_registration_url" text,
	"sponsor_packages_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_slug_unique" UNIQUE("slug"),
	CONSTRAINT "events_gz_id_unique" UNIQUE("gz_id")
);
--> statement-breakpoint
CREATE TABLE "email_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"from_name" text NOT NULL,
	"from_email" text NOT NULL,
	"reply_to" text,
	"html_body" text,
	"text_body" text,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"segment_filter" jsonb,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"open_count" integer DEFAULT 0 NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"bounce_count" integer DEFAULT 0 NOT NULL,
	"unsubscribe_count" integer DEFAULT 0 NOT NULL,
	"scheduled_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"resend_broadcast_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_sends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"contact_id" uuid,
	"email" text NOT NULL,
	"status" "send_status" DEFAULT 'queued' NOT NULL,
	"resend_message_id" text,
	"sent_at" timestamp with time zone,
	"opened_at" timestamp with time zone,
	"clicked_at" timestamp with time zone,
	"bounced_at" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_sends_resend_message_id_unique" UNIQUE("resend_message_id")
);
--> statement-breakpoint
CREATE TABLE "workflow_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"organization_id" uuid,
	"contact_id" uuid,
	"status" "workflow_run_status" DEFAULT 'running' NOT NULL,
	"current_step" integer DEFAULT 0 NOT NULL,
	"inngest_run_id" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"next_run_at" timestamp with time zone,
	"error" text,
	"context" jsonb
);
--> statement-breakpoint
CREATE TABLE "workflow_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"step_order" integer NOT NULL,
	"action_type" "workflow_action_type" NOT NULL,
	"action_config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"trigger" "workflow_trigger" NOT NULL,
	"tier_filter" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engagement_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"contact_id" uuid,
	"event_type" "engagement_event_type" NOT NULL,
	"metadata" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text DEFAULT 'growthzone' NOT NULL,
	"added" integer DEFAULT 0 NOT NULL,
	"updated" integer DEFAULT 0 NOT NULL,
	"removed" integer DEFAULT 0 NOT NULL,
	"errors" integer DEFAULT 0 NOT NULL,
	"duration_ms" integer,
	"error_details" jsonb,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_categories" ADD CONSTRAINT "organization_categories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_categories" ADD CONSTRAINT "organization_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_tier_id_membership_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."membership_tiers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_ticket_id_event_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."event_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tickets" ADD CONSTRAINT "event_tickets_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_sends" ADD CONSTRAINT "email_sends_campaign_id_email_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."email_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_sends" ADD CONSTRAINT "email_sends_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement_events" ADD CONSTRAINT "engagement_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement_events" ADD CONSTRAINT "engagement_events_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;