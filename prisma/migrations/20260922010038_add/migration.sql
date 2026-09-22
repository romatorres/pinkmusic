-- CreateEnum
CREATE TYPE "DescriptionSource" AS ENUM ('CUSTOM', 'ML');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "descriptionSource" "DescriptionSource" DEFAULT 'CUSTOM';
