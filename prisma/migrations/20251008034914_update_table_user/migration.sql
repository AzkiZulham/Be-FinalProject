-- AlterTable
ALTER TABLE `users` ADD COLUMN `birthDate` DATETIME(3) NULL,
    ADD COLUMN `gender` ENUM('MALE', 'FEMALE', 'OTHER') NULL,
    ADD COLUMN `isEmailVerified` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `phoneNumber` VARCHAR(20) NULL;
