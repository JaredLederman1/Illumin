-- CreateEnum
CREATE TYPE "FilingStatus" AS ENUM ('SINGLE', 'MARRIED_FILING_JOINTLY', 'MARRIED_FILING_SEPARATELY', 'HEAD_OF_HOUSEHOLD', 'QUALIFYING_SURVIVING_SPOUSE');

-- CreateEnum
CREATE TYPE "VestingStatus" AS ENUM ('NOT_VESTED', 'PARTIALLY_VESTED', 'FULLY_VESTED', 'CLIFF_NOT_REACHED');

-- AlterTable
ALTER TABLE "onboarding_profiles" ADD COLUMN     "career_level" TEXT,
ADD COLUMN     "career_target_level" TEXT,
ADD COLUMN     "dependents" INTEGER,
ADD COLUMN     "employer_401k_match_pct" DOUBLE PRECISION,
ADD COLUMN     "filing_status" "FilingStatus",
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "vesting_status" "VestingStatus";
