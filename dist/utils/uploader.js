"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToBlob = exports.singleFile = exports.memoryUploader = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = require("path");
const fs_1 = __importDefault(require("fs"));
const blob_1 = require("@vercel/blob");
const defaultDir = process.env.NODE_ENV === "production"
    ? "/tmp"
    : (0, path_1.join)(__dirname, "../../public");
const memoryUploader = () => {
    const storage = multer_1.default.memoryStorage();
    return (0, multer_1.default)({ storage });
};
exports.memoryUploader = memoryUploader;
const uploader = (filePrefix, folderName) => {
    const storage = multer_1.default.diskStorage({
        destination: (_req, _file, cb) => {
            const destination = folderName
                ? (0, path_1.join)(defaultDir, folderName)
                : defaultDir;
            if (!fs_1.default.existsSync(destination)) {
                fs_1.default.mkdirSync(destination);
            }
            cb(null, destination);
        },
        filename: (_req, file, cb) => {
            const originalNameParts = file.originalname.split(".");
            const fileExtension = originalNameParts[originalNameParts.length - 1];
            const newFilename = filePrefix + Date.now() + "." + fileExtension;
            cb(null, newFilename);
        },
    });
    return (0, multer_1.default)({ storage });
};
const singleFile = (filePrefix, folderName) => {
    return [
        uploader(filePrefix, folderName).single("file"),
        (req, _res, next) => {
            const { file } = req;
            if (file) {
                file.path = folderName + "/" + (file?.filename + "");
            }
            next();
        },
    ];
};
exports.singleFile = singleFile;
const uploadToBlob = async (file, folderName) => {
    try {
        const originalNameParts = file.originalname.split(".");
        const fileExtension = originalNameParts[originalNameParts.length - 1];
        const filename = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
        let body;
        if (file.buffer) {
            body = file.buffer;
        }
        else if (file.path) {
            body = fs_1.default.readFileSync(file.path);
        }
        else {
            throw new Error('File buffer or path is required for upload');
        }
        const blob = await (0, blob_1.put)(`${folderName}/${filename}`, body, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        return blob.url;
    }
    catch (error) {
        console.error('Error uploading to Vercel Blob:', error);
        throw error;
    }
};
exports.uploadToBlob = uploadToBlob;
