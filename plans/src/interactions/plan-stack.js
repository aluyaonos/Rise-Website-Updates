const clamp = value => Math.min(1, Math.max(0, value));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = value => value * value * (3 - 2 * value);
const CARD_TIMELINE_UNITS = 7;
const CARD_PHASE_UNITS = 2;
const CARD_EXIT_UNITS = 3;
const CARD_GAP_MULTIPLIER = 1.56;
const MAX_STACK_STEP = 0.084;
const TWO_CARD_SCALE_RATIO = 0.88;
const THREE_CARD_PURPLE_SCALE = 0.87;
const THREE_CARD_YELLOW_RATIO = 0.84;
const THREE_CARD_YELLOW_SCALE = THREE_CARD_PURPLE_SCALE * THREE_CARD_YELLOW_RATIO;
const THREE_CARD_WIDTH_RAMP_UNITS = 1.5;
const THREE_CARD_GAP_EXPAND_START = 0.4;
const THREE_CARD_GAP_EXPAND_END = 1.7;
const THREE_CARD_GAP_INCREASE = 0.20;
const FINAL_CARD_GROWTH_UNITS = 1.35;
const TWO_CARD_EDGE_GAP = (MAX_STACK_STEP * CARD_GAP_MULTIPLIER - 0.075) * 0.80;
const TWO_CARD_FINAL_OFFSET = (TWO_CARD_EDGE_GAP + 0.075) / CARD_GAP_MULTIPLIER;
const MAX_YELLOW_OFFSET = MAX_STACK_STEP + TWO_CARD_FINAL_OFFSET;
const BACK_CARD_SCALE_MULTIPLIER = 0.95;
const LAST_CARD_SCALE_MULTIPLIER = 0.95 * BACK_CARD_SCALE_MULTIPLIER;

export function getPlanStackProgress(sectionTop, viewportHeight) {
  return clamp((viewportHeight / 2 + 100 - sectionTop) / (3 * viewportHeight));
}

