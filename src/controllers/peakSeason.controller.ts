import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { AuthenticatedUser } from "@/types/express";

export const getPeakSeasons = async (req: Request, res: Response) => {
  try {
    const user = req.user as AuthenticatedUser;
    if (!user?.id) return res.status(401).json({ error: "Unauthorized" });

    const roomTypeId = Number(req.params.roomTypeId);

    // Check if room type belongs to the tenant
    const roomType = await prisma.roomType.findFirst({
      where: {
        id: roomTypeId,
        property: {
          userId: user.id
        }
      }
    });

    if (!roomType) {
      return res.status(403).json({ error: "Room type not found or access denied" });
    }

    const peakSeasons = await prisma.peakSeason.findMany({
      where: { roomTypeId },
      orderBy: { startDate: "asc" }
    });

    return res.json(peakSeasons);
  } catch (err) {
    console.error("Error getPeakSeasons:", err);
    return res.status(500).json({ error: "Failed to fetch peak seasons" });
  }
};

export const createPeakSeason = async (req: Request, res: Response) => {
  try {
    const user = req.user as AuthenticatedUser;
    if (!user?.id) return res.status(401).json({ error: "Unauthorized" });

    const { roomTypeId, startDate, endDate, isAvailable, percentage, nominal } = req.body;

    // Validate required fields
    if (!roomTypeId || !startDate || !endDate) {
      return res.status(400).json({ error: "roomTypeId, startDate, and endDate are required" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    if (start >= end) {
      return res.status(400).json({ error: "Start date must be before end date" });
    }

    // Check if room type belongs to the tenant
    const roomType = await prisma.roomType.findFirst({
      where: {
        id: Number(roomTypeId),
        property: {
          userId: user.id
        }
      }
    });

    if (!roomType) {
      return res.status(403).json({ error: "Room type not found or access denied" });
    }

    // Check for overlapping peak seasons
    const overlapping = await prisma.peakSeason.findFirst({
      where: {
        roomTypeId: Number(roomTypeId),
        OR: [
          {
            AND: [
              { startDate: { lte: start } },
              { endDate: { gt: start } }
            ]
          },
          {
            AND: [
              { startDate: { lt: end } },
              { endDate: { gte: end } }
            ]
          },
          {
            AND: [
              { startDate: { gte: start } },
              { endDate: { lte: end } }
            ]
          }
        ]
      }
    });

    if (overlapping) {
      return res.status(400).json({
        error: "Overlapping peak season exists for this date range"
      });
    }

    // Validate percentage and nominal
    if (percentage !== undefined && (percentage < 0 || percentage > 1000)) {
      return res.status(400).json({ error: "Percentage must be between 0 and 1000" });
    }

    if (nominal !== undefined && nominal < 0) {
      return res.status(400).json({ error: "Nominal must be positive" });
    }

    // If not available, percentage and nominal should be null
    const finalPercentage = isAvailable === false ? null : percentage;
    const finalNominal = isAvailable === false ? null : nominal;

    const peakSeason = await prisma.peakSeason.create({
      data: {
        roomTypeId: Number(roomTypeId),
        startDate: start,
        endDate: end,
        isAvailable: Boolean(isAvailable),
        percentage: finalPercentage,
        nominal: finalNominal
      }
    });

    return res.status(201).json(peakSeason);
  } catch (err) {
    console.error("Error createPeakSeason:", err);
    return res.status(500).json({ error: "Failed to create peak season" });
  }
};

export const deletePeakSeason = async (req: Request, res: Response) => {
  try {
    const user = req.user as AuthenticatedUser;
    if (!user?.id) return res.status(401).json({ error: "Unauthorized" });

    const peakSeasonId = Number(req.params.id);

    // Check if peak season belongs to tenant's room type
    const peakSeason = await prisma.peakSeason.findFirst({
      where: {
        id: peakSeasonId,
        roomType: {
          property: {
            userId: user.id
          }
        }
      }
    });

    if (!peakSeason) {
      return res.status(403).json({ error: "Peak season not found or access denied" });
    }

    await prisma.peakSeason.delete({
      where: { id: peakSeasonId }
    });

    return res.json({ message: "Peak season deleted successfully" });
  } catch (err) {
    console.error("Error deletePeakSeason:", err);
    return res.status(500).json({ error: "Failed to delete peak season" });
  }
};

export const getPeakSeasonHistory = async (req: Request, res: Response) => {
  try {
    const user = req.user as AuthenticatedUser;
    if (!user?.id) return res.status(401).json({ error: "Unauthorized" });

    const roomTypeId = Number(req.params.roomTypeId);

    // Check if room type belongs to the tenant
    const roomType = await prisma.roomType.findFirst({
      where: {
        id: roomTypeId,
        property: {
          userId: user.id
        }
      }
    });

    if (!roomType) {
      return res.status(403).json({ error: "Room type not found or access denied" });
    }

    // For now, return current peak seasons as history
    // In a real implementation, you might want to track changes in a separate table
    const history = await prisma.peakSeason.findMany({
      where: { roomTypeId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        isAvailable: true,
        percentage: true,
        nominal: true,
        updatedAt: true,
        createdAt: true
      }
    });

    // Format for frontend
    const formattedHistory = history.map(item => ({
      id: item.id,
      action: item.isAvailable
        ? (item.percentage || item.nominal ? "Updated pricing" : "Set as available")
        : "Set as unavailable",
      timestamp: item.updatedAt,
      details: `${new Date(item.startDate).toLocaleDateString()} - ${new Date(item.endDate).toLocaleDateString()}`
    }));

    return res.json(formattedHistory);
  } catch (err) {
    console.error("Error getPeakSeasonHistory:", err);
    return res.status(500).json({ error: "Failed to fetch peak season history" });
  }
};
