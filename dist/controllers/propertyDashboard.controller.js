"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProperty = exports.updateProperty = exports.deleteProperty = exports.getMyProperties = exports.getPropertyCategories = void 0;
const prisma_1 = require("../config/prisma");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
/* ================================================
   GET PROPERTY CATEGORIES
================================================ */
const getPropertyCategories = async (req, res) => {
    try {
        const categories = await prisma_1.prisma.propertyCategory.findMany({
            orderBy: { category: "asc" },
        });
        return res.json(categories);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Gagal mengambil kategori properti" });
    }
};
exports.getPropertyCategories = getPropertyCategories;
/* ================================================
   GET MY PROPERTIES
================================================ */
const getMyProperties = async (req, res) => {
    try {
        const user = req.user;
        if (!user?.id)
            return res.status(401).json({ error: "Unauthorized" });
        const userId = user.id;
        const { search = "", categoryId, page = "1", perPage = "6" } = req.query;
        const pageNum = Number(page) || 1;
        const perPageNum = Number(perPage) || 6;
        const where = {
            userId,
            name: { contains: search },
        };
        if (categoryId) {
            const catId = Number(categoryId);
            if (!isNaN(catId))
                where.categoryId = catId;
        }
        const total = await prisma_1.prisma.property.count({ where });
        const properties = await prisma_1.prisma.property.findMany({
            where,
            include: { category: true, roomTypes: true },
            skip: (pageNum - 1) * perPageNum,
            take: perPageNum,
            orderBy: { createdAt: "desc" },
        });
        return res.json({ data: properties, total });
    }
    catch (err) {
        console.error("Error getMyProperties:", err);
        return res.status(500).json({ error: "Gagal mengambil properti" });
    }
};
exports.getMyProperties = getMyProperties;
/* ================================================
   DELETE PROPERTY
================================================ */
const deleteProperty = async (req, res) => {
    try {
        const user = req.user;
        if (!user?.id)
            return res.status(401).json({ error: "Unauthorized" });
        const propertyId = Number(req.params.id);
        const prop = await prisma_1.prisma.property.findUnique({
            where: { id: propertyId },
            include: {
                roomTypes: {
                    include: {
                        peakSeasons: true,
                        transactions: true,
                    },
                },
                reviews: true,
            },
        });
        if (!prop || prop.userId !== user.id)
            return res.status(403).json({ error: "Tidak bisa menghapus property ini" });
        const hasActiveTransactions = prop.roomTypes.some((roomType) => roomType.transactions.some((transaction) => transaction.status === "WAITING_FOR_PAYMENT" ||
            transaction.status === "WAITING_FOR_CONFIRMATION" ||
            transaction.status === "ACCEPTED"));
        if (hasActiveTransactions) {
            return res.status(400).json({
                error: "Tidak dapat menghapus properti yang memiliki transaksi aktif",
            });
        }
        for (const roomType of prop.roomTypes) {
            await prisma_1.prisma.peakSeason.deleteMany({
                where: { roomTypeId: roomType.id },
            });
            await prisma_1.prisma.transaction.deleteMany({
                where: { roomTypeId: roomType.id },
            });
        }
        await prisma_1.prisma.review.deleteMany({
            where: { propertyId },
        });
        await prisma_1.prisma.roomType.deleteMany({
            where: { propertyId },
        });
        await prisma_1.prisma.property.delete({ where: { id: propertyId } });
        return res.json({ message: "Property berhasil dihapus" });
    }
    catch (err) {
        console.error("Error deleteProperty:", err);
        return res.status(500).json({ error: "Gagal menghapus property" });
    }
};
exports.deleteProperty = deleteProperty;
/* ================================================
   UPDATE PROPERTY (FINAL FIXED VERSION)
================================================ */
const updateProperty = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, categoryId, city, description, noRekening, destinationBank, roomTypes, } = req.body;
        const propertyId = Number(id);
        if (isNaN(propertyId)) {
            return res.status(400).json({ message: "Invalid property ID" });
        }
        if (!noRekening || noRekening.trim() === "") {
            return res.status(400).json({ message: "noRekening is required" });
        }
        if (!destinationBank || destinationBank.trim() === "") {
            return res.status(400).json({ message: "destinationBank is required" });
        }
        let parsedRoomTypes = [];
        if (roomTypes) {
            try {
                parsedRoomTypes = JSON.parse(roomTypes);
            }
            catch (err) {
                console.error("Error parsing roomTypes JSON:", err);
                return res.status(400).json({ message: "Invalid roomTypes format" });
            }
        }
        const existingProperty = await prisma_1.prisma.property.findUnique({
            where: { id: propertyId },
            include: { roomTypes: true },
        });
        if (!existingProperty) {
            return res.status(404).json({ message: "Property not found" });
        }
        let picturePath = existingProperty.picture;
        if (picturePath === "null")
            picturePath = null;
        if (req.files && req.files.picture) {
            if (picturePath) {
                const oldPath = path_1.default.join(__dirname, "../../public", picturePath.replace(/^\//, ""));
                if (fs_1.default.existsSync(oldPath)) {
                    try {
                        fs_1.default.unlinkSync(oldPath);
                    }
                    catch (err) {
                        console.error("Error deleting old property picture:", err);
                    }
                }
            }
            const file = req.files.picture[0];
            // Handle path based on environment
            const isProduction = process.env.NODE_ENV === "production";
            picturePath = isProduction
                ? `/tmp/properties/${file.filename}` // Temporary path for Vercel
                : `/uploads/properties/${file.filename}`; // Local path for development
        }
        else if (req.body.removeOldPicture === "true") {
            if (picturePath) {
                const oldPath = path_1.default.join(__dirname, "../../public", picturePath.replace(/^\//, ""));
                if (fs_1.default.existsSync(oldPath)) {
                    try {
                        fs_1.default.unlinkSync(oldPath);
                    }
                    catch (err) {
                        console.error("Error deleting old property picture:", err);
                    }
                }
            }
            picturePath = null;
        }
        const existingRoomTypes = existingProperty.roomTypes || [];
        const existingIds = existingRoomTypes.map((r) => r.id);
        const incomingIds = parsedRoomTypes
            .map((r) => (r.id ? Number(r.id) : null))
            .filter((x) => x !== null);
        const toDelete = existingIds.filter((eid) => !incomingIds.includes(eid));
        if (toDelete.length > 0) {
            await prisma_1.prisma.peakSeason.deleteMany({
                where: { roomTypeId: { in: toDelete } },
            });
            await prisma_1.prisma.transaction.deleteMany({
                where: { roomTypeId: { in: toDelete } },
            });
            const roomTypesToDelete = existingRoomTypes.filter((r) => toDelete.includes(r.id));
            for (const rt of roomTypesToDelete) {
                if (rt.roomImg) {
                    const imgArray = Array.isArray(rt.roomImg) ? rt.roomImg : JSON.parse(rt.roomImg);
                    for (const imgPath of imgArray) {
                        const rel = imgPath.replace(/^\//, "");
                        const filePath = path_1.default.join(__dirname, "../../public", rel);
                        if (fs_1.default.existsSync(filePath)) {
                            fs_1.default.unlinkSync(filePath);
                        }
                    }
                }
            }
            await prisma_1.prisma.roomType.deleteMany({
                where: { id: { in: toDelete } },
            });
        }
        const updatedProperty = await prisma_1.prisma.property.update({
            where: { id: propertyId },
            data: {
                name,
                address,
                categoryId: categoryId ? Number(categoryId) : undefined,
                city: city || existingProperty.city,
                description: description ?? existingProperty.description,
                picture: picturePath,
                noRekening: noRekening || null,
                destinationBank: destinationBank || null,
            },
        });
        const files = req.files || {};
        for (let i = 0; i < parsedRoomTypes.length; i++) {
            const room = parsedRoomTypes[i];
            const roomName = room.roomName;
            const price = room.price !== undefined ? Number(room.price) : 0;
            const descriptionRoom = room.description || null;
            const quota = room.quota !== undefined ? Number(room.quota) : 1;
            const adultQty = room.adultQty !== undefined ? Number(room.adultQty) : 1;
            const childQty = room.childQty !== undefined ? Number(room.childQty) : 0;
            let roomImgArray = Array.isArray(room.roomImg) ? room.roomImg : [];
            const key = `roomImg_${i}`;
            const roomFiles = files[key] || [];
            if (roomFiles.length > 0) {
                // Handle path based on environment
                const isProduction = process.env.NODE_ENV === "production";
                const basePath = isProduction ? "/tmp/rooms/" : "/uploads/rooms/";
                const newPaths = roomFiles.map((file) => `${basePath}${file.filename}`);
                roomImgArray = [...roomImgArray, ...newPaths];
            }
            const roomImgData = roomImgArray.length > 0 ? roomImgArray : null;
            if (room.id) {
                const updateData = {
                    roomName,
                    price,
                    description: descriptionRoom,
                    quota,
                    adultQty,
                    childQty,
                };
                if (roomImgData !== null) {
                    updateData.roomImg = roomImgData;
                }
                await prisma_1.prisma.roomType.update({
                    where: { id: Number(room.id) },
                    data: updateData,
                });
            }
            else {
                const createData = {
                    propertyId: updatedProperty.id,
                    roomName,
                    price,
                    description: descriptionRoom,
                    quota,
                    adultQty,
                    childQty,
                };
                if (roomImgData !== null) {
                    createData.roomImg = roomImgData;
                }
                await prisma_1.prisma.roomType.create({
                    data: createData,
                });
            }
        }
        return res.json({
            message: "Property updated successfully",
            updatedProperty,
        });
    }
    catch (error) {
        console.error("Error updating property:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};
exports.updateProperty = updateProperty;
/* ================================================
   CREATE PROPERTY (SERAGAM FORMAT UPLOAD)
================================================ */
const createProperty = async (req, res) => {
    try {
        const user = req.user;
        if (user.role !== "TENANT") {
            return res
                .status(403)
                .json({ message: "Hanya tenant yang bisa membuat properti" });
        }
        const { name, categoryId, description, address, city, noRekening, destinationBank, roomTypes, } = req.body;
        const files = req.files;
        if (!name || !categoryId || !address || !city) {
            return res
                .status(400)
                .json({ message: "Field wajib tidak boleh kosong" });
        }
        if (!noRekening || noRekening.trim() === "") {
            return res.status(400).json({ message: "noRekening is required" });
        }
        if (!destinationBank || destinationBank.trim() === "") {
            return res.status(400).json({ message: "destinationBank is required" });
        }
        let picturePath = null;
        if (files?.picture && files.picture[0]) {
            // Handle path based on environment
            const isProduction = process.env.NODE_ENV === "production";
            picturePath = isProduction
                ? `/tmp/properties/${files.picture[0].filename}` // Temporary path for Vercel
                : `/uploads/properties/${files.picture[0].filename}`; // Local path for development
        }
        const property = await prisma_1.prisma.property.create({
            data: {
                name,
                categoryId: Number(categoryId),
                description,
                picture: picturePath,
                address,
                city,
                userId: user.id,
                noRekening: noRekening || null,
                destinationBank: destinationBank || null,
            },
        });
        if (roomTypes) {
            const parsedRoomTypes = JSON.parse(roomTypes);
            for (let i = 0; i < parsedRoomTypes.length; i++) {
                const room = parsedRoomTypes[i];
                const newRoomType = await prisma_1.prisma.roomType.create({
                    data: {
                        propertyId: property.id,
                        roomName: room.roomName,
                        price: Number(room.price),
                        description: room.description || null,
                        quota: Number(room.quota),
                        adultQty: Number(room.adultQty),
                        childQty: Number(room.childQty),
                    },
                });
                const roomImgKey = `roomImg_${i}`;
                if (files && files[roomImgKey]) {
                    // Handle path based on environment
                    const isProduction = process.env.NODE_ENV === "production";
                    const basePath = isProduction ? "/tmp/rooms/" : "/uploads/rooms/";
                    const imgPaths = files[roomImgKey].map(file => `${basePath}${file.filename}`);
                    await prisma_1.prisma.roomType.update({
                        where: { id: newRoomType.id },
                        data: {
                            roomImg: imgPaths.length > 0 ? imgPaths : undefined,
                        },
                    });
                }
            }
        }
        return res
            .status(201)
            .json({ message: "Properti berhasil dibuat", property });
    }
    catch (error) {
        console.error("Error creating property:", error);
        return res.status(500).json({ message: "Gagal membuat properti" });
    }
};
exports.createProperty = createProperty;
