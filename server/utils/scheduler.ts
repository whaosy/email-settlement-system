import schedule from 'node-schedule';
import { nanoid } from 'nanoid';
import { getScheduledJob, updateScheduledJob } from '../db';

interface ScheduledTask {
  jobId: string;
  job: schedule.Job;
}

const scheduledTasks = new Map<string, ScheduledTask>();

/**
 * Schedule a task to run at a specific time
 */
export function scheduleTask(
  scheduledTime: Date,
  callback: () => Promise<void>,
  taskId: number
): string {
  const jobId = nanoid();
  
  try {
    const job = schedule.scheduleJob(scheduledTime, async () => {
      try {
        // Update job status to executing
        await updateScheduledJob(jobId, { status: 'executing' });
        
        // Execute callback
        await callback();
        
        // Update job status to completed
        await updateScheduledJob(jobId, { status: 'completed' });
      } catch (error) {
        console.error(`[Scheduler] Task ${jobId} failed:`, error);
        // Update job status to failed
        await updateScheduledJob(jobId, {
          status: 'failed',
        });
      }
    });
    
    scheduledTasks.set(jobId, { jobId, job });
    return jobId;
  } catch (error) {
    console.error(`[Scheduler] Failed to schedule task:`, error);
    throw error;
  }
}

/**
 * Cancel a scheduled task
 */
export function cancelTask(jobId: string): boolean {
  const task = scheduledTasks.get(jobId);
  if (!task) {
    return false;
  }
  
  task.job.cancel();
  scheduledTasks.delete(jobId);
  return true;
}

/**
 * Get task status
 */
export async function getTaskStatus(jobId: string): Promise<string | null> {
  const task = await getScheduledJob(jobId);
  return task?.status || null;
}

/**
 * Clear all scheduled tasks (for cleanup)
 */
export function clearAllTasks(): void {
  scheduledTasks.forEach((task) => {
    task.job.cancel();
  });
  scheduledTasks.clear();
}

/**
 * Get all active tasks
 */
export function getActiveTasks(): string[] {
  const keys: string[] = [];
  scheduledTasks.forEach((_, key) => {
    keys.push(key);
  });
  return keys;
}
