export const EASE_IN_OUT_QUINT = 'cubic-bezier(.38, .04, .35, .96)';

// Mirrors --ani-*-timing in src/styles/_css-variables.scss.
export const ANI_STANDARD_TIMING_ = 'cubic-bezier(.25, .8, .25, 1)';
export const ANI_ENTER_TIMING_ = 'cubic-bezier(.16, 1, .3, 1)';
export const ANI_LEAVE_TIMING_ = 'cubic-bezier(.4, 0, .9, .5)';
export const ANI_SHARP_TIMING_ = 'cubic-bezier(.4, 0, .6, 1)';

export const TRANSITION_DURATION_XS = '55ms';
export const TRANSITION_DURATION_S = '130ms';
// If this grows past ~400ms, revisit ACTION_ROW_REVEAL_PIN_MS in
// main-header.component.ts: the header's reveal pin must outlive the right
// panel's width animation (ANI_ENTER_TIMING), which is built from this.
export const TRANSITION_DURATION_M = '190ms';
export const TRANSITION_DURATION_L = '320ms';
export const TRANSITION_DURATION_XL = '1s';

export const TRANSITION_DURATION_ENTER = TRANSITION_DURATION_M;
export const TRANSITION_DURATION_LEAVE = '165ms';

export const ANI_STANDARD_TIMING = `${TRANSITION_DURATION_M} ${ANI_STANDARD_TIMING_}`;
export const ANI_LONG_TIMING = `${TRANSITION_DURATION_L} ${ANI_STANDARD_TIMING_}`;
export const ANI_VERY_LONG_TIMING = `${TRANSITION_DURATION_XL} ${ANI_STANDARD_TIMING_}`;
export const ANI_ENTER_TIMING = `${TRANSITION_DURATION_ENTER} ${ANI_ENTER_TIMING_}`;
export const ANI_LEAVE_TIMING = `${TRANSITION_DURATION_LEAVE} ${ANI_LEAVE_TIMING_}`;
export const ANI_SHARP_TIMING = `${TRANSITION_DURATION_S} ${ANI_SHARP_TIMING_}`;

export const ANI_FASTEST_TIMING = `${TRANSITION_DURATION_XS} ${ANI_STANDARD_TIMING_}`;
export const ANI_FAST_TIMING = `${TRANSITION_DURATION_M} ${ANI_STANDARD_TIMING_}`;
export const ANI_ENTER_FAST_TIMING = `${TRANSITION_DURATION_S} ${ANI_ENTER_TIMING_}`;
export const ANI_LEAVE_FAST_TIMING = `${TRANSITION_DURATION_S} ${ANI_LEAVE_TIMING}`;
