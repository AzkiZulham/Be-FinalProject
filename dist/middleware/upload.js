"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mixedUpload = exports.profileUploadUser = exports.profileUpload = exports.propertyUpload = exports.upload = exports.roomUpload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Helper function to get upload directory based on environment
const getUploadDir = (subDir) => {
    const isProduction = process.env.NODE_ENV === "production";
    if (isProduction) {
        // Use /tmp for Vercel (temporary storage)
        return path_1.default.join("/tmp", subDir);
    }
    else {
        // Use local public/uploads for development
        return path_1.default.join(__dirname, "../../public/uploads", subDir);
    }
};
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const dir = getUploadDir("rooms");
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
    },
});
const roomStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const dir = getUploadDir("rooms");
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
    },
});
exports.roomUpload = (0, multer_1.default)({ storage: roomStorage });
const propertyStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const dir = getUploadDir("properties");
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
    },
});
exports.upload = (0, multer_1.default)({ storage });
exports.propertyUpload = (0, multer_1.default)({ storage: propertyStorage });
const profileStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const dir = getUploadDir("profile");
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
    },
});
exports.profileUpload = (0, multer_1.default)({ storage: profileStorage });
const profileStorageUser = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const dir = getUploadDir("user-profile");
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
    },
});
exports.profileUploadUser = (0, multer_1.default)({ storage: profileStorageUser });
const mixedStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        let dir;
        if (file.fieldname === 'picture') {
            dir = getUploadDir("properties");
        }
        else if (file.fieldname.startsWith('roomImg_')) {
            dir = getUploadDir("rooms");
        }
        else {
            dir = getUploadDir("properties");
        }
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
    },
});
exports.mixedUpload = (0, multer_1.default)({ storage: mixedStorage });
