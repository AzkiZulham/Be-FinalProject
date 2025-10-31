import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { join } from "path";
import fs from "fs";
import { put } from "@vercel/blob";

type Callback = (error: Error | null, destination: string) => void;

const defaultDir =
  process.env.NODE_ENV === "production"
    ? "/tmp"
    : join(__dirname, "../../public");

export const memoryUploader = () => {
  const storage = multer.memoryStorage();

  return multer({ storage });
};

const uploader = (filePrefix: string, folderName?: string) => {
  const storage = multer.diskStorage({
    destination: (_req: Request, _file: Express.Multer.File, cb: Callback) => {
      const destination = folderName
        ? join(defaultDir, folderName)
        : defaultDir;

      if (!fs.existsSync(destination)) {
        fs.mkdirSync(destination);
      }

      cb(null, destination);
    },

    filename: (_req: Request, file: Express.Multer.File, cb: Callback) => {
      const originalNameParts = file.originalname.split(".");

      const fileExtension = originalNameParts[originalNameParts.length - 1];

      const newFilename = filePrefix + Date.now() + "." + fileExtension;

      cb(null, newFilename);
    },
  });

  return multer({ storage });
};

export const singleFile = (filePrefix: string, folderName?: string) => {
  return [
    uploader(filePrefix, folderName).single("file"),

    (req: Request, _res: Response, next: NextFunction) => {
      const { file } = req;

      if (file) {
        file.path = folderName + "/" + (file?.filename + "");
      }

      next();
    },
  ];
};

export const uploadToBlob = async (file: Express.Multer.File, folderName: string) => {
  try {
    const originalNameParts = file.originalname.split(".");
    const fileExtension = originalNameParts[originalNameParts.length - 1];
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;

    let body: Buffer;
    if (file.buffer) {
      body = file.buffer;
    } else if (file.path) {
      body = fs.readFileSync(file.path);
    } else {
      throw new Error('File buffer or path is required for upload');
    }

    const blob = await put(`${folderName}/${filename}`, body, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return blob.url;
  } catch (error) {
    console.error('Error uploading to Vercel Blob:', error);
    throw error;
  }
};
