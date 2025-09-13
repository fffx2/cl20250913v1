// netlify/functions/ai-chatbot.js
// 웹 타이포그래피 중심 챗봇

const tinycolor = require('tinycolor2');

// 웹 타이포그래피 가이드 시스템
const TYPOGRAPHY_SYSTEM = {
    // 폰트 크기 체계
    fontSize: {
        'mobile': {
            title: '모바일 환경',
            sizes: {
                'body': { min: '16px', recommended: '16-18px', description: 'WCAG 권장 최소 크기' },
                'h1': { min: '24px', recommended: '28-32px', description: '페이지 제목' },
                'h2': { min: '20px', recommended: '22-24px', description: '섹션 제목' },
                'h3': { min: '18px', recommended: '18-20px', description: '소제목' },
                'caption': { min: '14px', recommended: '14px', description: '보조 텍스트 (최소한으로 사용)' }
            }
        },
        'desktop': {
            title: '데스크톱 환경',
            sizes: {
                'body': { min: '16px', recommended: '16-18px', description: '본문 텍스트' },
                'h1': { min: '32px', recommended: '36-48px', description: '페이지 제목' },
                'h2': { min: '24px', recommended: '28-32px', description: '섹션 제목' },
                'h3': { min: '20px', recommended: '20-24px', description: '소제목' },
                'caption': { min: '14px', recommended: '14-16px', description: '보조 텍스트' }
            }
        }
    },
    
    // 행간 (line-height) 가이드
    lineHeight: {
        'dense': { value: 1.2, usage: '제목, 헤딩', wcag: '최소값' },
        'normal': { value: 1.5, usage: '일반 본문', wcag: 'AA 권장' },
        'relaxed': { value: 1.6, usage: '긴 본문', wcag: 'AAA 권장' },
        'loose': { value: 1.8, usage: '가독성 최우선', wcag: '접근성 우수' }
    },
    
    // 자간 (letter-spacing) 가이드
    letterSpacing: {
        'tight': { value: '-0.025em', usage: '제목, 굵은 글꼴' },
        'normal': { value: '0', usage: '일반 본문' },
        'wide': { value: '0.025em', usage: '작은 글씨, 대문자' },
        'wider': { value: '0.12em', usage: 'WCAG 최소 권장' },
        'widest': { value: '0.15em', usage: 'WCAG 최적 권장' }
    },
    
    // 폰트 조합 추천
    fontPairing: {
        'professional': {
            title: '프로페셔널',
            heading: 'Pretendard, -apple-system, sans-serif',
            body: 'Pretendard, -apple-system, sans-serif',
            description: '깔끔하고 전문적인 느낌'
        },
        'friendly': {
            title: '친근한',
            heading: '"Noto Sans KR", sans-serif',
            body: '"Noto Sans KR", sans-serif',
            description: '부드럽고 친근한 느낌'
        },
        'modern': {
            title: '모던한',
            heading: 'Inter, -apple-system, sans-serif',
            body: 'Inter, -apple-system, sans-serif',
            description: '현대적이고 깨끗한 느낌'
        },
        'classic': {
            title: '클래식',
            heading: '"Nanum Myeongjo", serif',
            body: '"Noto Serif KR", serif',
            description: '신뢰감 있는 전통적 느낌'
        }
    },
    
    // 색상과 타이포그래피 조합
    colorTypography: {
        'high-contrast': {
            background: '#FFFFFF',
            text: '#000000',
            ratio: '21:1',
            usage: '최고 가독성'
        },
        'comfortable': {
            background: '#FFFFFF',
            text: '#212529',
            ratio: '16.75:1',
            usage: '편안한 읽기'
        },
        'soft': {
            background: '#F8F9FA',
            text: '#495057',
            ratio: '7.48:1',
            usage: '부드러운 느낌'
        }
    }
};

// 대화 플로우 상태
const CONVERSATION_FLOWS = {
    // 메인 메뉴
    main: {
        reply: "웹 타이포그래피 가이드에 오신 것을 환영합니다! 📝\n\n무엇을 도와드릴까요?",
        buttons: [
            '폰트 크기 가이드',
            '행간/자간 설정',
            '폰트 조합 추천',
            '색상과 가독성',
            '접근성 체크리스트'
        ]
    },
    
    // 각 섹션별 상세 가이드
    fontSize: {
        reply: "어떤 환경의 폰트 크기를 확인하시겠어요?",
        buttons: ['모바일 환경', '데스크톱 환경', '반응형 설계 팁']
    },
    
    lineSpacing: {
        reply: "행간과 자간 설정을 도와드릴게요. 어떤 용도인가요?",
        buttons: ['본문 텍스트', '제목 텍스트', '긴 문서', '모바일 최적화']
    },
    
    fontPairing: {
        reply: "어떤 느낌의 폰트 조합을 원하시나요?",
        buttons: ['프로페셔널', '친근한', '모던한', '클래식']
    }
};

