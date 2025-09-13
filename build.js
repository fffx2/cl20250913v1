#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

class ProjectBuilder {
  constructor() {
    this.buildDir = 'public';
    this.startTime = Date.now();
  }

  async build() {
    console.log('🚀 접근성 디자인 어시스턴트 빌드 시작...\n');

    try {
      await this.validateEnvironment();
      await this.createDirectories();
      await this.processAssets();
      await this.optimizeFiles();
      await this.generateManifest();
      
      const buildTime = Date.now() - this.startTime;
      console.log(`\n✅ 빌드 완료! (${buildTime}ms)`);
      console.log(`📦 결과물: ${this.buildDir} 디렉토리`);
      console.log('🌐 Netlify에 배포 준비 완료\n');
      
    } catch (error) {
      console.error('❌ 빌드 실패:', error.message);
      process.exit(1);
    }
  }

  async validateEnvironment() {
    console.log('🔍 환경 검증 중...');
    
    // Node.js 버전 확인
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1));
    
    if (majorVersion < 18) {
      throw new Error(`Node.js 18 이상이 필요합니다. 현재: ${nodeVersion}`);
    }

    // 필수 디렉토리 존재 확인
    const requiredDirs = ['public', 'netlify/functions'];
    for (const dir of requiredDirs) {
      try {
        await fs.access(dir);
      } catch {
        throw new Error(`필수 디렉토리가 없습니다: ${dir}`);
      }
    }

    // package.json 확인
    try {
      const packageJson = await fs.readFile('package.json', 'utf8');
      const pkg = JSON.parse(packageJson);
      
      const requiredDeps = ['cheerio', 'tinycolor2'];
      const missing = requiredDeps.filter(dep => !pkg.dependencies[dep]);
      
      if (missing.length > 0) {
        console.warn(`⚠️ 누락된 의존성: ${missing.join(', ')}`);
      }
    } catch {
      console.warn('⚠️ package.json을 찾을 수 없습니다.');
    }

    console.log('✅ 환경 검증 완료');
  }

  async createDirectories() {
    console.log('📁 디렉토리 구조 생성 중...');
    
    const dirs = [
      'public/css',
      'public/js',
      'public/data',
      'public/images',
      'netlify/functions'
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }

    console.log('✅ 디렉토리 구조 생성 완료');
  }

  async processAssets() {
    console.log('🎨 에셋 처리 중...');
    
    // CSS 최적화 (기본적인 압축)
    try {
      const cssPath = path.join(this.buildDir, 'css', 'styles.css');
      const cssContent = await fs.readFile(cssPath, 'utf8');
      
      // 주석 제거 및 공백 최적화
      const optimizedCSS = cssContent
        .replace(/\/\*[\s\S]*?\*\//g, '') // 주석 제거
        .replace(/\s+/g, ' ') // 연속된 공백을 하나로
        .replace(/;\s*}/g, '}') // 세미콜론 뒤 공백 제거
        .replace(/{\s*/g, '{') // 중괄호 뒤 공백 제거
        .replace(/}\s*/g, '}') // 중괄호 앞 공백 제거
        .trim();
      
      await fs.writeFile(cssPath, optimizedCSS);
      console.log('  ✅ CSS 최적화 완료');
    } catch (error) {
      console.warn('  ⚠️ CSS 최적화 실패:', error.message);
    }

    // JavaScript 기본 검증
    try {
      const jsPath = path.join(this.buildDir, 'js', 'app.js');
      const jsContent = await fs.readFile(jsPath, 'utf8');
      
      // 기본적인 JavaScript 문법 검증
      try {
        new Function(jsContent);
        console.log('  ✅ JavaScript 문법 검증 통과');
      } catch (syntaxError) {
        console.warn('  ⚠️ JavaScript 문법 오류:', syntaxError.message);
      }
    } catch (error) {
      console.warn('  ⚠️ JavaScript 파일을 찾을 수 없습니다.');
    }

    console.log('✅ 에셋 처리 완료');
  }

  async optimizeFiles() {
    console.log('⚡ 파일 최적화 중...');

    // HTML 최적화
    try {
      const htmlPath = path.join(this.buildDir, 'index.html');
      let htmlContent = await fs.readFile(htmlPath, 'utf8');
      
      // 불필요한 공백 제거 (단, 가독성은 유지)
      htmlContent = htmlContent
        .replace(/>\s+</g, '><') // 태그 사이 공백 제거
        .replace(/\s+/g, ' ') // 연속 공백을 하나로
        .replace(/<!--[\s\S]*?-->/g, ''); // HTML 주석 제거
      
      await fs.writeFile(htmlPath, htmlContent);
      console.log('  ✅ HTML 최적화 완료');
    } catch (error) {
      console.warn('  ⚠️ HTML 최적화 실패:', error.message);
    }

    // JSON 파일 검증 및 최적화
    try {
      const jsonPath = path.join(this.buildDir, 'data', 'rules.json');
      const jsonContent = await fs.readFile(jsonPath, 'utf8');
      
      // JSON 유효성 검증
      const jsonData = JSON.parse(jsonContent);
      
      // 압축된 JSON으로 재작성
      await fs.writeFile(jsonPath, JSON.stringify(jsonData));
      console.log('  ✅ JSON 최적화 완료');
    } catch (error) {
      console.warn('  ⚠️ JSON 최적화 실패:', error.message);
    }

    console.log('✅ 파일 최적화 완료');
  }

  async generateManifest() {
    console.log('📋 빌드 매니페스트 생성 중...');

    const manifest = {
      name: 'accessibility-design-assistant',
      version: '1.0.0',
      buildTime: new Date().toISOString(),
      nodeVersion: process.version,
      files: await this.getFileList(),
      netlify: {
        functions: ['analyze-html', 'ai-chatbot', 'recommend-design'],
        buildCommand: 'npm run build',
        publishDirectory: 'public'
      },
      features: [
        'HTML 접근성 분석',
        'AI 디자인 어시스턴트',
        'WCAG 2.1 준수',
        'IRI 색채 시스템',
        '반응형 디자인',
        'Pretendard 폰트'
      ],
      accessibility: {
        wcagLevel: 'AA',
        colorContrast: 'AAA',
        keyboardNavigation: true,
        screenReaderOptimized: true
      }
    };

    await fs.writeFile(
      path.join(this.buildDir, 'build-manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    console.log('✅ 매니페스트 생성 완료');
  }

  async getFileList() {
    const files = [];
    
    const scanDirectory = async (dir, baseDir = '') => {
      try {
        const items = await fs.readdir(dir, { withFileTypes: true });
        
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          const relativePath = path.join(baseDir, item.name);
          
          if (item.isDirectory()) {
            await scanDirectory(fullPath, relativePath);
          } else {
            const stats = await fs.stat(fullPath);
            files.push({
              path: relativePath,
              size: stats.size,
              modified: stats.mtime.toISOString()
            });
          }
        }
      } catch (error) {
        // 디렉토리가 없으면 무시
      }
    };

    await scanDirectory(this.buildDir);
    await scanDirectory('netlify', 'netlify');
    
    return files.sort((a, b) => a.path.localeCompare(b.path));
  }

  async validateBuild() {
    console.log('🔍 빌드 결과 검증 중...');

    const requiredFiles = [
      'public/index.html',
      'public/css/styles.css',
      'public/js/app.js',
      'public/data/rules.json',
      'netlify/functions/analyze-html.js',
      'netlify/functions/ai-chatbot.js',
      'netlify/functions/recommend-design.js'
    ];

    for (const file of requiredFiles) {
      try {
        await fs.access(file);
        console.log(`  ✅ ${file}`);
      } catch {
        console.error(`  ❌ ${file} - 파일이 없습니다!`);
        throw new Error(`필수 파일이 누락되었습니다: ${file}`);
      }
    }

    console.log('✅ 빌드 검증 완료');
  }
}

