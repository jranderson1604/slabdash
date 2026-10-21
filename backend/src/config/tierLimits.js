// Tier definitions and limit enforcement for SlabDash pricing plans
// Plans: free (early access), shop ($99/mo), enterprise ($249/mo)

const TIER_LIMITS = {
  free: {
    cards_per_month: 100,
    customers: 50,
    multi_location: false,
    api_access: false,
    white_label: false,
    team_roles: false,
    priority_refresh: false,
  },
  shop: {
    cards_per_month: 500,
    customers: 200,
    multi_location: false,
    api_access: false,
    white_label: false, // Has custom branding (colors, logo) but NOT white-label
    team_roles: false,
    priority_refresh: false,
  },
  enterprise: {
    cards_per_month: Infinity,
    customers: Infinity,
    multi_location: true,
    api_access: true,
    white_label: true,
    team_roles: true,
    priority_refresh: true,
  },
};

function getLimits(plan) {
  return TIER_LIMITS[plan] || TIER_LIMITS.free;
}

module.exports = { TIER_LIMITS, getLimits };
