import { Request, Response } from "express";
import axios from "axios";

const OPENCAGE_API_KEY = process.env.OPENCAGE_API_KEY;
const OPENCAGE_BASE_URL = "https://api.opencagedata.com/geocode/v1/json";

export const reverseGeocode = async (req: Request, res: Response) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ message: "Latitude and longitude are required" });
  }

  try {
    const response = await axios.get(OPENCAGE_BASE_URL, {
      params: {
        q: `${lat},${lng}`,
        key: OPENCAGE_API_KEY,
        language: "id",
        pretty: 1,
      },
    });

    const data = response.data;

    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      const components = result.components;
      const city = components.city || components.town || components.village || components.county || "Unknown";
      const formattedAddress = result.formatted;

      return res.json({
        city,
        address: formattedAddress,
        components,
        lat: parseFloat(lat as string),
        lng: parseFloat(lng as string),
      });
    } else {
      return res.status(404).json({ message: "No location found for the given coordinates" });
    }
  } catch (error: any) {
    console.error("OpenCage API error:", error.response?.data || error.message);
    return res.status(500).json({ message: "Failed to fetch location data", error: error.message });
  }
};

export const forwardGeocode = async (req: Request, res: Response) => {
  const { address } = req.query;

  if (!address) {
    return res.status(400).json({ message: "Address is required" });
  }

  try {
    const response = await axios.get(OPENCAGE_BASE_URL, {
      params: {
        q: address,
        key: OPENCAGE_API_KEY,
        language: "id",
        pretty: 1,
      },
    });

    const data = response.data;

    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      const geometry = result.geometry;

      return res.json({
        lat: geometry.lat,
        lng: geometry.lng,
        address: result.formatted,
        components: result.components,
      });
    } else {
      return res.status(404).json({ message: "No coordinates found for the given address" });
    }
  } catch (error) {
    console.error("OpenCage API error:", error);
    return res.status(500).json({ message: "Failed to fetch coordinates" });
  }
};
