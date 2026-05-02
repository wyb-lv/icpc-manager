import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TimerService {
    // Timer state
    elapsedTime = signal(0); // Elapsed time in seconds
    isTimerRunning = signal(false);
    private timerInterval: any = null;

    // Formatted time display (HH:MM:SS)
    formattedTime = computed(() => {
        const seconds = this.elapsedTime();
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    });

    // Get elapsed time in seconds
    getElapsedSeconds(): number {
        return this.elapsedTime();
    }

    // Toggle timer on/off
    toggleTimer() {
        if (this.isTimerRunning()) {
            this.stopTimer();
        } else {
            this.startTimer();
        }
    }

    // Start the timer
    startTimer() {
        if (!this.timerInterval) {
            this.timerInterval = setInterval(() => {
                this.elapsedTime.update(time => time + 1);
            }, 1000);
            this.isTimerRunning.set(true);
        }
    }

    // Stop the timer
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.isTimerRunning.set(false);
    }

    // Reset the timer
    resetTimer() {
        this.stopTimer();
        this.elapsedTime.set(0);
    }
}
