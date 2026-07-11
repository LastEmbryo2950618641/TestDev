import { createDesktopPackagingToolRecommendation } from './desktop-packaging-tool-recommendation.js';
const result = createDesktopPackagingToolRecommendation();
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
