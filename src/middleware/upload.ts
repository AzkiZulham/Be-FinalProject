import multer from "multer";
import path from "path";
import fs from "fs";

// Helper function to get upload directory based on environment
const getUploadDir = (subDir: string) => {
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    // Use /tmp for Vercel (temporary storage)
    return path.join("/tmp", subDir);
  } else {
    // Use local public/uploads for development
    return path.join(__dirname, "../../public/uploads", subDir);
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = getUploadDir("rooms");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const roomStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = getUploadDir("rooms");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

export const roomUpload = multer({ storage: roomStorage });

const propertyStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = getUploadDir("properties");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

export const upload = multer({ storage });
export const propertyUpload = multer({ storage: propertyStorage });

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = getUploadDir("profile");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

export const profileUpload = multer({ storage: profileStorage });

const profileStorageUser = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = getUploadDir("user-profile");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

export const profileUploadUser = multer({ storage: profileStorageUser });

const mixedStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dir;
    if (file.fieldname === 'picture') {
      dir = getUploadDir("properties");
    } else if (file.fieldname.startsWith('roomImg_')) {
      dir = getUploadDir("rooms");
    } else {
      dir = getUploadDir("properties");
    }
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

export const mixedUpload = multer({ storage: mixedStorage });
