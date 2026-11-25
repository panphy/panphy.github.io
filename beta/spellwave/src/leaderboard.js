// The beta has no shared leaderboard, so test runs never reach the live Hall of Wizards.
export function createLeaderboard() {
  return {
    init() {},
    handleScore() {},
    hideModal() {},
    isModalOpen: () => false,
  };
}
