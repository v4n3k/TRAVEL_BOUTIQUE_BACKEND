import express from "express";
import { default as ExcursionController, default as excursionController } from "../controllers/excursion.controller.js";

export const router = express.Router();

router.get("/excursions", ExcursionController.getExcursions);
router.post("/excursion", excursionController.createNewExcursion);

