interface ProcessedVideo {
    videoPath: string;
    audioPath: string;
    name: string;
    timestamp: number;
    fileSize?: string;
}

class VideoManager {
    private videoList: ProcessedVideo[] = [];
    private videoListContainer: HTMLElement;
    private importButton: HTMLElement;
    private statusElement: HTMLElement;
    private progressBar: HTMLElement;
    private progressBarFill: HTMLElement;
    private cleanupListener: (() => void) | null = null;

    constructor() {
        this.videoListContainer = document.getElementById('videoListContainer') as HTMLElement;
        this.importButton = document.getElementById('importBtn') as HTMLElement;
        this.statusElement = document.getElementById('statusMessage') as HTMLElement;
        this.progressBar = document.getElementById('progressBar') as HTMLElement;
        this.progressBarFill = document.getElementById('progressBarFill') as HTMLElement;
        this.setupEventListeners();
        this.loadVideos();
    }

    private setupEventListeners() {
        this.importButton.addEventListener('click', async () => {
            this.setStatus('Selecting video...');
            this.showProgress(0);
            try {
                const result = await window.electronAPI.selectVideo();
                if (result) {
                    this.addVideo(result.videoPath, result.audioPath);
                }
            } catch (error) {
                this.setStatus('Error processing video');
                this.hideProgress();
                console.error('Error:', error);
            }
        });

        // Setup status listener
        this.cleanupListener = window.electronAPI.onProcessingStatus((status: string) => {
            if (status.includes('Extracting audio...')) {
                const percentMatch = status.match(/(\d+)%/);
                if (percentMatch) {
                    const percent = parseInt(percentMatch[1]);
                    this.showProgress(percent);
                }
            }
            this.setStatus(status);
            if (status === 'Audio extraction complete') {
                this.hideProgress();
            }
        });
    }

    private setStatus(message: string) {
        if (this.statusElement) {
            this.statusElement.textContent = message;
        }
    }

    private showProgress(percent: number) {
        this.progressBar.classList.add('active');
        this.progressBarFill.style.width = `${percent}%`;
    }

    private hideProgress() {
        this.progressBar.classList.remove('active');
        this.progressBarFill.style.width = '0%';
    }

    private formatFileSize(bytes: number): string {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    private async getFileSize(path: string): Promise<string> {
        try {
            const stats = await window.electronAPI.getFileStats(path);
            return this.formatFileSize(stats.size);
        } catch (error) {
            console.error('Error getting file size:', error);
            return 'Unknown size';
        }
    }

    private async addVideo(videoPath: string, audioPath: string) {
        const fileSize = await this.getFileSize(audioPath);
        
        const video: ProcessedVideo = {
            videoPath,
            audioPath,
            name: videoPath.split('\\').pop() || videoPath,
            timestamp: Date.now(),
            fileSize
        };

        this.videoList.push(video);
        this.saveVideos();
        this.renderVideoList();
        this.setStatus('Video processed successfully');
    }

    private renderVideoList() {
        this.videoListContainer.innerHTML = '';
        
        this.videoList.forEach(video => {
            const videoElement = document.createElement('div');
            videoElement.className = 'video-item';
            
            const nameElement = document.createElement('div');
            nameElement.className = 'video-name';
            nameElement.textContent = video.name;
            
            const infoElement = document.createElement('div');
            infoElement.className = 'video-info';
            
            const audioNameElement = document.createElement('div');
            audioNameElement.textContent = `Audio: ${video.audioPath.split('\\').pop()}`;
            
            const fileSizeElement = document.createElement('div');
            fileSizeElement.textContent = `Size: ${video.fileSize || 'Unknown'}`;
            
            infoElement.appendChild(audioNameElement);
            infoElement.appendChild(fileSizeElement);
            
            videoElement.appendChild(nameElement);
            videoElement.appendChild(infoElement);
            
            videoElement.addEventListener('click', () => this.selectVideo(video));
            
            this.videoListContainer.appendChild(videoElement);
        });
    }

    private selectVideo(video: ProcessedVideo) {
        // TODO: Implement video selection handling
        console.log('Selected video:', video);
    }

    private saveVideos() {
        localStorage.setItem('processedVideos', JSON.stringify(this.videoList));
    }

    private loadVideos() {
        const savedVideos = localStorage.getItem('processedVideos');
        if (savedVideos) {
            this.videoList = JSON.parse(savedVideos);
            this.renderVideoList();
        }
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VideoManager();
});
