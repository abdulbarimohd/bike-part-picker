-- CreateEnum
CREATE TYPE "Discipline" AS ENUM ('ROAD', 'GRAVEL', 'MTB');

-- AlterTable
ALTER TABLE "Part" ADD COLUMN     "disciplines" "Discipline"[] DEFAULT ARRAY[]::"Discipline"[];
