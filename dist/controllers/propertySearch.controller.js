"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPropertyCatalog = void 0;
const prisma_1 = require("../config/prisma");
const getPropertyCatalog = async (req, res) => {
    try {
        const { search = "", category = "", sortBy = "name", order = "asc", page = "1", limit = "9", } = req.query;
        const pageNumber = parseInt(page) || 1;
        const pageSize = parseInt(limit) || 9;
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { address: { contains: search } },
            ];
        }
        if (category) {
            where.category = {
                category: { contains: category }
            };
        }
        const total = await prisma_1.prisma.property.count({ where });
        let properties;
        if (sortBy === "price") {
            const allProperties = await prisma_1.prisma.property.findMany({
                where,
                include: {
                    category: true,
                    roomTypes: {
                        include: {
                            transactions: true,
                        },
                    },
                },
            });
            allProperties.sort((a, b) => {
                const minPriceA = a.roomTypes.length > 0 ? Math.min(...a.roomTypes.map(rt => rt.price)) : 0;
                const minPriceB = b.roomTypes.length > 0 ? Math.min(...b.roomTypes.map(rt => rt.price)) : 0;
                if (order === "asc") {
                    return minPriceA - minPriceB;
                }
                else {
                    return minPriceB - minPriceA;
                }
            });
            properties = allProperties.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
        }
        else if (sortBy === "transactionCount") {
            const allProperties = await prisma_1.prisma.property.findMany({
                where,
                include: {
                    category: true,
                    roomTypes: {
                        include: {
                            transactions: true,
                        },
                    },
                },
            });
            // Compute transaction count and filter properties with at least 1 transaction
            const propertiesWithTransactions = allProperties
                .map(p => ({
                ...p,
                transactionCount: p.roomTypes.reduce((sum, rt) => sum + rt.transactions.length, 0),
            }))
                .filter(p => p.transactionCount > 0)
                .sort((a, b) => {
                if (order === "asc") {
                    return a.transactionCount - b.transactionCount;
                }
                else {
                    return b.transactionCount - a.transactionCount;
                }
            });
            properties = propertiesWithTransactions.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
        }
        else {
            const orderBy = {};
            orderBy.name = order === "asc" ? "asc" : "desc";
            properties = await prisma_1.prisma.property.findMany({
                where,
                orderBy,
                skip: (pageNumber - 1) * pageSize,
                take: pageSize,
                include: {
                    category: true,
                    roomTypes: {
                        select: {
                            price: true,
                            transactions: true,
                        },
                    },
                },
            });
        }
        const formattedProperties = properties.map(property => {
            const transactionCount = sortBy === "transactionCount" ? property.roomTypes.reduce((sum, rt) => sum + rt.transactions.length, 0) : undefined;
            return {
                id: property.id,
                name: property.name,
                address: property.address,
                category: property.category.category,
                picture: property.picture,
                price: property.roomTypes.length > 0 ? Math.min(...property.roomTypes.map(rt => rt.price)) : null,
                availableRooms: property.roomTypes.length,
                transactionCount,
            };
        });
        return res.json({
            data: formattedProperties,
            pagination: {
                total,
                page: pageNumber,
                limit: pageSize,
                totalPages: Math.ceil(total / pageSize),
            },
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
    }
};
exports.getPropertyCatalog = getPropertyCatalog;
