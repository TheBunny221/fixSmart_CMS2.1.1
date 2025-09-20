import express from 'express';
import { getComplaintSummary } from '../controller/complaintSummary.js';

const router = express.Router();

router.get('/ward-dashboard-stats', getComplaintSummary);

export default router;
