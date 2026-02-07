import type { PortalApi } from './portalApi';

/**
 * Real API implementation — will call Express backend endpoints.
 * For now, every method throws so we know immediately if mock mode is off.
 */
export function createRealPortalApi(): PortalApi {
  const _stub = (name: string): never => {
    throw new Error(`realPortalApi.${name}() is not implemented yet. Enable VITE_USE_MOCK_API=true or connect backend endpoints.`);
  };

  return {
    listClubsRecruiting: () => _stub('listClubsRecruiting'),
    listAllClubs: () => _stub('listAllClubs'),
    getClub: () => _stub('getClub'),
    getClubPositions: () => _stub('getClubPositions'),
    listRecruitmentPosts: () => _stub('listRecruitmentPosts'),
    upsertRecruitmentPost: () => _stub('upsertRecruitmentPost'),
    deleteRecruitmentPost: () => _stub('deleteRecruitmentPost'),
    addPosition: () => _stub('addPosition'),
    updatePosition: () => _stub('updatePosition'),
    deletePosition: () => _stub('deletePosition'),
    getFormSchema: () => _stub('getFormSchema'),
    upsertFormSchema: () => _stub('upsertFormSchema'),
    submitApplication: () => _stub('submitApplication'),
    listMyApplications: () => _stub('listMyApplications'),
    listApplicationsForClub: () => _stub('listApplicationsForClub'),
    getApplicationDetail: () => _stub('getApplicationDetail'),
    updateApplicationStatus: () => _stub('updateApplicationStatus'),
    getReviewThread: () => _stub('getReviewThread'),
    addTopLevelReview: () => _stub('addTopLevelReview'),
    replyToReview: () => _stub('replyToReview'),
    listInterviewSlots: () => _stub('listInterviewSlots'),
    bookInterviewSlot: () => _stub('bookInterviewSlot'),
    getForumChannel: () => _stub('getForumChannel'),
    listForumChannels: () => _stub('listForumChannels'),
    postForumMessage: () => _stub('postForumMessage'),
    ensureForumChannel: () => _stub('ensureForumChannel'),
  };
}
