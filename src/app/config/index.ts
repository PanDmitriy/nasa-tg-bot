import { developmentConfig } from './development';
import { productionConfig } from './production';

const isProduction = process.env.NODE_ENV === 'production';

export const config = isProduction ? productionConfig : developmentConfig; 