// public/js/app.js
// 최종 완성 버전 - 클라이언트 JavaScript

// 전역 상태 관리
const AppState = {
    currentFile: null,
    analysisResults: null,
    chatHistory: [],
    isLoading: false,
    chatState: { step: 'init' }
};

// DOM 요소 캐싱
const elements = {
    fileInput: document.getElementById('html-file'),
    analysisResults: document.getElementById('analysis-results'),
    chatMessages: document.getElementById('chat-messages'),
    chatForm: document.getElementById('chat-form'),
    chatInput: document.getElementById('chat-input'),
    sendButton: document.querySelector('.send-button'),
    navLinks: document.querySelectorAll('.nav-link')
};

// 유틸리티 함수
const utils = {
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    formatMarkdown(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>')
            .replace(/•/g, '&bull;');
    },
    
    async apiCall(endpoint, data) {
        const baseUrl = window.location.hostname === 'localhost' 
            ? 'http://localhost:8888/.netlify/functions/'
            : '/.netlify/functions/';
            
        const response = await fetch(baseUrl + endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || 'API 호출 실패');
        }
        
        return response.json();
    }
};

// AI 채팅 모듈
const AIChatBot = {
    async init() {
        this.addMessage('안녕하세요! 웹 접근성 색상 컨설턴트입니다. 🎨', 'bot');
        await this.sendInitialMessage();
    },
    
    async sendInitialMessage() {
        try {
            const response = await utils.apiCall('ai-chatbot', {
                message: null,
                state: { step: 'init' }
            });
            
            AppState.chatState = response.state || { step: 'init' };
            this.addMessage(response.reply, 'bot', false, response.buttons);
            
        } catch (error) {
            console.error('Initial message error:', error);
            this.addMessage('연결에 문제가 있습니다. 새로고침 후 다시 시도해주세요.', 'bot');
        }
    },
    
    async sendMessage(message, isButtonClick = false) {
        if (AppState.isLoading) return;
        
        // 사용자 메시지 표시
        if (message) {
            this.addMessage(message, 'user');
        }
        
        // 로딩 상태
        this.setLoading(true);
        const loadingElement = this.addMessage('답변을 생성하고 있습니다...', 'bot', true);
        
        try {
            console.log('Sending:', { message, state: AppState.chatState });
            
            const response = await utils.apiCall('ai-chatbot', {
                message: message,
                state: AppState.chatState
            });
            
            console.log('Received:', response);
            
            // 로딩 메시지 제거
            loadingElement.remove();
            
            // 상태 업데이트
            AppState.chatState = response.state || AppState.chatState;
            
            // AI 응답 표시
            this.addMessage(response.reply, 'bot', false, response.buttons);
            
            // 히스토리 업데이트
            if (message) {
                AppState.chatHistory.push(
                    { role: 'user', content: message },
                    { role: 'assistant', content: response.reply }
                );
            }
            
        } catch (error) {
            console.error('Send message error:', error);
            loadingElement.remove();
            this.addMessage('오류가 발생했습니다. 다시 시도해주세요.', 'bot');
        } finally {
            this.setLoading(false);
        }
    },
    
    addMessage(content, sender, isLoading = false, buttons = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = sender === 'user' ? '👤' : '🤖';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        if (isLoading) {
            messageContent.innerHTML = '<div class="loading">답변 생성 중...</div>';
        } else {
            messageContent.innerHTML = utils.formatMarkdown(content);
        }
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        elements.chatMessages.appendChild(messageDiv);
        
        // 버튼 렌더링
        if (buttons && buttons.length > 0) {
            this.renderButtons(buttons);
        }
        
        // 스크롤
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
        
        return messageDiv;
    },
    
    renderButtons(buttonLabels) {
        // 기존 버튼 제거
        const existingButtons = document.querySelector('.chat-buttons');
        if (existingButtons) {
            existingButtons.remove();
        }
        
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'chat-buttons';
        
        buttonLabels.forEach(label => {
            const button = document.createElement('button');
            button.textContent = label;
            button.className = 'chat-button';
            
            button.onclick = () => {
                // 모든 버튼 비활성화
                buttonContainer.querySelectorAll('.chat-button').forEach(btn => {
                    btn.disabled = true;
                    btn.style.opacity = '0.5';
                });
                
                // 선택된 버튼 강조
                button.classList.add('selected');
                
                // 메시지 전송
                this.sendMessage(label, true);
            };
            
            buttonContainer.appendChild(button);
        });
        
        elements.chatMessages.appendChild(buttonContainer);
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    },
    
    setLoading(isLoading) {
        AppState.isLoading = isLoading;
        if (elements.chatInput) {
            elements.chatInput.disabled = isLoading;
        }
        if (elements.sendButton) {
            elements.sendButton.disabled = isLoading;
        }
    }
};

