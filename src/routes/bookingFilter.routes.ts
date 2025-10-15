import { Router } from 'express';
import { searchProperties, getCities } from '../controllers/bookingFilter.controller';

const router = Router();


router.post('/search', searchProperties);
router.get('/cities', getCities);

export default router;
