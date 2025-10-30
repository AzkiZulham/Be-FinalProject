/*
  Warnings:

  - You are about to alter the column `roomImg` on the `roomtypes` table. The data in that column could be lost. The data in that column will be cast from `Text` to `Json`.

*/
-- AlterTable
ALTER TABLE `roomtypes` MODIFY `roomImg` JSON NULL;