// HTML 분석 모듈
const HTMLAnalyzer = {
    async analyzeFile(file) {
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            const html = e.target.result;
            
            try {
                const results = await utils.apiCall('analyze-html', {
                    html: html,
                    filename: file.name
                });
                
                AppState.analysisResults = results;
                this.displayResults(results);
                
            } catch (error) {
                console.error('Analysis error:', error);
                this.displayError('분석 중 오류가 발생했습니다.');
            }
        };
        
        reader.readAsText(file);
    },
    
    displayResults(results) {
        if (!elements.analysisResults) return;
        
        const html = `
            <div class="result-section">
                <h3 class="result-title">
                    <span class="status-icon ${results.summary.score >= 80 ? 'status-success' : results.summary.score >= 60 ? 'status-warning' : 'status-critical'}">
                        ${results.summary.score >= 80 ? '✅' : results.summary.score >= 60 ? '⚠️' : '❌'}
                    </span>
                    접근성 점수: ${results.summary.score}점 (${results.summary.grade})
                </h3>
                
                ${results.critical && results.critical.length > 0 ? `
                    <div class="issue-list">
                        <h4>치명적 문제 (${results.critical.length})</h4>
                        ${results.critical.map(issue => `
                            <div class="issue-item critical">
                                <strong>${issue.rule}</strong>: ${issue.description}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                ${results.warnings && results.warnings.length > 0 ? `
                    <div class="issue-list">
                        <h4>경고사항 (${results.warnings.length})</h4>
                        ${results.warnings.map(issue => `
                            <div class="issue-item warning">
                                <strong>${issue.rule}</strong>: ${issue.description}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
        
        elements.analysisResults.innerHTML = html;
        elements.analysisResults.classList.add('show');
    },
    
    displayError(message) {
        if (!elements.analysisResults) return;
        
        elements.analysisResults.innerHTML = `
            <div class="issue-item critical">
                ${message}
            </div>
        `;
        elements.analysisResults.classList.add('show');
    }
};

// 네비게이션 모듈
const Navigation = {
    init() {
        elements.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                // 활성 상태 업데이트
                elements.navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                
                // 섹션으로 스크롤
                const targetId = link.getAttribute('href').substring(1);
                const targetSection = document.getElementById(targetId);
                
                if (targetSection) {
                    targetSection.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }
};

// 이벤트 리스너
const EventListeners = {
    init() {
        // 파일 업로드
        if (elements.fileInput) {
            elements.fileInput.addEventListener('change', this.handleFileUpload);
        }
        
        // 채팅 폼
        if (elements.chatForm) {
            elements.chatForm.addEventListener('submit', this.handleChatSubmit);
        }
        
        // 엔터키 처리
        if (elements.chatInput) {
            elements.chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    elements.chatForm.dispatchEvent(new Event('submit'));
                }
            });
        }
    },
    
    handleFileUpload(e) {
        const file = e.target.files[0];
        if (file && (file.type === 'text/html' || file.name.endsWith('.html'))) {
            AppState.currentFile = file;
            HTMLAnalyzer.analyzeFile(file);
        } else {
            alert('HTML 파일을 선택해주세요.');
        }
    },
    
    async handleChatSubmit(e) {
        e.preventDefault();
        
        const message = elements.chatInput.value.trim();
        if (!message || AppState.isLoading) return;
        
        await AIChatBot.sendMessage(message, false);
        elements.chatInput.value = '';
        elements.chatInput.focus();
    }
};

// 앱 초기화
const App = {
    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setup();
        });
    },
    
    setup() {
        console.log('App initializing...');
        
        // 모듈 초기화
        EventListeners.init();
        Navigation.init();
        
        // 채팅봇 초기화
        if (elements.chatMessages) {
            AIChatBot.init();
        }
        
        console.log('App initialized');
    }
};

// 앱 시작
App.init();