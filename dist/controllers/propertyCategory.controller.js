"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePropertyCategory = exports.updatePropertyCategory = exports.createPropertyCategory = void 0;
const prisma_1 = require("../config/prisma");
const createPropertyCategory = async (req, res) => {
    try {
        const { category } = req.body;
        if (!category) {
            return res.status(400).json({ message: "Category name is required" });
        }
        const existing = await prisma_1.prisma.propertyCategory.findFirst({
            where: { category },
        });
        if (existing) {
            return res.status(400).json({ message: "Category already exists" });
        }
        const newCategory = await prisma_1.prisma.propertyCategory.create({
            data: { category },
        });
        return res.status(201).json({
            message: "Category created successfully",
            category: newCategory,
        });
    }
    catch (error) {
        console.error("Error creating category:", error);
        return res.status(500).json({ message: "Failed to create category" });
    }
};
exports.createPropertyCategory = createPropertyCategory;
const updatePropertyCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { category } = req.body;
        if (!category) {
            return res.status(400).json({ message: "Category name is required" });
        }
        const existing = await prisma_1.prisma.propertyCategory.findUnique({
            where: { id: Number(id) },
        });
        if (!existing) {
            return res.status(404).json({ message: "Category not found" });
        }
        const updatedCategory = await prisma_1.prisma.propertyCategory.update({
            where: { id: Number(id) },
            data: { category },
        });
        return res.status(200).json({
            message: "Category updated successfully",
            category: updatedCategory,
        });
    }
    catch (error) {
        console.error("Error updating category:", error);
        return res.status(500).json({ message: "Failed to update category" });
    }
};
exports.updatePropertyCategory = updatePropertyCategory;
const deletePropertyCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma_1.prisma.propertyCategory.findUnique({
            where: { id: Number(id) },
        });
        if (!existing) {
            return res.status(404).json({ message: "Category not found" });
        }
        // Optional: check if category still used by any property
        const used = await prisma_1.prisma.property.findFirst({
            where: { categoryId: Number(id) },
        });
        if (used) {
            return res.status(400).json({
                message: "Category cannot be deleted because it is used by properties",
            });
        }
        await prisma_1.prisma.propertyCategory.delete({
            where: { id: Number(id) },
        });
        return res.status(200).json({ message: "Category deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting category:", error);
        return res.status(500).json({ message: "Failed to delete category" });
    }
};
exports.deletePropertyCategory = deletePropertyCategory;
