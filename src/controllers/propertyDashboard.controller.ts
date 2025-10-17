import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { AuthenticatedUser } from "@/types/express";
import path from "path";
import fs from "fs";

// GET /api/property-categories
export const getPropertyCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.propertyCategory.findMany({
      orderBy: { category: "asc" },
    });
    return res.json(categories);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Gagal mengambil kategori properti" });
  }
};

// GET /api/properties/my
export const getMyProperties = async (req: Request, res: Response) => {
  try {
    const user = req.user as AuthenticatedUser;
    if (!user?.id) return res.status(401).json({ error: "Unauthorized" });

    const userId = user.id;
    const { search = "", categoryId, page = "1", perPage = "6" } = req.query;

    const pageNum = Number(page) || 1;
    const perPageNum = Number(perPage) || 6;

    const where: any = {
      userId,
      name: { contains: search as string },
    };

    if (categoryId) {
      const catId = Number(categoryId);
      if (!isNaN(catId)) where.categoryId = catId;
    }

    const total = await prisma.property.count({ where });

    const properties = await prisma.property.findMany({
      where,
      include: { category: true, roomTypes: true },
      skip: (pageNum - 1) * perPageNum,
      take: perPageNum,
      orderBy: { createdAt: "desc" },
    });

    return res.json({ data: properties, total });
  } catch (err) {
    console.error("Error getMyProperties:", err);
    return res.status(500).json({ error: "Gagal mengambil properti" });
  }
};

// DELETE /api/properties/:id
export const deleteProperty = async (req: Request, res: Response) => {
  try {
    const user = req.user as AuthenticatedUser;
    if (!user?.id) return res.status(401).json({ error: "Unauthorized" });

    const propertyId = Number(req.params.id);
    const prop = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        roomTypes: {
          include: {
            peakSeasons: true,
            transactions: true
          }
        },
        reviews: true
      }
    });

    if (!prop || prop.userId !== user.id)
      return res.status(403).json({ error: "Tidak bisa menghapus property ini" });

    // Check if property has active transactions
    const hasActiveTransactions = prop.roomTypes.some(roomType =>
      roomType.transactions.some(transaction =>
        transaction.status === 'WAITING_FOR_PAYMENT' ||
        transaction.status === 'WAITING_FOR_CONFIRMATION' ||
        transaction.status === 'ACCEPTED'
      )
    );

    if (hasActiveTransactions) {
      return res.status(400).json({
        error: "Tidak dapat menghapus properti yang memiliki transaksi aktif"
      });
    }
    // 1. Delete peak seasons for all room types
    for (const roomType of prop.roomTypes) {
      await prisma.peakSeason.deleteMany({
        where: { roomTypeId: roomType.id }
      });
    }

    // 2. Delete transactions for all room types (only cancelled ones should remain)
    for (const roomType of prop.roomTypes) {
      await prisma.transaction.deleteMany({
        where: { roomTypeId: roomType.id }
      });
    }

    // 3. Delete reviews
    await prisma.review.deleteMany({
      where: { propertyId: propertyId }
    });

    // 4. Delete room types
    await prisma.roomType.deleteMany({
      where: { propertyId: propertyId }
    });

    // 5. Finally delete the property
    await prisma.property.delete({ where: { id: propertyId } });

    return res.json({ message: "Property berhasil dihapus" });
  } catch (err) {
    console.error("Error deleteProperty:", err);
    return res.status(500).json({ error: "Gagal menghapus property" });
  }
};

export const updateProperty = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, address, categoryId, roomTypes, removeOldPicture } = req.body;

    // Parse roomTypes dari JSON string
    const parsedRoomTypes = roomTypes ? JSON.parse(roomTypes) : [];

    // Cari property lama
    const existingProperty = await prisma.property.findUnique({
      where: { id: Number(id) },
      include: { roomTypes: true },
    });

    if (!existingProperty) {
      return res.status(404).json({ message: "Property not found" });
    }

    // Handle gambar baru
    let picturePath = existingProperty.picture;
    if (req.file) {
      // hapus gambar lama jika ada
      if (existingProperty.picture) {
        const oldPath = path.join(__dirname, "../../", existingProperty.picture);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      picturePath = `uploads/properties/${req.file.filename}`;
    } else if (removeOldPicture === "true") {
      // hapus gambar lama jika user hapus
      if (existingProperty.picture) {
        const oldPath = path.join(__dirname, "../../", existingProperty.picture);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      picturePath = null;
    }

    // Update data property
    const updatedProperty = await prisma.property.update({
      where: { id: Number(id) },
      data: {
        name,
        address,
        categoryId: Number(categoryId),
        picture: picturePath,
      },
    });

    // Update RoomTypes (hapus lama → buat baru)
    await prisma.roomType.deleteMany({
      where: { propertyId: Number(id) },
    });

    if (parsedRoomTypes.length > 0) {
      await prisma.roomType.createMany({
        data: parsedRoomTypes.map((room: any) => ({
          propertyId: Number(id),
          roomName: room.roomName,
          price: Number(room.price),
          description: room.description || null,
          roomImg: room.roomImg || null,
          quota: Number(room.quota) || 1,
          adultQty: Number(room.adultQty) || 1,
          childQty: Number(room.childQty) || 0,
        })),
      });
    }

    return res.json({
      message: "Property updated successfully",
      updatedProperty,
    });
  } catch (error) {
    console.error("Error updating property:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const createProperty = async (req: Request, res: Response) => {
  try {
    const user = req.user as AuthenticatedUser;
    if (user.role !== "TENANT") {
      return res.status(403).json({ message: "Hanya tenant yang bisa membuat properti" });
    }

    const { name, categoryId, description, address, city, roomTypes } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!name || !categoryId || !address || !city) {
      return res.status(400).json({ message: "Field wajib tidak boleh kosong" });
    }

    // Handle property picture
    let picturePath = null;
    if (files?.picture && files.picture[0]) {
      picturePath = `/uploads/properties/${files.picture[0].filename}`;
    }

    // Create property first
    const property = await prisma.property.create({
      data: {
        name,
        categoryId: Number(categoryId),
        description,
        picture: picturePath,
        address,
        city,
        userId: user.id,
      },
    });

    // Parse and create room types
    if (roomTypes) {
      const parsedRoomTypes = JSON.parse(roomTypes);

      for (let i = 0; i < parsedRoomTypes.length; i++) {
        const room = parsedRoomTypes[i];
        let roomImgPath = null;

        // Handle room image
        const roomImgKey = `roomImg_${i}`;
        if (files && files[roomImgKey] && files[roomImgKey][0]) {
          roomImgPath = `/uploads/properties/${files[roomImgKey][0].filename}`;
        }

        await prisma.roomType.create({
          data: {
            propertyId: property.id,
            roomName: room.roomName,
            price: Number(room.price),
            description: room.description || null,
            roomImg: roomImgPath,
            quota: Number(room.quota),
            adultQty: Number(room.adultQty),
            childQty: Number(room.childQty),
          },
        });
      }
    }

    return res.status(201).json({ message: "Properti berhasil dibuat", property });
  } catch (error) {
    console.error("Error creating property:", error);
    return res.status(500).json({ message: "Gagal membuat properti" });
  }
};
