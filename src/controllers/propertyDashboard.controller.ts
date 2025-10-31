import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { AuthenticatedUser } from "@/types/express";
import path from "path";
import fs from "fs";

/* ================================================
   GET PROPERTY CATEGORIES
================================================ */
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

/* ================================================
   GET MY PROPERTIES
================================================ */
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

/* ================================================
   DELETE PROPERTY
================================================ */
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
            transactions: true,
          },
        },
        reviews: true,
      },
    });

    if (!prop || prop.userId !== user.id)
      return res.status(403).json({ error: "Tidak bisa menghapus property ini" });

    const hasActiveTransactions = prop.roomTypes.some((roomType) =>
      roomType.transactions.some(
        (transaction) =>
          transaction.status === "WAITING_FOR_PAYMENT" ||
          transaction.status === "WAITING_FOR_CONFIRMATION" ||
          transaction.status === "ACCEPTED"
      )
    );

    if (hasActiveTransactions) {
      return res.status(400).json({
        error: "Tidak dapat menghapus properti yang memiliki transaksi aktif",
      });
    }

    for (const roomType of prop.roomTypes) {
      await prisma.peakSeason.deleteMany({
        where: { roomTypeId: roomType.id },
      });
      await prisma.transaction.deleteMany({
        where: { roomTypeId: roomType.id },
      });
    }

    await prisma.review.deleteMany({
      where: { propertyId },
    });

    await prisma.roomType.deleteMany({
      where: { propertyId },
    });

    await prisma.property.delete({ where: { id: propertyId } });

    return res.json({ message: "Property berhasil dihapus" });
  } catch (err) {
    console.error("Error deleteProperty:", err);
    return res.status(500).json({ error: "Gagal menghapus property" });
  }
};

