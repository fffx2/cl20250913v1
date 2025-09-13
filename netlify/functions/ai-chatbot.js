// netlify/functions/ai-chatbot.js
// 최종 완성 버전 - 버튼 기반 색상 추천 챗봇

const tinycolor = require('tinycolor2');

// 색상 추천 데이터베이스
const COLOR_SYSTEM = {
    'soft-dynamic': {
        title: '부드럽고 동적인',
        keywords: { 
            '귀여운': '#F8F2A1', 
            '경쾌한': '#F0E442', 
            '즐거운': '#FAD8A6', 
            '사랑스러운': '#F05A8D', 
            '아기자기한': '#F8C6CF', 
            '재미있는': '#F9A637' 
        }
    },
    'soft-static': {
        title: '부드럽고 정적인',
        keywords: { 
            '깨끗한': '#E9F3F8', 
            '맑은': '#97D4E9', 
            '은은한': '#E4DDC8', 
            '수수한': '#D3D3C1', 
            '내추럴한': '#C8B68E', 
            '부드러운': '#F1EBE0' 
        }
    },
    'hard-dynamic': {
        title: '딱딱하고 동적인',
        keywords: { 
            '화려한': '#E94868', 
            '다이나믹한': '#D53A30', 
            '모던한': '#4D54A0', 
            '스포티한': '#E69F00', 
            '개성적인': '#4D54A0', 
            '하이테크한': '#231F20' 
        }
    },
    'hard-static': {
        title: '딱딱하고 정적인',
        keywords: { 
            '클래식한': '#5A3B3C', 
            '점잖은': '#766A65', 
            '고상한': '#A694B6', 
            '우아한': '#A694B6', 
            '격식있는': '#2B2B2B', 
            '이성적인': '#0072B2' 
        }
    }
};

// 헥사 코드 유효성 검사
const isValidHex = (hex) => /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);

