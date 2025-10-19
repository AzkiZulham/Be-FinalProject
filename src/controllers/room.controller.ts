import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { AuthenticatedUser } from "@/types/express";

export const getAllRooms = async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyId } = req.query;
    const user = req.user as AuthenticatedUser;

    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const rooms = await prisma.roomType.findMany({
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
  } catch (error) {
    console.error("Error fetching rooms:", error);
    res.status(500).json({ message: "Failed to fetch rooms" });
  }
};

export const createRoom = async (req: Request, res: Response) => {
  try {
    const { propertyId, roomName, price, description, quota, adultQty, childQty } = req.body;
    const files = req.files as Express.Multer.File[];

    let roomImgPaths: string[] = [];
    if (files && files.length > 0) {
      roomImgPaths = files.map(file => `/uploads/rooms/${file.filename}`);
    }

    const newRoom = await prisma.roomType.create({
      data: {
        propertyId: Number(propertyId),
        roomName,
        price: Number(price),
        description,
        quota: Number(quota) || 1,
        adultQty: Number(adultQty) || 1,
        childQty: Number(childQty) || 0,
        roomImg: roomImgPaths.length > 0 ? JSON.stringify(roomImgPaths) : null,
      },
    });

    res.status(201).json({
      message: "Room berhasil dibuat",
      room: newRoom,
    });
  } catch (error) {
    console.error("Error creating room:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getRoomById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user as AuthenticatedUser;

    const room = await prisma.roomType.findUnique({
      where: {
        id: Number(id),
        property: {
          userId: user.id
        }
      },
    });

    if (!room) return res.status(404).json({ message: "Room tidak ditemukan" });

    return res.status(200).json(room);
  } catch (error) {
    console.error("Error fetching room:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const updateRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user as AuthenticatedUser;
    const { roomName, price, description, quota, adultQty, childQty } = req.body;
    const files = req.files as Express.Multer.File[];

    let roomImgPaths: string[] = [];
    if (files && files.length > 0) {
      roomImgPaths = files.map(file => `/uploads/rooms/${file.filename}`);
    }

    const updated = await prisma.roomType.update({
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
        ...(roomImgPaths.length > 0 && { roomImg: JSON.stringify(roomImgPaths) }),
      },
    });

    res.status(200).json({
      message: "Room berhasil diupdate",
      room: updated,
    });
  } catch (error) {
    console.error("Error updating room:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const deleteRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user as AuthenticatedUser;

    const room = await prisma.roomType.findUnique({
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

    await prisma.roomType.delete({
      where: {
        id: Number(id),
        property: {
          userId: user.id
        }
      },
    });

    res.status(200).json({ message: "Room berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting room:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
