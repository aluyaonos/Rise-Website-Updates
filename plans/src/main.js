import { createManagedInvestingSection } from "./sections/managed-investing.js";
import { createGrowthPlansSection } from "./sections/growth-plans.js?v=76";
import { createMoreWaysSection } from "./sections/more-ways.js?v=2";
import { initializeStaggeredText } from "./interactions/staggered-text.js";
import { initializePlanReader } from "./interactions/plan-reader.js?v=67";
import { createInvestmentOfferingsSection } from "./sections/investment-offerings.js?v=2";
import { initializeInvestmentOfferings } from "./interactions/investment-offerings.js?v=2";
import { createWalletStory, createCustomerStories } from "./sections/wallet-story.js";
import { initializeWalletStory } from "./interactions/wallet-story.js";
import { initializeGrowthWords } from "./interactions/growth-words.js?v=7";

const app = document.querySelector("#app");

app.append(
  createManagedInvestingSection(),
  createGrowthPlansSection(),
  createMoreWaysSection(),
  createInvestmentOfferingsSection(),
  createWalletStory(),
  createCustomerStories(),
);
export const applyGrowthWords = initializeGrowthWords(document.querySelector("#growth-plans-title"));
// Measure line breaks only after Tomato Grotesk has resolved.
document.fonts.ready.then(initializeStaggeredText);
initializePlanReader();
initializeInvestmentOfferings();
initializeWalletStory();
