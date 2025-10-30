"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockAuthTenant = exports.mockAuthTenant2 = exports.mockAuthUser = void 0;
const mockAuthUser = (req, res, next) => {
    // Simulasi login sebagai USER (id=1)
    req.user = { id: 2, role: "USER" };
    next();
};
exports.mockAuthUser = mockAuthUser;
const mockAuthTenant2 = (req, res, next) => {
    // Simulasi login sebagai USER (id=1)
    req.user = { id: 5, role: "TENANT" };
    next();
};
exports.mockAuthTenant2 = mockAuthTenant2;
const mockAuthTenant = (req, res, next) => {
    // Simulasi login sebagai TENANT (id=2)
    req.user = { id: 1, role: "TENANT" };
    next();
};
exports.mockAuthTenant = mockAuthTenant;
