import { taskService } from "./index";

// Track if the scheduler is already running
let isSchedulerRunning = false;

// Task scheduler for video generation
class TaskScheduler {
	private intervalId: NodeJS.Timeout | null = null;

	// Start the task scheduler
	start() {
		if (this.intervalId || isSchedulerRunning) {
			// Scheduler already running
			return;
		}

		isSchedulerRunning = true;
		console.log('[TaskScheduler] Starting video task scheduler');

		// Run immediately on start
		this.processTasks();

		// Schedule to run every 30 seconds
		this.intervalId = setInterval(() => {
			this.processTasks();
		}, 30000); // 30 seconds
	}

	// Stop the task scheduler
	stop() {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
			isSchedulerRunning = false;
			console.log('[TaskScheduler] Stopped video task scheduler');
		}
	}

	// Process tasks
	private async processTasks() {
		try {
			console.log('[TaskScheduler] Processing video tasks...');
			await taskService.processVideoTasks();
			console.log('[TaskScheduler] Video tasks processed successfully');
		} catch (error) {
			console.error('[TaskScheduler] Error processing video tasks:', error);
		}
	}
}

export const taskScheduler = new TaskScheduler();
