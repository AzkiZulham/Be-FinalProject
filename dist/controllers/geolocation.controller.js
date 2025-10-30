"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.forwardGeocode = exports.reverseGeocode = void 0;
const axios_1 = __importDefault(require("axios"));
const OPENCAGE_API_KEY = process.env.OPENCAGE_API_KEY;
const OPENCAGE_BASE_URL = "https://api.opencagedata.com/geocode/v1/json";
const reverseGeocode = async (req, res) => {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
    }
    try {
        const response = await axios_1.default.get(OPENCAGE_BASE_URL, {
            params: {
                q: `${lat},${lng}`,
                key: OPENCAGE_API_KEY,
                language: "id",
                pretty: 1,
            },
        });
        const data = response.data;
        if (data.results && data.results.length > 0) {
            const sortedResults = data.results.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
            let bestResult = sortedResults[0];
            let bestCity = "";
            let bestConfidence = 0;
            for (const result of sortedResults) {
                const components = result.components;
                const confidence = result.confidence || 0;
                const category = result.components._category;
                const isAdministrative = !category || category === 'place' || category === 'boundary' ||
                    category === 'administrative';
                if (isAdministrative && confidence >= 7) {
                    const city = components.city || components.town || components.village ||
                        components.county || components.state_district || components.region;
                    if (city && confidence > bestConfidence) {
                        bestResult = result;
                        bestCity = city;
                        bestConfidence = confidence;
                    }
                }
            }
            if (!bestCity) {
                for (const result of sortedResults) {
                    const components = result.components;
                    const confidence = result.confidence || 0;
                    if (confidence >= 5) { // Lower threshold for second pass
                        const city = components.city || components.town || components.village ||
                            components.county || components.state_district || components.region;
                        if (city && confidence > bestConfidence) {
                            bestResult = result;
                            bestCity = city;
                            bestConfidence = confidence;
                        }
                    }
                }
            }
            if (!bestCity) {
                bestResult = sortedResults[0];
                const components = bestResult.components;
                bestCity = components.city || components.town || components.village ||
                    components.county || components.state_district || components.region || "Unknown";
            }
            const components = bestResult.components;
            let city = bestCity;
            city = city.replace(/^(Kota|Kabupaten|Kecamatan|Kelurahan|Desa)\s+/i, '').trim();
            const cityNormalizations = {
                'jakarta': 'Jakarta',
                'dki jakarta': 'Jakarta',
                'jakarta pusat': 'Jakarta',
                'jakarta utara': 'Jakarta',
                'jakarta timur': 'Jakarta',
                'jakarta selatan': 'Jakarta',
                'jakarta barat': 'Jakarta',
                'yogyakarta': 'Yogyakarta',
                'jogja': 'Yogyakarta',
                'jogjakarta': 'Yogyakarta',
                'surabaya': 'Surabaya',
                'bandung': 'Bandung',
                'semarang': 'Semarang',
                'medan': 'Medan',
                'makassar': 'Makassar',
                'palembang': 'Palembang',
                'bogor': 'Bogor',
                'depok': 'Depok',
                'tangerang': 'Tangerang',
                'bekasi': 'Bekasi',
                'malang': 'Malang',
                'solo': 'Solo',
                'surakarta': 'Solo',
                'padang': 'Padang',
                'bandar lampung': 'Bandar Lampung',
                'lampung': 'Bandar Lampung',
                'samarinda': 'Samarinda',
                'pekanbaru': 'Pekanbaru',
                'denpasar': 'Denpasar',
                'bali': 'Denpasar',
                'serang': 'Serang',
                'cirebon': 'Cirebon',
                'tasikmalaya': 'Tasikmalaya',
                'banjarmasin': 'Banjarmasin',
                'pontianak': 'Pontianak',
                'manado': 'Manado',
                'kupang': 'Kupang',
                'jayapura': 'Jayapura',
                'ambon': 'Ambon',
                'mataram': 'Mataram',
                'ternate': 'Ternate',
                'sofifi': 'Sofifi'
            };
            const lowerCity = city.toLowerCase();
            for (const [key, normalized] of Object.entries(cityNormalizations)) {
                if (lowerCity.includes(key)) {
                    city = normalized;
                    break;
                }
            }
            const latNum = parseFloat(lat);
            const lngNum = parseFloat(lng);
            if (latNum < -11 || latNum > 6 || lngNum < 95 || lngNum > 141) {
                console.warn(`Coordinates ${latNum},${lngNum} appear to be outside Indonesia bounds`);
            }
            const formattedAddress = bestResult.formatted;
            return res.json({
                city,
                address: formattedAddress,
                components,
                confidence: bestConfidence,
                lat: latNum,
                lng: lngNum,
            });
        }
        else {
            return res.status(404).json({ message: "No location found for the given coordinates" });
        }
    }
    catch (error) {
        console.error("OpenCage API error:", error.response?.data || error.message);
        return res.status(500).json({ message: "Failed to fetch location data", error: error.message });
    }
};
exports.reverseGeocode = reverseGeocode;
const forwardGeocode = async (req, res) => {
    const { address } = req.query;
    if (!address) {
        return res.status(400).json({ message: "Address is required" });
    }
    try {
        const response = await axios_1.default.get(OPENCAGE_BASE_URL, {
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
        }
        else {
            return res.status(404).json({ message: "No coordinates found for the given address" });
        }
    }
    catch (error) {
        console.error("OpenCage API error:", error);
        return res.status(500).json({ message: "Failed to fetch coordinates" });
    }
};
exports.forwardGeocode = forwardGeocode;