// 타이포그래피 분석 함수
const analyzeTypography = (input) => {
    // 폰트 크기 분석
    const fontSizeMatch = input.match(/(\d+)(px|rem|em)/);
    if (fontSizeMatch) {
        const size = parseInt(fontSizeMatch[1]);
        const unit = fontSizeMatch[2];
        
        let analysis = `📏 **${size}${unit} 폰트 크기 분석**\n\n`;
        
        if (unit === 'px') {
            if (size < 14) {
                analysis += '❌ **너무 작음**: 14px 미만은 가독성이 매우 떨어집니다.\n';
                analysis += '💡 최소 16px 이상 사용을 권장합니다.\n';
            } else if (size < 16) {
                analysis += '⚠️ **주의 필요**: 본문에는 16px 이상을 권장합니다.\n';
                analysis += '💡 보조 텍스트로만 제한적으로 사용하세요.\n';
            } else if (size <= 18) {
                analysis += '✅ **적절함**: 본문 텍스트로 적합합니다.\n';
                analysis += '💡 행간을 1.5~1.6으로 설정하면 더 좋습니다.\n';
            } else if (size <= 32) {
                analysis += '✅ **제목 적합**: 소제목이나 강조 텍스트로 좋습니다.\n';
            } else {
                analysis += '✅ **대제목 적합**: 페이지 제목으로 활용하기 좋습니다.\n';
            }
        }
        
        return { reply: analysis, buttons: ['다른 크기 분석', '행간 가이드', '처음으로'] };
    }
    
    return null;
};

