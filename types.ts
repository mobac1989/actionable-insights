
export type ImpactRating = 'not_relevant' | 'nice_to_know' | 'requires_attention' | 'immediate_action';

export interface Insight {
  insight_id: string;
  category_id: string;
  category_name: string;
  title: string;
  description: string;
  image: string;
  default_actions: string[];
  severity_hint: string;
  requires_prediction: string;
  role_relevance_hint: string;
}

export interface Participant {
  id: string;
  name: string;
  role: string;
}

export interface ParticipantResponse {
  impact: ImpactRating;
  selectedActions: string[];
  customAction: string;
  notes: string;
}

export interface InsightResponses {
  [participantId: string]: ParticipantResponse;
}

export interface SessionData {
  sessionId: string;
  sessionName: string;
  sessionDate: string;
  participants: Participant[];
  responses: Record<string, InsightResponses>; // insightId -> participantId -> response
  insights: Insight[];
}

/**
 * DataObservation represents a single feedback record from a participant.
 * It is used for aggregated cross-session analysis in the AnalysisView.
 */
export interface DataObservation {
  sessionId: string;
  sessionDate: string;
  sessionName: string;
  participantName: string;
  participantRole: string;
  insightId: string;
  categoryId: string;
  categoryName: string;
  insightTitle: string;
  impactRating: ImpactRating;
  selectedActions: string[];
  customAction: string;
  notes: string;
}
