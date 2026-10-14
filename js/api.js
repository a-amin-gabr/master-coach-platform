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
    }

    const client = new ApiClient();
    window.ApiClient = client;
})();