// 메인 핸들러
exports.handler = async (event, context) => {
    const headers = { 
        'Access-Control-Allow-Origin': '*', 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };
    
    if (event.httpMethod === 'OPTIONS') { 
        return { statusCode: 200, headers, body: '' }; 
    }
    
    if (event.httpMethod !== 'POST') { 
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) }; 
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { message, state = {} } = body;
        
        console.log('Received:', { message, state });
        
        let response = {};

        // 초기 상태 또는 처음으로 돌아가기
        if (!state.step || state.step === 'init' || message === '처음으로') {
            response = {
                ...CONVERSATION_FLOWS.main,
                state: { step: 'main' }
            };
        }
        // 폰트 크기 가이드
        else if (message === '폰트 크기 가이드') {
            response = {
                ...CONVERSATION_FLOWS.fontSize,
                state: { step: 'fontSize' }
            };
        }
        // 모바일 환경 선택
        else if (state.step === 'fontSize' && message === '모바일 환경') {
            const mobile = TYPOGRAPHY_SYSTEM.fontSize.mobile;
            let guide = `📱 **모바일 웹 타이포그래피 가이드**\n\n`;
            
            for (const [key, value] of Object.entries(mobile.sizes)) {
                guide += `**${key.toUpperCase()}**\n`;
                guide += `• 최소: ${value.min}\n`;
                guide += `• 권장: ${value.recommended}\n`;
                guide += `• 용도: ${value.description}\n\n`;
            }
            
            guide += `💡 **핵심 원칙**\n`;
            guide += `• 본문은 반드시 16px 이상\n`;
            guide += `• 터치 타겟은 44x44px 이상\n`;
            guide += `• 충분한 행간 확보 (1.5 이상)`;
            
            response = {
                reply: guide,
                buttons: ['데스크톱 환경', '행간/자간 설정', '처음으로'],
                state: { step: 'fontSize_detail' }
            };
        }
        // 데스크톱 환경 선택
        else if (state.step === 'fontSize' && message === '데스크톱 환경') {
            const desktop = TYPOGRAPHY_SYSTEM.fontSize.desktop;
            let guide = `🖥️ **데스크톱 웹 타이포그래피 가이드**\n\n`;
            
            for (const [key, value] of Object.entries(desktop.sizes)) {
                guide += `**${key.toUpperCase()}**\n`;
                guide += `• 최소: ${value.min}\n`;
                guide += `• 권장: ${value.recommended}\n`;
                guide += `• 용도: ${value.description}\n\n`;
            }
            
            guide += `💡 **핵심 원칙**\n`;
            guide += `• 본문 최소 16px 유지\n`;
            guide += `• 제목 계층 명확히 구분\n`;
            guide += `• 한 줄에 45-75자 권장`;
            
            response = {
                reply: guide,
                buttons: ['모바일 환경', '행간/자간 설정', '처음으로'],
                state: { step: 'fontSize_detail' }
            };
        }
        // 행간/자간 설정
        else if (message === '행간/자간 설정') {
            response = {
                ...CONVERSATION_FLOWS.lineSpacing,
                state: { step: 'lineSpacing' }
            };
        }
        // 본문 텍스트 행간
        else if (state.step === 'lineSpacing' && message === '본문 텍스트') {
            let guide = `📝 **본문 텍스트 행간/자간 가이드**\n\n`;
            guide += `**행간 (Line Height)**\n`;
            guide += `• 기본: 1.5 (WCAG AA 최소)\n`;
            guide += `• 권장: 1.6 (편안한 읽기)\n`;
            guide += `• 긴 문서: 1.8 (피로감 감소)\n\n`;
            guide += `**자간 (Letter Spacing)**\n`;
            guide += `• 기본: 0\n`;
            guide += `• 작은 글씨 (14px): 0.025em\n`;
            guide += `• WCAG 권장: 0.12em 이상\n\n`;
            guide += `**단락 간격**\n`;
            guide += `• 최소: 1.5em\n`;
            guide += `• 권장: 2em`;
            
            response = {
                reply: guide,
                buttons: ['제목 텍스트', '모바일 최적화', '처음으로'],
                state: { step: 'lineSpacing_detail' }
            };
        }
        // 폰트 조합 추천
        else if (message === '폰트 조합 추천') {
            response = {
                ...CONVERSATION_FLOWS.fontPairing,
                state: { step: 'fontPairing' }
            };
        }
        // 폰트 조합 상세
        else if (state.step === 'fontPairing' && TYPOGRAPHY_SYSTEM.fontPairing[message.toLowerCase()]) {
            const pairing = TYPOGRAPHY_SYSTEM.fontPairing[message.toLowerCase()];
            let guide = `🎨 **${pairing.title} 폰트 조합**\n\n`;
            guide += `**제목용 폰트**\n${pairing.heading}\n\n`;
            guide += `**본문용 폰트**\n${pairing.body}\n\n`;
            guide += `**특징**: ${pairing.description}\n\n`;
            guide += `**CSS 예시**\n`;
            guide += `\`\`\`css\n`;
            guide += `h1, h2, h3 {\n  font-family: ${pairing.heading};\n}\n`;
            guide += `body, p {\n  font-family: ${pairing.body};\n}\n`;
            guide += `\`\`\``;
            
            response = {
                reply: guide,
                buttons: ['다른 조합 보기', '폰트 크기 가이드', '처음으로'],
                state: { step: 'fontPairing_detail' }
            };
        }
        // 색상과 가독성
        else if (message === '색상과 가독성') {
            let guide = `🎨 **색상과 타이포그래피 가독성**\n\n`;
            
            for (const [key, value] of Object.entries(TYPOGRAPHY_SYSTEM.colorTypography)) {
                guide += `**${value.usage}**\n`;
                guide += `• 배경: ${value.background}\n`;
                guide += `• 텍스트: ${value.text}\n`;
                guide += `• 명도비: ${value.ratio}\n\n`;
            }
            
            guide += `💡 **WCAG 기준**\n`;
            guide += `• 일반 텍스트: 4.5:1 이상\n`;
            guide += `• 큰 텍스트 (18pt+): 3:1 이상\n`;
            guide += `• AAA 등급: 7:1 이상`;
            
            response = {
                reply: guide,
                buttons: ['헥사코드 분석', '폰트 크기 가이드', '처음으로'],
                state: { step: 'color' }
            };
        }
        // 접근성 체크리스트
        else if (message === '접근성 체크리스트') {
            let guide = `✅ **웹 타이포그래피 접근성 체크리스트**\n\n`;
            guide += `**필수 항목**\n`;
            guide += `☐ 본문 최소 16px\n`;
            guide += `☐ 행간 1.5 이상\n`;
            guide += `☐ 명도비 4.5:1 이상\n`;
            guide += `☐ 확대 200% 시 가로 스크롤 없음\n`;
            guide += `☐ 사용자 폰트 크기 조절 가능\n\n`;
            guide += `**권장 항목**\n`;
            guide += `☐ 자간 0.12em 이상\n`;
            guide += `☐ 단락 간격 2em\n`;
            guide += `☐ 한 줄 45-75자\n`;
            guide += `☐ 제목 계층 구조 명확\n`;
            guide += `☐ 다크모드 지원`;
            
            response = {
                reply: guide,
                buttons: ['폰트 크기 가이드', '행간/자간 설정', '처음으로'],
                state: { step: 'checklist' }
            };
        }
        // 반응형 설계 팁
        else if (message === '반응형 설계 팁') {
            let guide = `📱💻 **반응형 타이포그래피 설계**\n\n`;
            guide += `**유동적 크기 (Fluid Typography)**\n`;
            guide += `\`\`\`css\n`;
            guide += `/* clamp(최소, 선호, 최대) */\n`;
            guide += `h1 {\n  font-size: clamp(1.5rem, 4vw, 3rem);\n}\n`;
            guide += `p {\n  font-size: clamp(1rem, 2vw, 1.25rem);\n}\n`;
            guide += `\`\`\`\n\n`;
            guide += `**브레이크포인트별 설정**\n`;
            guide += `• 모바일 (<768px): 16px\n`;
            guide += `• 태블릿 (768-1024px): 17px\n`;
            guide += `• 데스크톱 (>1024px): 18px\n\n`;
            guide += `**rem 단위 활용**\n`;
            guide += `• html { font-size: 100%; }\n`;
            guide += `• 1rem = 16px 기준\n`;
            guide += `• 미디어쿼리로 html font-size 조절`;
            
            response = {
                reply: guide,
                buttons: ['모바일 환경', '데스크톱 환경', '처음으로'],
                state: { step: 'responsive' }
            };
        }
        // 헥사코드 분석 (색상)
        else if (state.step === 'color' && message === '헥사코드 분석') {
            response = {
                reply: "텍스트 색상의 헥사코드를 입력해주세요. (예: #212529)",
                state: { step: 'awaiting_hex' }
            };
        }
        // 헥사코드 입력 처리
        else if (state.step === 'awaiting_hex') {
            const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
            if (hexPattern.test(message.trim())) {
                const analysis = analyzeContrast(message.trim());
                response = analysis;
            } else {
                // 폰트 크기 분석 시도
                const typographyAnalysis = analyzeTypography(message);
                if (typographyAnalysis) {
                    response = typographyAnalysis;
                } else {
                    response = {
                        reply: "올바른 헥사코드 형식이 아닙니다. #000000 형식으로 입력해주세요.",
                        buttons: ['다시 입력', '처음으로'],
                        state: { step: 'awaiting_hex' }
                    };
                }
            }
        }
        // 기본 응답
        else {
            response = {
                ...CONVERSATION_FLOWS.main,
                state: { step: 'main' }
            };
        }

        console.log('Response:', response);
        
        return { 
            statusCode: 200, 
            headers, 
            body: JSON.stringify(response) 
        };

    } catch (error) {
        console.error('Error:', error);
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ 
                error: '처리 중 오류가 발생했습니다.',
                details: error.message 
            }) 
        };
    }
};

