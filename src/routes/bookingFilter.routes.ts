import { Router } from 'express';
import { searchProperties, getCities, getCurrentLocation } from '../controllers/bookingFilter.controller';

const router = Router();


router.post('/search', searchProperties);
router.get('/cities', getCities);
router.get('/location', getCurrentLocation);

export default router;
