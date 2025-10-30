"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCities = exports.searchProperties = void 0;
const prisma_1 = require("../config/prisma");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// ======================
// SEARCH PROPERTIES
// ======================
const searchProperties = async (req, res) => {
    try {
        const { city, checkIn, checkOut, location, adultQty, childQty, roomQty } = req.body;
        // ======================
        // Ambil semua properti + relasi penting
        // ======================
        const properties = await prisma_1.prisma.property.findMany({
            include: {
                category: true,
                roomTypes: {
                    include: {
                        transactions: {
                            where: {
                                status: { in: ["WAITING_FOR_CONFIRMATION", "ACCEPTED"] },
                            },
                        },
                        peakSeasons: true,
                    },
                },
            },
        });
        let searchResults = properties;
        // ======================
        // Filter berdasarkan nama kota atau alamat
        // ======================
        if (city) {
            searchResults = searchResults.filter((property) => property.name.toLowerCase().includes(city.toLowerCase()) ||
                property.address.toLowerCase().includes(city.toLowerCase()) ||
                property.city.toLowerCase().includes(city.toLowerCase()));
        }
        // ======================
        // Filter berdasarkan ketersediaan kamar (checkIn/checkOut)
        // ======================
        if (checkIn && checkOut) {
            const checkInDate = new Date(checkIn);
            const checkOutDate = new Date(checkOut);
            searchResults = searchResults.filter((property) => {
                const availableRoomTypes = property.roomTypes.filter((room) => {
                    const relevantTransactions = room.transactions.filter((trx) => ["WAITING_FOR_CONFIRMATION", "ACCEPTED"].includes(trx.status));
                    const overlappingTransactions = relevantTransactions.some((trx) => {
                        const trxIn = new Date(trx.checkInDate);
                        const trxOut = new Date(trx.checkOutDate);
                        return checkInDate < trxOut && checkOutDate > trxIn;
                    });
                    const bookedQty = relevantTransactions
                        .filter((trx) => {
                        const trxIn = new Date(trx.checkInDate);
                        const trxOut = new Date(trx.checkOutDate);
                        return checkInDate < trxOut && checkOutDate > trxIn;
                    })
                        .reduce((sum, trx) => sum + trx.qty, 0);
                    const isDateAvailable = room.peakSeasons.every((season) => {
                        const seasonStart = new Date(season.startDate);
                        const seasonEnd = new Date(season.endDate);
                        const overlaps = checkInDate <= seasonEnd && checkOutDate >= seasonStart;
                        if (overlaps && season.isAvailable === false) {
                            return false;
                        }
                        return true;
                    });
                    return room.quota - bookedQty > 0 && isDateAvailable;
                });
                return availableRoomTypes.length > 0;
            });
        }
        // ======================
        // Hitung harga dengan peak season (jika ada)
        // ======================
        const now = new Date(checkIn || new Date());
        searchResults = searchResults.map((property) => {
            const updatedRoomTypes = property.roomTypes.map((room) => {
                const peak = room.peakSeasons.find((ps) => now >= new Date(ps.startDate) && now <= new Date(ps.endDate));
                let finalPrice = room.price;
                if (peak) {
                    if (peak.nominal)
                        finalPrice += peak.nominal;
                    if (peak.percentage)
                        finalPrice += room.price * (peak.percentage / 100);
                }
                return { ...room, price: Math.round(finalPrice) };
            });
            return { ...property, roomTypes: updatedRoomTypes };
        });
        // ======================
        // Format hasil
        // ======================
        const formattedResults = searchResults
            .slice(0, 12)
            .map((property) => ({
            id: property.id,
            name: property.name,
            address: property.address,
            city: property.city,
            category: property.category?.category || null,
            picture: property.picture,
            price: property.roomTypes.length > 0
                ? Math.min(...property.roomTypes.map((rt) => rt.price))
                : null,
            availableRooms: property.roomTypes.length,
            distance: property.distance || null,
        }));
        // ======================
        // Kirim hasil ke frontend
        // ======================
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
                roomQty,
            },
        });
    }
    catch (error) {
        console.error("Search API error:", error);
        res.status(500).json({
            success: false,
            message: "Search failed",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.searchProperties = searchProperties;
// ======================
// GET CITIES (untuk dropdown lokasi)
// ======================
const getCities = async (req, res) => {
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
            { value: "palembang", label: "Palembang", lat: -2.99, lng: 104.76 },
        ];
        res.json({ success: true, data: cityOptions });
    }
    catch (error) {
        console.error("Get cities error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get cities",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.getCities = getCities;
