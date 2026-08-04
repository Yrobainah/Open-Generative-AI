const PENDING_KEY = 'muapi_pending_jobs';

export function savePendingJob(job) {
    try {
        const jobs = getAllPendingJobs().filter(j => j.requestId !== job.requestId);
        if (job.exclusiveKey) {
            const conflict = jobs.find(j => j.exclusiveKey === job.exclusiveKey);
            if (conflict) {
                const error = new Error(`An exclusive MuAPI job is already active: ${conflict.requestId}`);
                error.code = 'MUAPI_EXCLUSIVE_JOB_ACTIVE';
                throw error;
            }
        }
        jobs.push(job);
        localStorage.setItem(PENDING_KEY, JSON.stringify(jobs));
        return true;
    } catch (e) {
        if (e?.code === 'MUAPI_EXCLUSIVE_JOB_ACTIVE') throw e;
        console.warn('[PendingJobs] Failed to save:', e);
        return false;
    }
}

export function removePendingJob(requestId) {
    try {
        const jobs = getAllPendingJobs().filter(j => j.requestId !== requestId);
        localStorage.setItem(PENDING_KEY, JSON.stringify(jobs));
    } catch (e) {
        console.warn('[PendingJobs] Failed to remove:', e);
    }
}

export function getPendingJobs(studioType) {
    const all = getAllPendingJobs();
    return studioType ? all.filter(j => j.studioType === studioType) : all;
}

function getAllPendingJobs() {
    try {
        return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
    } catch {
        return [];
    }
}
