// Temporary test - you can delete after
import { getSectorCategory, getArticleCategories } from '../sector-mapper';

console.log(getSectorCategory('Artificial Intel [AI]')); // Should log "Technology"
console.log(getSectorCategory('Trade Shows')); // Should log "Business"
console.log(getArticleCategories(['Artificial Intel [AI]', 'Digitalization'])); 
// Should log ["Technology"]