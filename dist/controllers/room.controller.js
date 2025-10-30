"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRoom = exports.updateRoom = exports.getRoomById = exports.createRoom = exports.getAllRooms = void 0;
const prisma_1 = require("../config/prisma");
const getAllRooms = async (req, res) => {
    try {
        const { propertyId } = req.query;
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const rooms = await prisma_1.prisma.roomType.findMany({
            where: {
                property: {
                    userId: user.id
                },
                ...(propertyId && { propertyId: Number(propertyId) })
            },
            include: { property: { select: { id: true, name: true, address: true, city: true } } },
        });
        const roomsWithLocation = rooms.map(room => ({
            ...room,
            property: {
                ...room.property,
                location: `${room.property.address}, ${room.property.city}`
            }
        }));
        res.json({ rooms: roomsWithLocation });
    }
    catch (error) {
        console.error("Error fetching rooms:", error);
        res.status(500).json({ message: "Failed to fetch rooms" });
    }
};
exports.getAllRooms = getAllRooms;
const createRoom = async (req, res) => {
    try {
        const { propertyId, roomName, price, description, quota, adultQty, childQty } = req.body;
        const files = req.files;
        let roomImgPaths = [];
        if (files && files.length > 0) {
            roomImgPaths = files.map(file => `/uploads/rooms/${file.filename}`);
        }
        const newRoom = await prisma_1.prisma.roomType.create({
            data: {
                propertyId: Number(propertyId),
                roomName,
                price: Number(price),
                description,
                quota: Number(quota) || 1,
                adultQty: Number(adultQty) || 1,
                childQty: Number(childQty) || 0,
                roomImg: roomImgPaths.length > 0 ? roomImgPaths : undefined,
            },
        });
        res.status(201).json({
            message: "Room berhasil dibuat",
            room: newRoom,
        });
    }
    catch (error) {
        console.error("Error creating room:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.createRoom = createRoom;
const getRoomById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const room = await prisma_1.prisma.roomType.findUnique({
            where: {
                id: Number(id),
                property: {
                    userId: user.id
                }
            },
        });
        if (!room)
            return res.status(404).json({ message: "Room tidak ditemukan" });
        return res.status(200).json(room);
    }
    catch (error) {
        console.error("Error fetching room:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.getRoomById = getRoomById;
const updateRoom = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const { roomName, price, description, quota, adultQty, childQty } = req.body;
        const files = req.files;
        let roomImgPaths = [];
        if (files && files.length > 0) {
            roomImgPaths = files.map(file => `/uploads/rooms/${file.filename}`);
        }
        const updated = await prisma_1.prisma.roomType.update({
            where: {
                id: Number(id),
                property: {
                    userId: user.id
                }
            },
            data: {
                roomName,
                price: Number(price),
                description,
                quota: Number(quota),
                adultQty: Number(adultQty),
                childQty: Number(childQty),
                ...(roomImgPaths.length > 0 && { roomImg: roomImgPaths }),
            },
        });
        res.status(200).json({
            message: "Room berhasil diupdate",
            room: updated,
        });
    }
    catch (error) {
        console.error("Error updating room:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.updateRoom = updateRoom;
const deleteRoom = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const room = await prisma_1.prisma.roomType.findUnique({
            where: {
                id: Number(id),
                property: {
                    userId: user.id
                }
            },
        });
        if (!room) {
            res.status(404).json({ message: "Room tidak ditemukan atau Anda tidak memiliki akses" });
            return;
        }
        await prisma_1.prisma.roomType.delete({
            where: {
                id: Number(id),
                property: {
                    userId: user.id
                }
            },
        });
        res.status(200).json({ message: "Room berhasil dihapus" });
    }
    catch (error) {
        console.error("Error deleting room:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.deleteRoom = deleteRoom;
