-- AlterTable
ALTER TABLE `reviews` ADD COLUMN `rating` INTEGER NULL;

-- AlterTable
ALTER TABLE `users` MODIFY `verifyToken` VARCHAR(500) NULL;
