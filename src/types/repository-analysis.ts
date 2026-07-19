import type { PaginationState, ProjectPriority, ProjectStatus } from './project';

export type RepositoryAnalysisRunStatus =
  | 'queued'
  | 'scanning'
  | 'analyzing'
  | 'completed'
  | 'partially_completed'
  | 'failed';

export type RepositoryProvider = 'gitlab';

export type RepositoryProjectReference = {
  id?: string;
  _id?: string;
  title?: string;
  status?: ProjectStatus | string;
  statusLabel?: string;
  priority?: ProjectPriority | string;
  priorityLabel?: string;
};

export type RepositoryUserReference = {
  id?: string;
  _id?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  username?: string;
};

export type RepositoryConnection = {
  id: string;
  _id?: string;
  projectId: string | RepositoryProjectReference;
  name: string;
  provider: RepositoryProvider;
  repositoryUrl: string;
  gitlabBaseUrl: string;
  gitlabProjectPath: string;
  defaultBranch: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RepositoryConnectionReference = {
  id?: string;
  _id?: string;
  name: string;
  repositoryUrl: string;
  gitlabProjectPath: string;
  defaultBranch: string;
  enabled: boolean;
};

export type RepositoryPackageCategory =
  | 'runtime'
  | 'development'
  | 'peer'
  | 'optional'
  | 'unknown';

export type RepositoryPackageRecord = {
  name: string;
  version: string;
  ecosystem: string;
  category: RepositoryPackageCategory;
  manifestPath: string;
};

export type RepositoryLanguageRecord = {
  name: string;
  fileCount: number;
};

export type RepositoryArchitectureResult = {
  classification: string;
  confidence: number;
  summary: string;
  layers: string[];
  modules: string[];
  strengths: string[];
  concerns: string[];
  evidence: string[];
};

export type RepositoryInventory = {
  totalEntries: number;
  totalFiles: number;
  totalDirectories: number;
  truncated: boolean;
  topLevelDirectories: string[];
  topLevelFiles: string[];
  manifestFiles: string[];
  selectedSourceFiles: string[];
  languages: RepositoryLanguageRecord[];
};


export type RepositoryExpectationSource =
  | 'none'
  | 'text'
  | 'file'
  | 'file_and_text';

export type RepositoryWorkloadTargets = {
  concurrentUsers?: number | null;
  requestsPerSecond?: number | null;
  targetLatencyMs?: number | null;
  availabilityPercent?: number | null;
  dataVolume?: string;
  growthHorizonMonths?: number | null;
};

export type RepositoryExpectationsSnapshot = {
  source: RepositoryExpectationSource;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  contentLength: number;
  provided: boolean;
  workloadTargets: RepositoryWorkloadTargets;
};

export type RepositoryRequirementStatus =
  | 'met'
  | 'partial'
  | 'not_met'
  | 'unknown';

export type RepositoryRequirementMatch = {
  id?: string;
  category?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  hardGate?: boolean;
  expectation: string;
  status: RepositoryRequirementStatus;
  evidence: string[];
  explanation: string;
};

export type RepositoryRecommendation = {
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  suggestedSolution: string;
  evidence: string[];
};

export type RepositoryReadinessAssessment = {
  verdict:
    | 'ready'
    | 'conditionally_ready'
    | 'not_ready'
    | 'insufficient_evidence';
  score: number;
  confidence: number;
  summary: string;
  matchedExpectations: RepositoryRequirementMatch[];
  blockers: string[];
  gaps: string[];
  recommendations: RepositoryRecommendation[];
};

export type RepositoryScalabilityAssessment = {
  verdict:
    | 'likely_sufficient'
    | 'conditionally_sufficient'
    | 'unlikely_sufficient'
    | 'insufficient_evidence';
  confidence: number;
  summary: string;
  workloadAssumptions: string[];
  strengths: string[];
  bottlenecks: string[];
  capacityRisks: string[];
  recommendedArchitecture: string[];
  validationPlan: string[];
};

export type RepositoryCodeReviewFinding = {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  title: string;
  description: string;
  evidencePaths: string[];
  recommendation: string;
};

export type RepositoryCodeReviewAssessment = {
  overallScore: number;
  summary: string;
  maintainabilityScore: number;
  reliabilityScore: number;
  securityScore: number;
  performanceScore: number;
  strengths: string[];
  findings: RepositoryCodeReviewFinding[];
};


export type RepositoryAnalysisQuality = {
  engine: 'deterministic' | 'typescript_single_pass' | 'python_multi_pass';
  pipelineVersion: string;
  passes: string[];
  moduleBatches: number;
  requirementCount: number;
  evidenceCoveragePercent: number;
  referencedFiles: string[];
  criticVerdict: 'approved' | 'approved_with_caveats' | 'rejected' | 'not_run';
  unsupportedClaimsRemoved: number;
  missingEvidenceItems: string[];
  durationMs: number;
  modelCalls: number;
};


export type RepositoryAiErrorDetails = {
  source?: string;
  stage?: string;
  endpoint?: string;
  model?: string;
  httpStatus?: number;
  openaiError?: {
    message?: string | null;
    type?: string | null;
    code?: string | null;
    param?: unknown;
  } | null;
  requestId?: string | null;
  clientRequestId?: string | null;
  organization?: string | null;
  processingMs?: string | null;
  headers?: Record<string, string>;
  rawResponseBody?: string;
  rawModelContent?: string;
  attempt?: number;
  maxAttempts?: number;
  retryable?: boolean;
  timeoutSeconds?: number;
  exceptionType?: string;
  exceptionMessage?: string;
  childProcess?: {
    exitCode?: number | null;
    signal?: string | null;
    stderrTail?: string;
  };
};

export type RepositoryAnalysisRun = {
  id: string;
  _id?: string;
  repositoryId: string | RepositoryConnectionReference;
  projectId: string | RepositoryProjectReference;
  requestedRef: string;
  resolvedRef: string;
  commitSha: string;
  status: RepositoryAnalysisRunStatus;
  currentStage: string;
  progressPercent: number;
  inventory?: RepositoryInventory | null;
  packages: RepositoryPackageRecord[];
  frameworks: string[];
  architecture?: RepositoryArchitectureResult | null;
  expectations?: RepositoryExpectationsSnapshot | null;
  readinessAssessment?: RepositoryReadinessAssessment | null;
  scalabilityAssessment?: RepositoryScalabilityAssessment | null;
  codeReviewAssessment?: RepositoryCodeReviewAssessment | null;
  analysisQuality?: RepositoryAnalysisQuality | null;
  executiveReport: string;
  technicalReport: string;
  aiEnabled: boolean;
  aiUsed: boolean;
  aiModel: string;
  aiError?: RepositoryAiErrorDetails | null;
  warnings: string[];
  errorCode: string;
  errorMessage: string;
  requestedBy?: string | RepositoryUserReference | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateRepositoryConnectionPayload = {
  projectId: string;
  name?: string;
  repositoryUrl: string;
  defaultBranch?: string;
};

export type UpdateRepositoryConnectionPayload = {
  name?: string;
  repositoryUrl?: string;
  defaultBranch?: string;
  enabled?: boolean;
};

export type StartRepositoryAnalysisPayload = {
  ref?: string;
  useAi?: boolean;
  expectationsFile?: File | null;
  expectationsText?: string;
  concurrentUsers?: number | null;
  requestsPerSecond?: number | null;
  targetLatencyMs?: number | null;
  availabilityPercent?: number | null;
  dataVolume?: string;
  growthHorizonMonths?: number | null;
};

export type RepositoryListParams = {
  projectId?: string;
  enabled?: boolean;
};

export type RepositoryRunListParams = {
  repositoryId?: string;
  projectId?: string;
  status?: RepositoryAnalysisRunStatus;
  page?: number;
  limit?: number;
};

export type RepositoryRunListResponse = {
  items: RepositoryAnalysisRun[];
  pagination: PaginationState;
};
