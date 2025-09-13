// [파일: analyze-html.js]
// 역할: HTML 코드의 웹 접근성을 정적으로 분석하고, 점수 및 상세 보고서를 생성.

// --- 1. 분석 도구(라이브러리) 임포트 ---

const cheerio = require('cheerio');       // HTML 파싱 및 DOM 탐색. (서버 사이드 jQuery)
const css = require('css');               // CSS 텍스트 파싱.
const { selectAll } = require('css-select'); // CSS 선택자를 이용한 요소 검색.
const tinycolor = require('tinycolor2');  // 색상값 처리 및 명도 대비 계산.

// --- 2. 웹 접근성 검사 규칙(Ruleset) 정의 ---

// 분석의 기준이 되는 정적 데이터. WCAG 가이드라인 기반.
const RULES = {
  // 색상 대비 규칙.
  colorContrast: {
    normalText: { aa: 4.5 },
    largeText: { aa: 3.0, sizeThreshold: 18 } // 18pt 기준.
  },
  // 시맨틱 태그의 필수 속성 규칙.
  semanticHTML: {
    requiredAttributes: {
      img: ['alt'],
      input: ['type', 'id'],
      label: ['for'],
    }
  }
  // ... (기타 규칙)
};

// --- 3. HTML 분석기 클래스 ---

class HTMLAccessibilityAnalyzer {
  // 생성자. HTML 문자열을 입력받아 분석 환경을 초기화.
  constructor(html) {
    this.$ = cheerio.load(html, { sourceCodeLocationInfo: true }); // 소스코드 위치 정보 포함하여 로드.
    this.critical = [];   // 치명적 문제점 목록.
    this.warnings = [];   // 경고 목록.
    this.score = 100;     // 100점에서 시작하는 점수.
  }

  // 분석 프로세스 실행 함수.
  analyze() {
    try {
      // 정의된 검사 메서드를 순차적으로 호출.
      this.checkColorContrast();
      this.checkSemanticHTML();
      this.checkImages();
      // ... (기타 검사 메서드 호출)

      // 최종 보고서 생성 및 반환.
      return this.generateReport();
    } catch (error) {
      console.error('분석 중 오류:', error);
      throw new Error('HTML 분석 중 내부 오류 발생.');
    }
  }

  // --- 3-1. 항목별 세부 검사 메서드 ---

  // 색상 대비 검사.
  checkColorContrast() {
    this.$('*').each((i, el) => {
      const styles = this.getComputedStyle(el); // 요소의 최종 적용 스타일 계산.
      const contrast = this.calculateContrast(styles.color, styles['background-color']);
      const fontSize = parseInt(styles['font-size']);
      const isLargeText = fontSize >= RULES.colorContrast.largeText.sizeThreshold;
      const requiredRatio = isLargeText ? RULES.colorContrast.largeText.aa : RULES.colorContrast.normalText.aa;

      // 대비율이 기준 미달일 경우, 문제점 등록 및 점수 차감.
      if (contrast < requiredRatio) {
        this.critical.push({
          rule: '색상 대비 부족',
          description: `색상 대비가 ${contrast.toFixed(2)}:1로 기준(${requiredRatio}:1) 미달.`,
        });
        this.score -= 10;
      }
    });
  }

  // 이미지 alt 속성 검사.
  checkImages() {
    this.$('img').each((i, el) => {
      const alt = this.$(el).attr('alt');

      // alt 속성이 존재하지 않을 경우, 문제점 등록 및 점수 차감.
      if (alt === undefined) {
        this.critical.push({
          rule: '이미지 대체 텍스트 누락',
          description: 'alt 속성 부재.',
        });
        this.score -= 12;
      }
    });
  }
  // ... (기타 검사 메서드)

  // --- 3-2. 분석 보조 메서드 ---

  // 색상 대비율 계산. tinycolor 라이브러리 활용.
  calculateContrast(color1, color2) {
    return tinycolor.readability(color1, color2);
  }

  // 점수에 따른 등급 산정.
  calculateGrade(score) {
    if (score >= 90) return 'AAA (우수)';
    if (score >= 80) return 'AA (양호)';
    return 'C (대폭 개선 필요)';
  }

  // 분석 결과를 종합하여 최종 보고서 객체 생성.
  generateReport() {
    return {
      summary: {
        score: Math.max(0, this.score),
        grade: this.calculateGrade(this.score),
        criticalCount: this.critical.length,
        warningCount: this.warnings.length,
      },
      critical: this.critical,
      warnings: this.warnings,
    };
  }
}

// --- 4. Netlify 서버리스 함수의 메인 핸들러 (진입점) ---
exports.handler = async (event, context) => {
  // ... (기본 서버 설정 및 보안 검사)

  try {
    // 요청 본문에서 HTML 데이터 추출.
    const body = JSON.parse(event.body || '{}');
    const { html, filename } = body;

    // 입력값 유효성 검사.
    if (!html || typeof html !== 'string') {
      return { statusCode: 400, body: JSON.stringify({ error: 'HTML 내용 필요.' }) };
    }

    // 분석기 인스턴스 생성 및 분석 실행.
    const analyzer = new HTMLAccessibilityAnalyzer(html);
    const results = analyzer.analyze();

    console.log(`HTML 분석 완료: ${filename || 'unknown'} - 점수: ${results.summary.score}`);

    // 클라이언트에게 분석 결과 보고서 반환.
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(results)
    };

  } catch (error) {
    console.error('HTML 분석 함수 오류:', error);
    return { statusCode: 500, body: JSON.stringify({ error: '서버 내부 오류.' }) };
  }
};