// 명도 대비 분석
const analyzeContrast = (hex) => {
    if (!isValidHex(hex)) {
        return { 
            reply: '올바른 헥사 코드 형식이 아닙니다. #으로 시작하는 6자리 코드를 입력해주세요. (예: #0066CC)',
            state: { step: 'awaiting_hex' }
        };
    }

    const mainColor = tinycolor(hex);
    const white = tinycolor('#FFFFFF');
    const darkText = tinycolor('#212529');

    const contrastWithWhite = tinycolor.readability(mainColor, white);
    const contrastWithDarkText = tinycolor.readability(mainColor, darkText);

    const whiteMeetsAA = contrastWithWhite >= 4.5;
    const darkTextMeetsAA = contrastWithDarkText >= 4.5;

    let result = `🎨 **${hex} 색상 분석 결과**\n\n`;
    result += `**텍스트 색상 추천:**\n\n`;
    result += `• **어두운 텍스트 (#212529)**\n`;
    result += `  명도 대비: ${contrastWithDarkText.toFixed(2)}:1\n`;
    result += `  ${darkTextMeetsAA ? '✅ WCAG AA 등급 만족' : '❌ WCAG AA 등급 미달'}\n\n`;
    result += `• **밝은 텍스트 (#FFFFFF)**\n`;
    result += `  명도 대비: ${contrastWithWhite.toFixed(2)}:1\n`;
    result += `  ${whiteMeetsAA ? '✅ WCAG AA 등급 만족' : '❌ WCAG AA 등급 미달'}\n\n`;
    
    if (darkTextMeetsAA && whiteMeetsAA) {
        result += `💡 **추천:** 두 색상 모두 사용 가능합니다. 배경에 따라 선택하세요.`;
    } else if (darkTextMeetsAA) {
        result += `💡 **추천:** 어두운 텍스트(#212529)를 사용하세요.`;
    } else if (whiteMeetsAA) {
        result += `💡 **추천:** 밝은 텍스트(#FFFFFF)를 사용하세요.`;
    } else {
        result += `⚠️ **경고:** 이 색상은 텍스트 배경으로 적합하지 않습니다. 다른 색상을 고려해보세요.`;
    }
    
    return { 
        reply: result,
        buttons: ['다른 색상 분석하기', '색상 추천받기'],
        state: { step: 'analysis_complete' }
    };
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
        return { 
            statusCode: 405, 
            headers, 
            body: JSON.stringify({ error: 'Method Not Allowed' }) 
        }; 
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { message, state = {} } = body;
        
        console.log('Received:', { message, state });
        
        let response = {};

        // 초기 상태 또는 분석 완료 후 다시 시작
        if (!state.step || state.step === 'init' || 
            (state.step === 'analysis_complete' && message === '다른 색상 분석하기')) {
            response = {
                reply: "안녕하세요! 웹 접근성 색상 컨설턴트입니다. 🎨\n\n정해진 메인 컬러가 있으신가요?",
                buttons: ['네, 있어요', '아니요, 추천해주세요'],
                state: { step: 'start' }
            };
        }
        // 분석 완료 후 색상 추천 요청
        else if (state.step === 'analysis_complete' && message === '색상 추천받기') {
            response = {
                reply: "어떤 느낌의 색상을 원하시나요?",
                buttons: ['Soft (부드러운)', 'Hard (딱딱한)'],
                state: { step: 'awaiting_feel' }
            };
        }
        // 시작 - Yes 선택
        else if (state.step === 'start' && (message === '네, 있어요' || message === 'yes')) {
            response = {
                reply: "메인 컬러의 헥사 코드를 입력해주세요.\n(예: #0066CC, #FF5733)",
                state: { step: 'awaiting_hex' }
            };
        }
        // 시작 - No 선택
        else if (state.step === 'start' && (message === '아니요, 추천해주세요' || message === 'no')) {
            response = {
                reply: "좋아요! 브랜드에 어울리는 메인 컬러를 찾아드릴게요.\n\n먼저, 원하시는 전체적인 **느낌**을 선택해주세요.",
                buttons: ['Soft (부드러운)', 'Hard (딱딱한)'],
                state: { step: 'awaiting_feel' }
            };
        }
        // 헥사코드 입력 처리
        else if (state.step === 'awaiting_hex') {
            response = analyzeContrast(message.trim());
        }
        // 느낌 선택
        else if (state.step === 'awaiting_feel') {
            const feel = message.toLowerCase().includes('soft') ? 'soft' : 'hard';
            response = {
                reply: `'${feel === 'soft' ? '부드러운' : '딱딱한'}' 느낌이군요!\n\n이번엔 원하시는 **분위기**를 선택해주세요.`,
                buttons: ['Static (정적인)', 'Dynamic (동적인)'],
                state: { step: 'awaiting_mood', feel }
            };
        }
        // 분위기 선택
        else if (state.step === 'awaiting_mood') {
            const mood = message.toLowerCase().includes('static') ? 'static' : 'dynamic';
            const groupKey = `${state.feel}-${mood}`;
            const group = COLOR_SYSTEM[groupKey];
            
            if (!group) {
                throw new Error('Invalid color group');
            }
            
            response = {
                reply: `'${group.title}' 스타일이네요!\n\n마지막으로, 아래 키워드 중 브랜드와 가장 잘 맞는 것을 선택해주세요.`,
                buttons: Object.keys(group.keywords),
                state: { step: 'awaiting_keyword', groupKey }
            };
        }
        // 키워드 선택
        else if (state.step === 'awaiting_keyword') {
            const group = COLOR_SYSTEM[state.groupKey];
            if (!group) {
                throw new Error('Invalid color group in state');
            }
            
            const hexCode = group.keywords[message];
            if (!hexCode) {
                response = {
                    reply: "선택하신 키워드를 찾을 수 없습니다. 다시 선택해주세요.",
                    buttons: Object.keys(group.keywords),
                    state: { step: 'awaiting_keyword', groupKey: state.groupKey }
                };
            } else {
                response = {
                    reply: `🎨 추천 색상을 찾았습니다!\n\n**'${message}'** 느낌의 메인 컬러: **${hexCode}**\n\n이 색상의 명도 대비를 분석해드릴까요?`,
                    buttons: ['네, 분석해주세요', '다시 선택하기'],
                    state: { step: 'ask_analyze_after_recommend', hex: hexCode }
                };
            }
        }
        // 추천 후 분석 여부
        else if (state.step === 'ask_analyze_after_recommend') {
            if (message === '네, 분석해주세요') {
                response = analyzeContrast(state.hex);
            } else if (message === '다시 선택하기') {
                response = {
                    reply: "다시 선택해드릴게요. 원하시는 느낌을 선택해주세요.",
                    buttons: ['Soft (부드러운)', 'Hard (딱딱한)'],
                    state: { step: 'awaiting_feel' }
                };
            }
        }
        // 기본 응답
        else {
            response = {
                reply: "죄송합니다. 이해하지 못했습니다. 처음부터 다시 시작할게요.\n\n정해진 메인 컬러가 있으신가요?",
                buttons: ['네, 있어요', '아니요, 추천해주세요'],
                state: { step: 'start' }
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