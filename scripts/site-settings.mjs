export const isDevelopment = process.env.DOCUSAURUS_DEPLOYMENT === 'development';
export const baseUrl = isDevelopment ? '/spatial-docs/' : '/';
export const developmentNotice = 'Development version — not the official LongitudeOne documentation.';