// 메인 실행
async function main() {
  const builder = new ProjectBuilder();
  
  try {
    await builder.build();
    await builder.validateBuild();
    
    console.log('\n🎉 프로젝트 빌드 성공!');
    console.log('📝 배포 가이드:');
    console.log('   1. GitHub에 코드 푸시');
    console.log('   2. Netlify에서 GitHub 저장소 연결');
    console.log('   3. 환경 변수 OPENAI_API_KEY 설정');
    console.log('   4. 자동 배포 완료 대기');
    console.log('\n🔗 유용한 명령어:');
    console.log('   - npm run dev: 로컬 개발 서버');
    console.log('   - npm run deploy: 프로덕션 배포');
    console.log('');
    
  } catch (error) {
    console.error('\n💥 빌드 실패!');
    console.error('오류:', error.message);
    console.log('\n🛠️ 문제 해결:');
    console.log('   1. 모든 파일이 올바른 위치에 있는지 확인');
    console.log('   2. package.json 의존성 설치: npm install');
    console.log('   3. Node.js 18 이상 버전 사용');
    console.log('   4. 파일 권한 확인');
    process.exit(1);
  }
}

// 스크립트가 직접 실행될 때만 main 함수 호출
if (require.main === module) {
  main().catch(console.error);
}

module.exports = ProjectBuilder;