export interface EvidenceItem {
  ref: string;
  quote: string;
}

export interface SkillEvaluation {
  score: number;
  insufficientEvidence: boolean;
  keyEvidence: EvidenceItem[];
  strengths: string[];
  improvements: string[];
}

export interface RadarChartData {
  labels: string[];
  values: number[];
  scaleMin: number;
  scaleMax: number;
}

export interface TeamRadarChartData {
  labels: string[];
  values: number[];
  scaleMin: number;
  scaleMax: number;
}

export interface SessionReportSessionInfo {
  sessionId: string;
  gameType: string;
  completed: boolean;
  timeLeft: string | null;
  mistakesMade: number | null;
  playerCount: number;
  summary: string;
}

export interface TeamEvaluation {
  overallScore: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  radarChart: TeamRadarChartData;
}

export interface PlayerSkills {
  communication: SkillEvaluation;
  teamwork: SkillEvaluation;
  problemSolving: SkillEvaluation;
  leadership: SkillEvaluation;
  timeManagement: SkillEvaluation;
}

export interface PlayerEvaluation {
  playerId: string;
  nickname: string;
  overallScore: number;
  summary: string;
  radarChart: RadarChartData;
  skills: PlayerSkills;
  topBehavioralPatterns: string[];
  redFlags: string[];
  actionableNextSteps: string[];
}

export interface AiReport {
  session: SessionReportSessionInfo;
  teamEvaluation: TeamEvaluation;
  playerEvaluations: PlayerEvaluation[];
}

export interface GetSessionReportResponse {
  sessionCode: string;
  summary: string;
  report: AiReport;
  createdAtUtc: string;
}