/* ================================================
   UPDATE PROPERTY (FINAL FIXED VERSION)
================================================ */
export const updateProperty = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      address,
      categoryId,
      city,
      description,
      noRekening,
      destinationBank,
      roomTypes,
    } = req.body;

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
      } catch (err) {
        console.error("Error parsing roomTypes JSON:", err);
        return res.status(400).json({ message: "Invalid roomTypes format" });
      }
    }

    const existingProperty = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { roomTypes: true },
    });

    if (!existingProperty) {
      return res.status(404).json({ message: "Property not found" });
    }

    let picturePath = existingProperty.picture;
    if (picturePath === "null") picturePath = null; 
    if (req.files && (req.files as any).picture) {
      if (picturePath) {
        const oldPath = path.join(__dirname, "../../public", picturePath.replace(/^\//, ""));
        if (fs.existsSync(oldPath)) {
          try {
            fs.unlinkSync(oldPath);
          } catch (err) {
            console.error("Error deleting old property picture:", err);
          }
        }
      }
      const file = (req.files as any).picture[0];
      // Upload to Vercel Blob in production, use local path in development
      if (process.env.NODE_ENV === "production") {
        const { uploadToBlob } = await import("../utils/uploader");
        picturePath = await uploadToBlob(file, "properties");
      } else {
        picturePath = `/uploads/properties/${file.filename}`;
      }
    } else if (req.body.removeOldPicture === "true") {
      if (picturePath) {
        const oldPath = path.join(__dirname, "../../public", picturePath.replace(/^\//, ""));
        if (fs.existsSync(oldPath)) {
          try {
            fs.unlinkSync(oldPath);
          } catch (err) {
            console.error("Error deleting old property picture:", err);
          }
        }
      }
      picturePath = null;
    }

    const existingRoomTypes = existingProperty.roomTypes || [];
    const existingIds = existingRoomTypes.map((r) => r.id);
    const incomingIds = parsedRoomTypes
      .map((r: any) => (r.id ? Number(r.id) : null))
      .filter((x: any) => x !== null);

    const toDelete = existingIds.filter((eid) => !incomingIds.includes(eid));

    if (toDelete.length > 0) {
      await prisma.peakSeason.deleteMany({
        where: { roomTypeId: { in: toDelete } },
      });
      await prisma.transaction.deleteMany({
        where: { roomTypeId: { in: toDelete } },
      });

      const roomTypesToDelete = existingRoomTypes.filter((r) => toDelete.includes(r.id));
      for (const rt of roomTypesToDelete) {
        if (rt.roomImg) {
          const imgArray = Array.isArray(rt.roomImg) ? rt.roomImg : JSON.parse(rt.roomImg as string);
          for (const imgPath of imgArray) {
            const rel = imgPath.replace(/^\//, "");
            const filePath = path.join(__dirname, "../../public", rel);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          }
        }
      }

      await prisma.roomType.deleteMany({
        where: { id: { in: toDelete } },
      });
    }

    const updatedProperty = await prisma.property.update({
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

    const files = (req.files as any) || {};

    for (let i = 0; i < parsedRoomTypes.length; i++) {
      const room = parsedRoomTypes[i];
      const roomName = room.roomName;
      const price = room.price !== undefined ? Number(room.price) : 0;
      const descriptionRoom = room.description || null;
      const quota = room.quota !== undefined ? Number(room.quota) : 1;
      const adultQty = room.adultQty !== undefined ? Number(room.adultQty) : 1;
      const childQty = room.childQty !== undefined ? Number(room.childQty) : 0;

      let roomImgArray: string[] = Array.isArray(room.roomImg) ? room.roomImg : [];

      const key = `roomImg_${i}`;
      const roomFiles = files[key] || [];

      if (roomFiles.length > 0) {
        // Upload to Vercel Blob in production, use local path in development
        if (process.env.NODE_ENV === "production") {
          const { uploadToBlob } = await import("../utils/uploader");
          const newPaths = await Promise.all(
            roomFiles.map((file: any) => uploadToBlob(file, "rooms"))
          );
          roomImgArray = [...roomImgArray, ...newPaths];
        } else {
          const newPaths = roomFiles.map((file: any) => `/uploads/rooms/${file.filename}`);
          roomImgArray = [...roomImgArray, ...newPaths];
        }
      }

      const roomImgData = roomImgArray.length > 0 ? roomImgArray : null;

      if (room.id) {
        const updateData: any = {
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
        await prisma.roomType.update({
          where: { id: Number(room.id) },
          data: updateData,
        });
      } else {
        const createData: any = {
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
        await prisma.roomType.create({
          data: createData,
        });
      }
    }

    return res.json({
      message: "Property updated successfully",
      updatedProperty,
    });
  } catch (error: any) {
    console.error("Error updating property:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


/* ================================================
   CREATE PROPERTY (SERAGAM FORMAT UPLOAD)
================================================ */
export const createProperty = async (req: Request, res: Response) => {
  try {
    const user = req.user as AuthenticatedUser;
    if (user.role !== "TENANT") {
      return res
        .status(403)
        .json({ message: "Hanya tenant yang bisa membuat properti" });
    }

    const {
      name,
      categoryId,
      description,
      address,
      city,
      noRekening,
      destinationBank,
      roomTypes,
    } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

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
      // Upload to Vercel Blob in production, use local path in development
      if (process.env.NODE_ENV === "production") {
        const { uploadToBlob } = await import("../utils/uploader");
        picturePath = await uploadToBlob(files.picture[0], "properties");
      } else {
        picturePath = `/uploads/properties/${files.picture[0].filename}`;
      }
    }

    const property = await prisma.property.create({
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
        const newRoomType = await prisma.roomType.create({
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
          // Upload to Vercel Blob in production, use local path in development
          if (process.env.NODE_ENV === "production") {
            const { uploadToBlob } = await import("../utils/uploader");
            const imgPaths = await Promise.all(
              files[roomImgKey].map((file: any) => uploadToBlob(file, "rooms"))
            );
            await prisma.roomType.update({
              where: { id: newRoomType.id },
              data: {
                roomImg: imgPaths.length > 0 ? imgPaths : undefined,
              },
            });
          } else {
            const imgPaths = files[roomImgKey].map((file: any) => `/uploads/rooms/${file.filename}`);
            await prisma.roomType.update({
              where: { id: newRoomType.id },
              data: {
                roomImg: imgPaths.length > 0 ? imgPaths : undefined,
              },
            });
          }
        }
      }
    }

    return res
      .status(201)
      .json({ message: "Properti berhasil dibuat", property });
  } catch (error) {
    console.error("Error creating property:", error);
    return res.status(500).json({ message: "Gagal membuat properti" });
  }
};
