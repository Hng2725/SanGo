export const SPORTS = ['FOOTBALL', 'BADMINTON', 'PICKLEBALL', 'TENNIS', 'BASKETBALL', 'VOLLEYBALL'] as const;
export type Sport = (typeof SPORTS)[number];
export const SPORT_LABELS: Record<Sport, string> = { FOOTBALL: 'Bóng đá mini', BADMINTON: 'Cầu lông', PICKLEBALL: 'Pickleball', TENNIS: 'Tennis', BASKETBALL: 'Bóng rổ', VOLLEYBALL: 'Bóng chuyền' };
