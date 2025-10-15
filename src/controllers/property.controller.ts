import { Request, Response } from "express";
import { prisma } from "../config/prisma";

//  Hitung harga booking
export const calculateBookingPrice = async (req: Request, res: Response) => {
  const { roomId, checkIn, checkOut, qty } = req.body;

  try {
    const room = await prisma.roomType.findUnique({
      where: { id: Number(roomId) },
      include: { peakSeasons: true }
    });

    if (!room) return res.status(404).json({ message: "Room not found" });

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (checkOutDate <= checkInDate) {
      return res.status(400).json({ message: "Check-out must be after check-in" });
    }

    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

    let total = 0;
    let normalNights = 0;
    let peakNights = 0;
    let normalTotal = 0;
    let peakTotal = 0;

    for (let i = 0; i < nights; i++) {
      const nightDate = new Date(checkInDate);
      nightDate.setDate(checkInDate.getDate() + i);
      let price = room.price;

      const applicableSeason = room.peakSeasons.find(season => {
        const start = new Date(season.startDate);
        const end = new Date(season.endDate);
        return nightDate >= start && nightDate <= end;
      });

      if (applicableSeason) {
        if (applicableSeason.nominal) {
          price += applicableSeason.nominal;
        } else if (applicableSeason.percentage) {
          price *= (1 + applicableSeason.percentage / 100);
        }
        peakNights++;
        peakTotal += price;
      } else {
        normalNights++;
        normalTotal += price;
      }
      total += price;
    }

    total *= qty;
    normalTotal *= qty;
    peakTotal *= qty;

    return res.json({
      total,
      nights,
      normalNights,
      peakNights,
      normalTotal,
      peakTotal,
      perNight: total / qty / nights
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Detail properti
export const getPropertyById = async (req: Request, res: Response) => {
  const { id } = req.params;

  // Validasi id
  const propertyId = Number(id);
  if (isNaN(propertyId)) {
    return res.status(400).json({ message: "ID property tidak valid" });
  }

  try {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        roomTypes: {
          include: {
            peakSeasons: true,
            transactions: true
          }
        },
        reviews: {
          include: {
            user: true
          }
        }
      }
    });

    if (!property) return res.status(404).json({ message: "Property tidak ditemukan" });

    const formattedReviews = property.reviews.map(r => ({
      id: r.id,
      userName: r.user.username,
      date: r.createdAt.toISOString().split("T")[0],
      comment: r.comment,
      likes: 0,
      verified: r.user.isVerified
    }));

    const formattedProperty = {
      ...property,
      reviewCount: formattedReviews.length,
      images: property.picture ? [property.picture] : [],
      amenities: [],
      roomtypes: property.roomTypes.map(room => ({
        id: room.id,
        roomName: room.roomName,
        price: room.price,
        description: room.description,
        images: room.roomImg ? [room.roomImg] : [],
        quota: room.quota,
        availableRooms: room.quota - room.transactions.length,
        peakSeasons: room.peakSeasons.map(p => ({
          startDate: p.startDate.toISOString().split("T")[0],
          endDate: p.endDate.toISOString().split("T")[0],
          nominal: p.nominal,
          percentage: p.percentage
        }))
      }))
    };

    return res.json({ property: formattedProperty, reviews: formattedReviews });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};


// Top properties berdasarkan total transaksi
export const getTopProperties = async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 6;

    if (limit <= 0) {
      return res.status(400).json({ message: "Limit must be greater than 0" });
    }

    const properties = await prisma.property.findMany({
      take: limit,
      include: {
        roomTypes: {
          include: {
            transactions: true, 
          },
        },
        reviews: true,
      },
    });

    const mappedProperties = properties.map((prop) => {
      // hanya hitung transaksi ACCEPTED
      const totalTransactions = prop.roomTypes.reduce(
        (acc, room) =>
          acc +
          room.transactions.filter((t) => t.status === "ACCEPTED").length,
        0
      );

      const minPrice = prop.roomTypes.length
        ? Math.min(...prop.roomTypes.map((r) => r.price))
        : null;

      // untuk availableRooms, bisa tetap hitung semua transaksi termasuk non-ACCEPTED
      const availableRooms = prop.roomTypes.reduce(
        (acc, room) =>
          acc +
          (room.quota -
            room.transactions.filter((t) => t.status === "ACCEPTED").length),
        0
      );

      const rating = prop.reviews.length
        ? prop.reviews.reduce((sum, r) => sum + (r.comment ? 1 : 0), 0) /
          prop.reviews.length
        : null;

      return {
        id: prop.id,
        name: prop.name,
        address: prop.address,
        picture: prop.picture,
        price: minPrice,
        availableRooms,
        rating,
        reviewCount: prop.reviews.length,
        totalTransactions,
      };
    });

    // Urutkan totalTransactions
    mappedProperties.sort((a, b) => b.totalTransactions - a.totalTransactions);

    return res.json({ success: true, data: mappedProperties });
  } catch (err) {
    console.error("Error in getTopProperties:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