// 색상 대비 분석 (타이포그래피 관점)
function analyzeContrast(hex) {
    const mainColor = tinycolor(hex);
    const white = tinycolor('#FFFFFF');
    const black = tinycolor('#000000');
    const lightBg = tinycolor('#F8F9FA');
    
    const contrastWithWhite = tinycolor.readability(mainColor, white);
    const contrastWithBlack = tinycolor.readability(mainColor, black);
    const contrastWithLight = tinycolor.readability(mainColor, lightBg);
    
    let result = `🎨 **${hex} 타이포그래피 분석**\n\n`;
    
    result += `**흰 배경 (#FFFFFF)**\n`;
    result += `• 명도비: ${contrastWithWhite.toFixed(2)}:1\n`;
    result += `• 일반 텍스트: ${contrastWithWhite >= 4.5 ? '✅ 사용 가능' : '❌ 사용 불가'}\n`;
    result += `• 큰 텍스트(18pt+): ${contrastWithWhite >= 3 ? '✅ 사용 가능' : '❌ 사용 불가'}\n\n`;
    
    result += `**검은 배경 (#000000)**\n`;
    result += `• 명도비: ${contrastWithBlack.toFixed(2)}:1\n`;
    result += `• 일반 텍스트: ${contrastWithBlack >= 4.5 ? '✅ 사용 가능' : '❌ 사용 불가'}\n\n`;
    
    result += `**밝은 회색 배경 (#F8F9FA)**\n`;
    result += `• 명도비: ${contrastWithLight.toFixed(2)}:1\n`;
    result += `• 일반 텍스트: ${contrastWithLight >= 4.5 ? '✅ 사용 가능' : '❌ 사용 불가'}\n\n`;
    
    result += `💡 **추천 사용법**\n`;
    if (contrastWithWhite >= 7) {
        result += `• 모든 크기의 텍스트에 우수함\n`;
        result += `• 본문 텍스트 최적`;
    } else if (contrastWithWhite >= 4.5) {
        result += `• 일반 본문 텍스트 사용 가능\n`;
        result += `• 중요 정보는 굵게 표시 권장`;
    } else if (contrastWithWhite >= 3) {
        result += `• 18pt 이상 큰 텍스트만 사용\n`;
        result += `• 제목이나 강조 텍스트용`;
    } else {
        result += `• 텍스트 색상으로 부적합\n`;
        result += `• 배경색이나 장식용으로만 사용`;
    }
    
    return {
        reply: result,
        buttons: ['다른 색상 분석', '폰트 크기 가이드', '처음으로'],
        state: { step: 'color_analyzed' }
    };
}