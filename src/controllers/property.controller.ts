import { Request, Response } from "express";
import { prisma } from "../config/prisma";


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
