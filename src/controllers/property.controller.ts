import { Request, Response } from "express";
import { prisma } from "../config/prisma";

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

export const getPropertyById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const property = await prisma.property.findUnique({
      where: { id: Number(id) },
      include: {
        roomTypes: {
          include: {
            peakSeasons: true
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


