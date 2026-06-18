export type TaskRole =
  | 'NEGOTIATOR'
  | 'IMPLEMENTER'
  | 'REVIEWER'
  | 'APPROVER';

export type ResponsibilityType = 'primary' | 'secondary';

export interface TaskResponsibility {
  userId: string;
  role: TaskRole;
  responsibilityType: ResponsibilityType;
  order: number;
  instructions?: string;
}

export interface ProjectTask {
  _id?: string;
  projectId: string;

  title: string;
  description?: string;

  status?: 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'critical';

  responsibilities: TaskResponsibility[];

  startDate?: string | null;
  dueDate?: string | null;
}