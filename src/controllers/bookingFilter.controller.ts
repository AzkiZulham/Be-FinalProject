import { Request, Response } from 'express';
import axios from 'axios';
import { prisma } from '../config/prisma';
import dotenv from 'dotenv';

dotenv.config();

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

export const searchProperties = async (req: Request, res: Response) => {
  try {
    const { city, checkIn, checkOut, location, adultQty, childQty, roomQty } = req.body;

    console.log('Search request:', { city, checkIn, checkOut, location, adultQty, childQty, roomQty });

    const properties = await prisma.property.findMany({
      include: {
        category: true,
        roomTypes: {
          select: {
            price: true,
          },
        },
      },
    });

    let searchResults = properties;

    if (city) {
      searchResults = searchResults.filter((property: any) =>
        property.name.toLowerCase().includes(city.toLowerCase()) ||
        property.address.toLowerCase().includes(city.toLowerCase()) ||
        property.city.toLowerCase().includes(city.toLowerCase())
      );
    }

    if (location && location.lat && location.lng) {
      const userLat = parseFloat(location.lat);
      const userLng = parseFloat(location.lng);

      searchResults = searchResults
        .map((property: any) => {
          let distance = null;
          if (property.latitude && property.longitude) {
            const propLat = parseFloat(property.latitude);
            const propLng = parseFloat(property.longitude);
            distance = getDistance(userLat, userLng, propLat, propLng);
          }
          return { ...property, distance };
        })
        .filter((property: any) => property.distance !== null) 
        .sort((a: any, b: any) => (a.distance || 0) - (b.distance || 0)); 
    }

    const formattedResults = searchResults.slice(0, 12).map((property: any) => ({
      id: property.id,
      name: property.name,
      address: property.address,
      city: property.city,
      category: property.category.category,
      picture: property.picture,
      price: property.roomTypes.length > 0 ? Math.min(...property.roomTypes.map((rt: any) => rt.price)) : null,
      availableRooms: property.roomTypes.length,
      distance: property.distance || null,
    }));

    res.json({
      success: true,
      data: formattedResults,
      pagination: {
        total: searchResults.length,
        page: 1,
        limit: 12,
        totalPages: Math.ceil(searchResults.length / 12),
      },
      searchCriteria: {
        city,
        checkIn,
        checkOut,
        location,
        adultQty,
        childQty,
        roomQty
      }
    });

  } catch (error) {
    console.error('Search API error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getCities = async (req: Request, res: Response) => {
  try {
    const cityOptions = [
      { value: "jakarta", label: "Jakarta", lat: -6.2, lng: 106.8 },
      { value: "bandung", label: "Bandung", lat: -6.9, lng: 107.6 },
      { value: "bali", label: "Bali", lat: -8.65, lng: 115.2 },
      { value: "surabaya", label: "Surabaya", lat: -7.25, lng: 112.7 },
      { value: "yogyakarta", label: "Yogyakarta", lat: -7.8, lng: 110.36 },
      { value: "bogor", label: "Bogor", lat: -6.6, lng: 106.8 },
      { value: "semarang", label: "Semarang", lat: -6.97, lng: 110.42 },
      { value: "medan", label: "Medan", lat: 3.59, lng: 98.67 },
      { value: "makassar", label: "Makassar", lat: -5.14, lng: 119.42 },
      { value: "palembang", label: "Palembang", lat: -2.99, lng: 104.76 }
    ];

    res.json({
      success: true,
      data: cityOptions
    });

  } catch (error) {
    console.error('Get cities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cities',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getCurrentLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
      return;
    }

    const apiKey = process.env.OPENCAGE_API_KEY;
    if (!apiKey) {
      res.status(500).json({
        success: false,
        message: 'OpenCage API key not configured'
      });
      return;
    }

    const response = await axios.get(`https://api.opencagedata.com/geocode/v1/json`, {
      params: {
        q: `${lat},${lng}`,
        key: apiKey,
        language: 'id', 
        pretty: 1
      }
    });

    if (response.data.results && response.data.results.length > 0) {
      const result = response.data.results[0];
      const components = result.components;

      let city = components.city || components.town || components.village ||
                 components.county || components.state_district;

      if (city) {
        city = city.replace(/^Kota\s+/i, '').trim();
      }

      res.json({
        success: true,
        data: {
          city: city || 'Unknown',
          fullAddress: result.formatted,
          components: components
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

  } catch (error) {
    console.error('Geolocation API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get location information',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
