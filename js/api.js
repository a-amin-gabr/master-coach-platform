/**
 * Tamkeen Al-Roaya Master Coach Platform v3.0
 * Client-Side API Communication & Authentication Client
 * Connects Frontend seamlessly to Node.js / Express REST API
 */

(function () {
    'use strict';

    const TOKEN_KEY = 'TAMKEEN_AUTH_TOKEN_V3';
    const USER_KEY = 'TAMKEEN_AUTH_USER_V3';

    class ApiClient {
        constructor() {
            this.baseUrl = '';
            this.token = localStorage.getItem(TOKEN_KEY) || null;
            this.user = null;
            try {
                const storedUser = localStorage.getItem(USER_KEY);
                if (storedUser) this.user = JSON.parse(storedUser);
            } catch (_) {}
            this.isServerAvailable = false;
        }

        async checkConnection() {
            try {
                const res = await fetch(`${this.baseUrl}/api/health`, { method: 'GET' });
                this.isServerAvailable = res.ok;
                return res.ok;
            } catch (e) {
                this.isServerAvailable = false;
                return false;
            }
        }

        getToken() {
            return this.token;
        }

        getUser() {
            return this.user;
        }

        isAuthenticated() {
            return !!this.token && !!this.user;
        }

        isAdmin() {
            return this.user && this.user.role === 'admin';
        }

        isCoach() {
            return this.user && this.user.role === 'coach';
        }

        setSession(token, user) {
            this.token = token;
            this.user = user;
            if (token) localStorage.setItem(TOKEN_KEY, token);
            else localStorage.removeItem(TOKEN_KEY);

            if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
            else localStorage.removeItem(USER_KEY);
        }

        clearSession() {
            this.token = null;
            this.user = null;
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
        }

        async request(endpoint, options = {}) {
            const url = `${this.baseUrl}${endpoint}`;
            const headers = options.headers || {};

            if (this.token) {
                headers['Authorization'] = `Bearer ${this.token}`;
            }

            if (options.json !== undefined) {
                headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(options.json);
            }

            try {
                const response = await fetch(url, {
                    method: options.method || 'GET',
                    headers,
                    body: options.body
                });

                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    const err = new Error(data.error || 'حدث خطأ في الاتصال بالخادم');
                    err.status = response.status;
                    err.data = data;
                    throw err;
                }

                return data;
            } catch (err) {
                throw err;
            }
        }

        // Auth Endpoints
        async login(email, password) {
            const data = await this.request('/api/auth/login', {
                method: 'POST',
                json: { email, password }
            });
            this.setSession(data.token, data.user);
            return data;
        }

        async getMe() {
            if (!this.token) return null;
            try {
                const data = await this.request('/api/auth/me');
                this.user = data.user;
                localStorage.setItem(USER_KEY, JSON.stringify(data.user));
                return data.user;
            } catch (err) {
                if (err.status === 401) {
                    this.clearSession();
                }
                return null;
            }
        }

        async register(userData) {
            const data = await this.request('/api/auth/register', {
                method: 'POST',
                json: userData
            });
            this.setSession(data.token, data.user);
            return data;
        }

        async logout() {
            try {
                await this.request('/api/auth/logout', { method: 'POST' });
            } catch (_) {}
            this.clearSession();
        }

        // Coaches
        async getCoaches() {
            return this.request('/api/coaches');
        }

        async getCoach(coachId) {
            return this.request(`/api/coaches/${coachId}`);
        }

        async resetCoachState(coachId, mode = 'fresh') {
            return this.request(`/api/coaches/${coachId}/reset-state`, {
                method: 'POST',
                json: { mode }
            });
        }

        // Tasks
        async getTasks(coachId) {
            const q = coachId ? `?coachId=${coachId}` : '';
            return this.request(`/api/tasks${q}`);
        }

        async saveReflection(taskId, reflectionData, coachId) {
            const q = coachId ? `?coachId=${coachId}` : '';
            return this.request(`/api/tasks/${taskId}/reflection${q}`, {
                method: 'PUT',
                json: reflectionData
            });
        }

        async submitTask(taskId, coachId) {
            const q = coachId ? `?coachId=${coachId}` : '';
            return this.request(`/api/tasks/${taskId}/submit${q}`, {
                method: 'POST'
            });
        }

        async evaluateTask(taskId, evalData) {
            return this.request(`/api/tasks/${taskId}/evaluate`, {
                method: 'POST',
                json: evalData
            });
        }

        // Upload Evidence (Multipart)
        async uploadEvidence(formData) {
            const headers = {};
            if (this.token) {
                headers['Authorization'] = `Bearer ${this.token}`;
            }

            const response = await fetch(`${this.baseUrl}/api/uploads`, {
                method: 'POST',
                headers,
                body: formData
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                const err = new Error(data.error || 'فشل رفع الملف');
                err.status = response.status;
                err.data = data;
                throw err;
            }
            return data;
        }

        // Tools & Anti-Duplication
        async getTools(coachId) {
            const q = coachId ? `?coachId=${coachId}` : '';
            return this.request(`/api/tools${q}`);
        }

        async applyTool(toolDataOrType, beneficiaryCode, notes, isAnonymous = true) {
            let payload;
            if (typeof toolDataOrType === 'object' && toolDataOrType !== null) {
                payload = toolDataOrType;
            } else {
                payload = {
                    toolType: toolDataOrType,
                    beneficiaryCode,
                    focus: notes || 'تطبيق معتمد مع خطة متابعة وتأمل مهني.',
                    plan: notes || 'تم الاتفاق على الأولويات ووضع خطة الاستدامة.',
                    isAnonymous: isAnonymous !== false,
                    date: new Date().toISOString().split('T')[0]
                };
            }
            return this.request('/api/tools/apply', {
                method: 'POST',
                json: payload
            });
        }

        // Rubrics
        async getRubrics(coachId) {
            const q = coachId ? `?coachId=${coachId}` : '';
            return this.request(`/api/rubrics${q}`);
        }

        async evaluateRubric(coachIdOrData, rubricCode, criterionIdOrCriteria, level, notes, requiredImprovement) {
            let payload;
            if (typeof coachIdOrData === 'object' && coachIdOrData !== null) {
                payload = coachIdOrData;
            } else if (typeof criterionIdOrCriteria === 'object' && criterionIdOrCriteria !== null) {
                payload = {
                    coachId: coachIdOrData,
                    rubricCode,
                    criteria: criterionIdOrCriteria,
                    notes: level || notes
                };
            } else {
                payload = {
                    coachId: coachIdOrData,
                    rubricCode,
                    criterionId: criterionIdOrCriteria,
                    level,
                    notes,
                    requiredImprovement
                };
            }
            return this.request('/api/rubrics/evaluate', {
                method: 'POST',
                json: payload
            });
        }

        // Ethics Gate
        async getEthics(coachId) {
            const q = coachId ? `?coachId=${coachId}` : '';
            return this.request(`/api/ethics${q}`);
        }

        async toggleEthicsCheckpoint(coachIdOrData, checkpointId, status, clearedBy) {
            let payload;
            if (typeof coachIdOrData === 'object' && coachIdOrData !== null) {
                payload = coachIdOrData;
            } else {
                payload = {
                    coachId: coachIdOrData,
                    checkpointId,
                    status,
                    clearedBy
                };
            }
            return this.request('/api/ethics/toggle', {
                method: 'POST',
                json: payload
            });
        }

        async addEthicsReferral(referralData) {
            return this.request('/api/ethics/referrals', {
                method: 'POST',
                json: referralData
            });
        }

        // Cases & Dossier Management
        async getCases(coachId) {
            const q = coachId ? `?coachId=${coachId}` : '';
            return this.request(`/api/cases${q}`);
        }

        async getCase(caseId, coachId) {
            const q = coachId ? `?coachId=${coachId}` : '';
            return this.request(`/api/cases/${caseId}${q}`);
        }

        async createCase(caseData) {
            return this.request('/api/cases', {
                method: 'POST',
                json: caseData
            });
        }

        async createSession(sessionData) {
            return this.request('/api/cases/sessions', {
                method: 'POST',
                json: sessionData
            });
        }

        // Curriculum Submissions (Recordings, Models, Tools, Org, Research, Graduation)
        async getRecordings(coachId) {
            const q = coachId ? `?coachId=${coachId}` : '';
            return this.request(`/api/curriculum/recordings${q}`);
        }

        async createRecording(recData) {
            return this.request('/api/curriculum/recordings', {
                method: 'POST',
                json: recData
            });
        }

        async getModels(coachId) {
            const q = coachId ? `?coachId=${coachId}` : '';
            return this.request(`/api/curriculum/models${q}`);
        }

        async createModel(modelData) {
            return this.request('/api/curriculum/models', {
                method: 'POST',
                json: modelData
            });
        }

        async getInnovativeTool(coachId) {
            const q = coachId ? `?coachId=${coachId}` : '';
            return this.request(`/api/curriculum/innovative-tool${q}`);
        }

        async updateInnovativeTool(toolData) {
            return this.request('/api/curriculum/innovative-tool', {
                method: 'POST',
                json: toolData
            });
        }

        async getOrgPreparation(coachId) {
            const q = coachId ? `?coachId=${coachId}` : '';
            return this.request(`/api/curriculum/org-preparation${q}`);
        }

        async updateOrgPreparation(orgData) {
            return this.request('/api/curriculum/org-preparation', {
                method: 'POST',
                json: orgData
            });
        }

        async getResearchPaper(coachId) {
            const q = coachId ? `?coachId=${coachId}` : '';
            return this.request(`/api/curriculum/research-paper${q}`);
        }

        async updateResearchPaper(paperData) {
            return this.request('/api/curriculum/research-paper', {
                method: 'POST',
                json: paperData
            });
        }

        async getGraduationProject(coachId) {
            const q = coachId ? `?coachId=${coachId}` : '';
            return this.request(`/api/curriculum/graduation-project${q}`);
        }

        async updateGraduationProject(projectData) {
            return this.request('/api/curriculum/graduation-project', {
                method: 'POST',
                json: projectData
            });
        }

        // Audit Determination & Graduation
        async getAuditDetermination(coachId) {
            const q = coachId ? `?coachId=${coachId}` : '';
            return this.request(`/api/audit/determination${q}`);
        }

        async issueGraduationDecree(decreeData) {
            return this.request('/api/audit/determination', {
                method: 'POST',
                json: decreeData
            });
        }

        // Admin Supervisor Review Queue & Stats
        async getPendingTasks() {
            return this.request('/api/admin/pending-tasks');
        }

        async getStats() {
            return this.request('/api/admin/stats');
        }

        // Maintenance
        async resetDemoData() {
            return this.request('/api/admin/reset-demo', { method: 'POST' });
        }

        async exportBackup() {
            return this.request('/api/admin/export');
        }

        // Chat & Supervisory Messaging
        async getChatChannels() {
            return this.request('/api/chat/channels');
        }

        async getChatMessages(channelId, params = {}) {
            let q = '';
            const queryParts = [];
            if (params.after) queryParts.push(`after=${params.after}`);
            if (params.limit) queryParts.push(`limit=${params.limit}`);
            if (params.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
            if (queryParts.length > 0) q = '?' + queryParts.join('&');
            return this.request(`/api/chat/channels/${channelId}/messages${q}`);
        }

        async sendChatMessage(channelId, messageData) {
            return this.request(`/api/chat/channels/${channelId}/messages`, {
                method: 'POST',
                json: messageData
            });
        }

        async uploadChatMedia(file) {
            const formData = new FormData();
            formData.append('file', file);
            return this.request('/api/chat/upload', {
                method: 'POST',
                body: formData
            });
        }

        async markChatRead(channelId, messageId = null) {
            return this.request(`/api/chat/channels/${channelId}/read`, {
                method: 'POST',
                json: { messageId }
            });
        }

        async searchChatMessages(query) {
            return this.request(`/api/chat/search?q=${encodeURIComponent(query)}`);
        }

        createChatStream(onMessage, onError) {
            if (!this.token) return null;
            if (typeof EventSource === 'undefined') return null;
            try {
                const url = `${this.baseUrl}/api/chat/stream?token=${encodeURIComponent(this.token)}`;
                const es = new EventSource(url);
                es.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (onMessage) onMessage(data);
                    } catch (e) {
                        console.error('SSE JSON parse error:', e);
                    }
                };
                if (onError) {
                    es.onerror = (e) => onError(e);
                }
                return es;
            } catch (e) {
                console.warn('Could not establish EventSource:', e);
                return null;
            }
        }

        // ==========================================
        // Dynamic Certificate & Official Dossier API
        // ==========================================
        async getCertificateConfig(coachId) {
            const q = coachId ? `?coachId=${coachId}` : '';
            return this.request(`/api/admin/certificate-config${q}`);
        }

        async updateCertificateConfig(configData) {
            return this.request('/api/admin/certificate-config', {
                method: 'PUT',
                json: configData
            });
        }

        async addCertificateRow(rowData) {
            return this.request('/api/admin/certificate-rows', {
                method: 'POST',
                json: rowData
            });
        }

        async updateCertificateRow(rowId, rowData) {
            return this.request(`/api/admin/certificate-rows/${rowId}`, {
                method: 'PUT',
                json: rowData
            });
        }

        async deleteCertificateRow(rowId, coachId) {
            const q = coachId ? `?coachId=${coachId}` : '';
            return this.request(`/api/admin/certificate-rows/${rowId}${q}`, {
                method: 'DELETE'
            });
        }

        async resetCertificateRows(coachId) {
            return this.request('/api/admin/certificate-rows/reset', {
                method: 'POST',
                json: { coachId }
            });
        }

        // ==========================================
        // Dynamic Tasks Bank API (Admin)
        // ==========================================
        async createAdminTask(taskData) {
            return this.request('/api/admin/tasks', {
                method: 'POST',
                json: taskData
            });
        }

        async updateAdminTask(taskId, taskData) {
            return this.request(`/api/admin/tasks/${taskId}`, {
                method: 'PUT',
                json: taskData
            });
        }

        async deleteAdminTask(taskId, coachId) {
            const q = coachId ? `?coachId=${coachId}` : '';
            return this.request(`/api/admin/tasks/${taskId}${q}`, {
                method: 'DELETE'
            });
        }

        // ==========================================
        // Dynamic Competencies API (Admin)
        // ==========================================
        async createAdminCompetency(compData) {
            return this.request('/api/admin/competencies', {
                method: 'POST',
                json: compData
            });
        }

        async updateAdminCompetency(compId, compData) {
            return this.request(`/api/admin/competencies/${compId}`, {
                method: 'PUT',
                json: compData
            });
        }

        async deleteAdminCompetency(compId, coachId) {
            const q = coachId ? `?coachId=${coachId}` : '';
            return this.request(`/api/admin/competencies/${compId}${q}`, {
                method: 'DELETE'
            });
        }

        // ==========================================
        // Dynamic Rubrics Criteria API (Admin)
        // ==========================================
        async createAdminRubricCriterion(critData) {
            return this.request('/api/admin/rubrics/criteria', {
                method: 'POST',
                json: critData
            });
        }

        async updateAdminRubricCriterion(critId, critData) {
            return this.request(`/api/admin/rubrics/criteria/${critId}`, {
                method: 'PUT',
                json: critData
            });
        }

        async deleteAdminRubricCriterion(critId, coachId) {
            const q = coachId ? `?coachId=${coachId}` : '';
            return this.request(`/api/admin/rubrics/criteria/${critId}${q}`, {
                method: 'DELETE'
            });
        }

        // ==========================================
        // Dynamic Targets & Quotas API (Admin)
        // ==========================================
        async updateAdminQuotas(quotasData) {
            return this.request('/api/admin/quotas', {
                method: 'PUT',
                json: quotasData
            });
        }

        // ==========================================
        // Dynamic Coaches Accounts API (Admin)
        // ==========================================
        async createAdminCoach(coachData) {
            return this.request('/api/admin/coaches', {
                method: 'POST',
                json: coachData
            });
        }

        async updateAdminCoach(coachId, coachData) {
            return this.request(`/api/admin/coaches/${coachId}`, {
                method: 'PUT',
                json: coachData
            });
        }

        async deleteAdminCoach(coachId) {
            return this.request(`/api/admin/coaches/${coachId}`, {
                method: 'DELETE'
            });
        }

        // ==========================================
        // Password Management & Targets Tuning (Admin)
        // ==========================================
        async resetCoachPassword(coachId, newPassword) {
            return this.request(`/api/admin/coaches/${coachId}/reset-password`, {
                method: 'POST',
                json: { newPassword }
            });
        }

        async tuneCoachTargets(coachId, customTargets) {
            return this.request(`/api/admin/coaches/${coachId}/tune-targets`, {
                method: 'PUT',
                json: { customTargets }
            });
        }

        // ==========================================
        // Multi-Cohort Management API (Admin & Public)
        // ==========================================
        async getCohorts() {
            if (!this.token) {
                return this.request('/api/auth/cohorts');
            }
            try {
                return await this.request('/api/admin/cohorts');
            } catch (err) {
                if (err.status === 401 || err.status === 403) {
                    return this.request('/api/auth/cohorts');
                }
                throw err;
            }
        }

        async getPublicCohorts() {
            return this.request('/api/auth/cohorts');
        }

        async getCohort(cohortId) {
            return this.request(`/api/admin/cohorts/${cohortId}`);
        }

        async createCohort(cohortData) {
            return this.request('/api/admin/cohorts', {
                method: 'POST',
                json: cohortData
            });
        }

        async updateCohort(cohortId, cohortData) {
            return this.request(`/api/admin/cohorts/${cohortId}`, {
                method: 'PUT',
                json: cohortData
            });
        }

        async deleteCohort(cohortId) {
            return this.request(`/api/admin/cohorts/${cohortId}`, {
                method: 'DELETE'
            });
        }

        async assignCoachesToCohort(cohortId, coachIds) {
            return this.request(`/api/admin/cohorts/${cohortId}/assign-coaches`, {
                method: 'POST',
                json: { coachIds }
            });
        }

        async addCoachToCohort(cohortId, identifier) {
            return this.request(`/api/admin/cohorts/${cohortId}/add-coach`, {
                method: 'POST',
                json: { identifier }
            });
        }

        async syncCohortTargets(cohortId) {
            return this.request(`/api/admin/cohorts/${cohortId}/sync-targets`, {
                method: 'POST'
            });
        }

        async exportCohortReport(cohortId) {
            return this.request(`/api/admin/cohorts/${cohortId}/export-report`);
        }

        async getAuditLogs(params = {}) {
            const queryParams = new URLSearchParams();
            if (params.limit) queryParams.append('limit', params.limit);
            if (params.action) queryParams.append('action', params.action);
            if (params.targetType) queryParams.append('targetType', params.targetType);
            if (params.targetId) queryParams.append('targetId', params.targetId);
            const q = queryParams.toString() ? `?${queryParams.toString()}` : '';
            return this.request(`/api/admin/audit-logs${q}`);
        }

        // Live Notifications Hub Client Methods
        async getNotifications(params = {}) {
            const queryParams = new URLSearchParams();
            if (params.type && params.type !== 'ALL') queryParams.append('type', params.type);
            if (params.unreadOnly) queryParams.append('unreadOnly', 'true');
            if (params.limit) queryParams.append('limit', params.limit);
            const q = queryParams.toString() ? `?${queryParams.toString()}` : '';
            return this.request(`/api/notifications${q}`);
        }

        async getUnreadNotificationsCount() {
            return this.request('/api/notifications/unread-count');
        }

        async markNotificationAsRead(id) {
            return this.request(`/api/notifications/${id}/read`, { method: 'POST' });
        }

        async markAllNotificationsAsRead() {
            return this.request('/api/notifications/read-all', { method: 'POST' });
        }

        async createNotification(notifData) {
            return this.request('/api/notifications', {
                method: 'POST',
                json: notifData
            });
        }

        // Public Certificate & Digital QR Verification
        async verifyCertificate(code) {
            return this.request(`/api/audit/verify?code=${encodeURIComponent(code)}`);
        }
    }

    const client = new ApiClient();
    window.ApiClient = client;
})();