export function getPlanStackPoses(progress, vh, cardHeight) {
  // Independent, overlapping tracks: spread → recover → exit.
  // All start at .95 / 10%; both rear cards are reduced, with an extra 5% on the final card.
  const cardTime = progress * CARD_TIMELINE_UNITS;
  const phase = start => clamp((cardTime - start) / CARD_PHASE_UNITS);
  const widthRamp = clamp(cardTime / THREE_CARD_WIDTH_RAMP_UNITS);
  const widthRampEased = widthRamp * widthRamp * (3 - 2 * widthRamp);
  return [0, 1, 2].map(index => {
    let scale;
    let referenceScale;
    let offset;
    if (index === 0) {
      referenceScale = lerp(0.95, 1, phase(0));
      scale = referenceScale;
      offset = lerp(0.10, 0, phase(0));
    } else if (index === 1) {
      referenceScale = cardTime <= 2 ? lerp(0.95, 0.85, phase(0)) : lerp(0.85, 1, phase(2));
      scale = cardTime <= 2
        ? lerp(0.95 * BACK_CARD_SCALE_MULTIPLIER, THREE_CARD_PURPLE_SCALE, widthRampEased)
        : lerp(THREE_CARD_PURPLE_SCALE, 1, phase(2));
      offset = cardTime <= 2 ? lerp(0.10, MAX_STACK_STEP, phase(0)) : lerp(MAX_STACK_STEP, 0, phase(2));
    } else {
      const finalCardProgress = clamp((cardTime - 4) / FINAL_CARD_GROWTH_UNITS);
      referenceScale = cardTime <= 2 ? lerp(0.95, 0.70, phase(0))
        : cardTime <= 4 ? lerp(0.70, 0.85, phase(2)) : lerp(0.85, 1, finalCardProgress);
      const twoCardProgress = phase(2);
      const twoCardRatio = lerp(THREE_CARD_YELLOW_RATIO, TWO_CARD_SCALE_RATIO, clamp(twoCardProgress / 0.35));
      const purpleReferenceScale = lerp(0.85, 1, twoCardProgress);
      const activePurpleScale = lerp(THREE_CARD_PURPLE_SCALE, 1, twoCardProgress);
      const purpleOffset = lerp(MAX_STACK_STEP, 0, twoCardProgress);
      const lockedTwoCardOffset = (
        purpleOffset * CARD_GAP_MULTIPLIER
        + purpleReferenceScale / 2
        + TWO_CARD_EDGE_GAP
        - referenceScale / 2
      ) / CARD_GAP_MULTIPLIER;
      scale = cardTime <= 2
        ? lerp(0.95 * LAST_CARD_SCALE_MULTIPLIER, THREE_CARD_YELLOW_SCALE, widthRampEased)
        : cardTime <= 4
          ? activePurpleScale * twoCardRatio
          : lerp(TWO_CARD_SCALE_RATIO, 1, finalCardProgress);
      offset = cardTime <= 2 ? lerp(0.10, MAX_YELLOW_OFFSET, phase(0))
        : cardTime <= 4
          ? lockedTwoCardOffset
          : lerp(TWO_CARD_FINAL_OFFSET, 0, finalCardProgress);
      if (cardTime < 4) {
        const purpleReference = cardTime <= 2 ? lerp(0.95, 0.85, phase(0)) : purpleReferenceScale;
        const purpleStackOffset = cardTime <= 2 ? lerp(0.10, MAX_STACK_STEP, phase(0)) : purpleOffset;
        const currentGap = (offset - purpleStackOffset) * CARD_GAP_MULTIPLIER
          + (referenceScale - purpleReference) / 2;
        const expand = smoothstep(clamp((cardTime - THREE_CARD_GAP_EXPAND_START)
          / (THREE_CARD_GAP_EXPAND_END - THREE_CARD_GAP_EXPAND_START)));
        // Release the extra spacing as teal's bottom crosses purple's centre.
        const tealExit = clamp((cardTime - CARD_PHASE_UNITS) / CARD_EXIT_UNITS);
        const tealExitEased = 1 - (1 - tealExit) ** 2;
        const tealBottomToPurpleCentre = cardHeight / 2 - tealExitEased * vh
          - (purpleOffset * CARD_GAP_MULTIPLIER + (purpleReferenceScale - activePurpleScale) / 2) * cardHeight;
        const distanceAtExitStart = (0.5 - MAX_STACK_STEP * CARD_GAP_MULTIPLIER
          - (0.85 - THREE_CARD_PURPLE_SCALE) / 2) * cardHeight;
        const restore = cardTime <= CARD_PHASE_UNITS ? 0
          : smoothstep(clamp(1 - tealBottomToPurpleCentre / distanceAtExitStart));
        offset += currentGap * THREE_CARD_GAP_INCREASE * expand * (1 - restore) / CARD_GAP_MULTIPLIER;
      }
    }
    const exit = index < 2 ? clamp((cardTime - (index + 1) * CARD_PHASE_UNITS) / CARD_EXIT_UNITS) : 0;
    // Matches the measured quadratic ease-out of Lassie's nested exit tween.
    const exitEased = 1 - (1 - exit) ** 2;
    // Scale around the centre, preserving card proportions and rounded corners.
    // The final card has no local exit: native sticky release carries it away.
    const scaleCompensation = (referenceScale - scale) * cardHeight / 2;
    const stackOffset = offset * CARD_GAP_MULTIPLIER * cardHeight + scaleCompensation;
    return { y: stackOffset - exitEased * vh, scale };
  });
}

export function drawPlanStack(cards, progress, vh, cardHeight) {
  getPlanStackPoses(progress, vh, cardHeight).forEach(({ y, scale }, index) => {
    cards[index].style.transform = `translate(-50%, ${y}px) scale(${scale})`;
  });
}
