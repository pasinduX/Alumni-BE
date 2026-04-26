"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAlumniOfTheDay = getAlumniOfTheDay;
const publicService_1 = require("../services/publicService");
async function getAlumniOfTheDay(req, res, next) {
    try {
        const profile = await (0, publicService_1.getAlumniOfTheDay)();
        if (!profile) {
            return res.status(404).json({ message: "No alumni of the day" });
        }
        return res.json(profile);
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=publicController.js.map