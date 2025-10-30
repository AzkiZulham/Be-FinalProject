"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.singleFile = exports.memoryUploader = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = require("path");
const fs_1 = __importDefault(require("fs"));
const defaultDir = (0, path_1.join)(__dirname, "../../public");
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
