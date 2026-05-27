export type NegotiationInput = {
  loadboard_rate: number;
  counter_offer: number;
  round: number;
  previous_counter?: number;
};

export type NegotiationDecision = {
  decision: "accept" | "counter" | "reject";
  target_rate: number;
  message: string;
  round: number;
  is_final: boolean;
};

const FLOOR_MULTIPLIER = 0.95;
const CEILING_MULTIPLIER = 1.08;
const MAX_ROUNDS = 3;

export function evaluateOffer(input: NegotiationInput): NegotiationDecision {
  const { loadboard_rate, counter_offer, round } = input;
  const floor = loadboard_rate * FLOOR_MULTIPLIER;
  const ceiling = loadboard_rate * CEILING_MULTIPLIER;

  if (counter_offer <= 0 || !Number.isFinite(counter_offer)) {
    return {
      decision: "reject",
      target_rate: loadboard_rate,
      message: "I didn't catch a valid offer. The listed rate is $" + loadboard_rate.toFixed(0) + ".",
      round,
      is_final: false,
    };
  }

  if (counter_offer <= ceiling) {
    return {
      decision: "accept",
      target_rate: counter_offer,
      message: `Deal — we can do $${counter_offer.toFixed(0)}. Let me transfer you to a sales rep to finalize the paperwork.`,
      round,
      is_final: true,
    };
  }

  if (round >= MAX_ROUNDS) {
    return {
      decision: "reject",
      target_rate: ceiling,
      message: `The best I can do is $${ceiling.toFixed(0)} and I can't go higher on this lane. If that doesn't work I understand — appreciate your time.`,
      round,
      is_final: true,
    };
  }

  const anchor = input.previous_counter ?? loadboard_rate;
  const midpoint = (anchor + counter_offer) / 2;
  const target = Math.max(floor, Math.min(midpoint, ceiling));

  return {
    decision: "counter",
    target_rate: target,
    message: `I hear you on $${counter_offer.toFixed(0)} — I can meet you at $${target.toFixed(0)}. Does that work?`,
    round,
    is_final: false,
  };
}
