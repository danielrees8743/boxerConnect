-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('BOXER', 'COACH', 'GYM_OWNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('BEGINNER', 'AMATEUR', 'INTERMEDIATE', 'ADVANCED', 'PROFESSIONAL');

-- CreateEnum
CREATE TYPE "FightResult" AS ENUM ('WIN', 'LOSS', 'DRAW', 'NO_CONTEST');

-- CreateEnum
CREATE TYPE "FightMethod" AS ENUM ('DECISION', 'UNANIMOUS_DECISION', 'SPLIT_DECISION', 'MAJORITY_DECISION', 'KO', 'TKO', 'RTD', 'DQ', 'NO_CONTEST');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "MatchRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CoachPermission" AS ENUM ('VIEW_PROFILE', 'EDIT_PROFILE', 'MANAGE_AVAILABILITY', 'RESPOND_TO_MATCHES', 'FULL_ACCESS');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'BOXER',
    "name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boxers" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "weight_kg" DECIMAL(5,2),
    "height_cm" INTEGER,
    "date_of_birth" DATE,
    "location" VARCHAR(255),
    "city" VARCHAR(100),
    "country" VARCHAR(100),
    "experience_level" "ExperienceLevel" NOT NULL DEFAULT 'BEGINNER',
    "gender" "Gender",
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "gym_affiliation" VARCHAR(200),
    "bio" TEXT,
    "profile_photo_url" VARCHAR(500),
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_searchable" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "club_id" UUID,

    CONSTRAINT "boxers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fight_history" (
    "id" UUID NOT NULL,
    "boxer_id" UUID NOT NULL,
    "opponent_name" VARCHAR(100) NOT NULL,
    "date" DATE NOT NULL,
    "venue" VARCHAR(200),
    "result" "FightResult" NOT NULL,
    "method" "FightMethod",
    "round" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fight_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability" (
    "id" UUID NOT NULL,
    "boxer_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "notes" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_requests" (
    "id" UUID NOT NULL,
    "requester_boxer_id" UUID NOT NULL,
    "target_boxer_id" UUID NOT NULL,
    "status" "MatchRequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "response_message" TEXT,
    "proposed_date" TIMESTAMP(3),
    "proposed_venue" VARCHAR(200),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_boxer" (
    "id" UUID NOT NULL,
    "coach_user_id" UUID NOT NULL,
    "boxer_id" UUID NOT NULL,
    "permissions" "CoachPermission" NOT NULL DEFAULT 'VIEW_PROFILE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coach_boxer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clubs" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "contact_name" VARCHAR(100),
    "postcode" VARCHAR(20),
    "region" VARCHAR(100),
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "owner_id" UUID,

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_coaches" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "coach_user_id" UUID NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_head" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_coaches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "boxers_user_id_key" ON "boxers"("user_id");

-- CreateIndex
CREATE INDEX "boxers_user_id_idx" ON "boxers"("user_id");

-- CreateIndex
CREATE INDEX "boxers_city_country_idx" ON "boxers"("city", "country");

-- CreateIndex
CREATE INDEX "boxers_experience_level_idx" ON "boxers"("experience_level");

-- CreateIndex
CREATE INDEX "boxers_weight_kg_idx" ON "boxers"("weight_kg");

-- CreateIndex
CREATE INDEX "boxers_is_searchable_is_verified_idx" ON "boxers"("is_searchable", "is_verified");

-- CreateIndex
CREATE INDEX "boxers_club_id_idx" ON "boxers"("club_id");

-- CreateIndex
CREATE INDEX "fight_history_boxer_id_idx" ON "fight_history"("boxer_id");

-- CreateIndex
CREATE INDEX "fight_history_date_idx" ON "fight_history"("date");

-- CreateIndex
CREATE INDEX "fight_history_result_idx" ON "fight_history"("result");

-- CreateIndex
CREATE INDEX "availability_boxer_id_idx" ON "availability"("boxer_id");

-- CreateIndex
CREATE INDEX "availability_date_idx" ON "availability"("date");

-- CreateIndex
CREATE INDEX "availability_is_available_date_idx" ON "availability"("is_available", "date");

-- CreateIndex
CREATE INDEX "match_requests_requester_boxer_id_idx" ON "match_requests"("requester_boxer_id");

-- CreateIndex
CREATE INDEX "match_requests_target_boxer_id_idx" ON "match_requests"("target_boxer_id");

-- CreateIndex
CREATE INDEX "match_requests_status_idx" ON "match_requests"("status");

-- CreateIndex
CREATE INDEX "match_requests_expires_at_idx" ON "match_requests"("expires_at");

-- CreateIndex
CREATE INDEX "match_requests_status_expires_at_idx" ON "match_requests"("status", "expires_at");

-- CreateIndex
CREATE INDEX "coach_boxer_coach_user_id_idx" ON "coach_boxer"("coach_user_id");

-- CreateIndex
CREATE INDEX "coach_boxer_boxer_id_idx" ON "coach_boxer"("boxer_id");

-- CreateIndex
CREATE UNIQUE INDEX "coach_boxer_coach_user_id_boxer_id_key" ON "coach_boxer"("coach_user_id", "boxer_id");

-- CreateIndex
CREATE INDEX "clubs_name_idx" ON "clubs"("name");

-- CreateIndex
CREATE INDEX "clubs_region_idx" ON "clubs"("region");

-- CreateIndex
CREATE INDEX "clubs_postcode_idx" ON "clubs"("postcode");

-- CreateIndex
CREATE INDEX "clubs_owner_id_idx" ON "clubs"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "club_coaches_coach_user_id_key" ON "club_coaches"("coach_user_id");

-- CreateIndex
CREATE INDEX "club_coaches_club_id_idx" ON "club_coaches"("club_id");

-- CreateIndex
CREATE INDEX "club_coaches_coach_user_id_idx" ON "club_coaches"("coach_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "club_coaches_club_id_coach_user_id_key" ON "club_coaches"("club_id", "coach_user_id");

-- AddForeignKey
ALTER TABLE "boxers" ADD CONSTRAINT "boxers_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boxers" ADD CONSTRAINT "boxers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fight_history" ADD CONSTRAINT "fight_history_boxer_id_fkey" FOREIGN KEY ("boxer_id") REFERENCES "boxers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability" ADD CONSTRAINT "availability_boxer_id_fkey" FOREIGN KEY ("boxer_id") REFERENCES "boxers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_requests" ADD CONSTRAINT "match_requests_requester_boxer_id_fkey" FOREIGN KEY ("requester_boxer_id") REFERENCES "boxers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_requests" ADD CONSTRAINT "match_requests_target_boxer_id_fkey" FOREIGN KEY ("target_boxer_id") REFERENCES "boxers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_boxer" ADD CONSTRAINT "coach_boxer_coach_user_id_fkey" FOREIGN KEY ("coach_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_boxer" ADD CONSTRAINT "coach_boxer_boxer_id_fkey" FOREIGN KEY ("boxer_id") REFERENCES "boxers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_coaches" ADD CONSTRAINT "club_coaches_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_coaches" ADD CONSTRAINT "club_coaches_coach_user_id_fkey" FOREIGN KEY ("coach_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

