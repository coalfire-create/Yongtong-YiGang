const content = `[수업 일정]
화/목 18:00-22:00

[강좌 특징]
지금까지 공부한 수학내용과 전혀 다른 형태의 개념수업. 정확한 개념을 학생 스스로 설명할 수 있게 만들어 주는 학습법.

[교재/제공자료]
기본정석/RPM

[과제/TEST]
수준별 개별 테스트와 개별 과제 제공

[관리 SYSTEM 및 CLINIC]
• 과제 체크 : 과제 입력한 것을 바탕으로 오답 체크와 오답문항 재배부. 완벽하게 학습할때까지 과제 체크
• 테스트 : 과제내용과 전 수업시간에 배운것을 바탕으로 리뷰테스트 다음시간에 제공
• 클리닉 : 개별 FEEDBACK 클리닉 진행

[회차별 내용]
1회차 - 다항식연산
2회차 - 항등식과 나머지정리
3회차 - 인수분해, 복소수
4회차 - 이차방정식과 이차함수
5회차 - 이차함수와 그래프
6회차 - 여러가지 방정식
7회차 - 부등식
8회차 - 이차부등식, 경우의수
9회차 - 순열, 조합
10회차 - 행렬`;

const parseToTable = (content) => {
    const preprocessed = content
      .replace(/\s+•\s*/g, '\n• ')
      .replace(/\[([^\]\n]*?)\r?\n([^\]\n]*?)\]/g, '[$1 $2]');
    const lines = preprocessed.split("\n").map(l => l.replace(/^ +| +$/g, '')).filter(l => l.trim() !== "");
    const sections = [];
    let currentSection = null;
    let startDateInfo = "";
    
    const standardCategories = [
      "수업 일정", "수업일정", 
      "강좌 특징", "강좌특징", 
      "교재/제공자료", "교재/제공 자료", "교재/자료", "교재 / 제공자료", "교재",
      "과제/TEST", "과제/테스트", "과제 / TEST", "과제",
      "관리 SYSTEM 및 CLINIC", "관리 SYSTEM", "관리 시스템", "관리시스템", "관리 SYSTEM 및 클리닉", "관리SYSTEM", "관리",
      "클리닉",
      "회차별 내용", "회차별내용", 
      "연계 강좌", "연계강좌"
    ];

    for (const line of lines) {
      let categoryName = "";
      let catMatch = line.trim().match(/^[\[【]([^\]】]+)[\]】]$/);
      let inlineContent = "";
      
      const startMatch = line.match(/^(?:-|•)?\s*개강일\s*\/?\s*회차\s*[:\-–—]\s*(.*)$/);
      if (startMatch) {
        startDateInfo = startMatch[1].trim();
        continue;
      }
      
      if (line.match(/^(?:-|•)?\s*\d+(?:[~,\-]\d+)?회차\s*[:\-]/) && (!currentSection || currentSection.category !== "회차별 내용")) {
         currentSection = { category: "회차별 내용", items: [] };
         sections.push(currentSection);
      }

      if (catMatch) {
        categoryName = catMatch[1].trim();
      } else {
        const isSubcatForbidden = currentSection && (
          currentSection.category === "관리 SYSTEM 및 CLINIC" || 
          currentSection.category === "과제" ||
          currentSection.category === "과제/TEST"
        );
        
        const sortedCats = [...standardCategories].sort((a, b) => b.length - a.length);
        for (const cat of sortedCats) {
          if (isSubcatForbidden && (cat === "클리닉" || cat === "과제" || cat === "과제/TEST" || cat === "교재" || cat.includes("교재"))) {
            continue;
          }
          const catRegexStr = cat.split('').map(char => char === ' ' ? '\\s*' : char.replace(/[\/]/g, '\\/')).join('');
          const regex = new RegExp(`^(${catRegexStr})(?:\\s*[:\\-–—：]+\\s*|\\t+|$)(.*)$`, 'i');
          const match = line.trim().match(regex);
          if (match) {
            categoryName = cat;
            catMatch = [line, cat];
            inlineContent = match[2].trim();
            break;
          }
        }
      }

      if (catMatch) {
        if (categoryName.replace(/\s+/g, '') === "수업일정") categoryName = "수업 일정";
        if (categoryName.replace(/\s+/g, '') === "강좌특징") categoryName = "강좌 특징";
        if (categoryName.replace(/\s+/g, '').includes("교재")) categoryName = "교재/제공자료";
        if (categoryName.replace(/\s+/g, '').includes("과제")) categoryName = "과제";
        if (categoryName.replace(/\s+/g, '').includes("관리")) categoryName = "관리 SYSTEM 및 CLINIC";
        if (categoryName.replace(/\s+/g, '') === "회차별내용") categoryName = "회차별 내용";
        if (categoryName.replace(/\s+/g, '').includes("연계강좌")) categoryName = "연계 강좌";

        currentSection = { category: categoryName, items: [] };
        sections.push(currentSection);

        if (inlineContent) {
          currentSection.items.push({ subCategory: "", content: inlineContent });
        }
      } else if (currentSection) {
        let cleanLine = line.replace(/^\t+/, '').trim();
        
        if (currentSection.category === "회차별 내용") {
          let m = cleanLine.match(/^(?:-|•)?\s*(\d+(?:[~,\-]\d+)?회차\s*[:\-]\s*)\d{1,2}\/\d{1,2}(?:\([가-힣]\))?\s*(.*)$/);
          if (m) cleanLine = m[1] + m[2];
          let m2 = cleanLine.match(/^(?:-|•)?\s*(\d+(?:[~,\-]\d+)?회차\s*[:\-]\s*)\d{1,2}월\s*\d{1,2}일\s*(.*)$/);
          if (m2) cleanLine = m2[1] + m2[2];
        }

        if (currentSection.items.length === 0) {
          currentSection.items.push({ subCategory: "", content: cleanLine });
        } else {
          const lastItem = currentSection.items[currentSection.items.length - 1];
          
          if (currentSection.category === "회차별 내용") {
            const isNewSession = cleanLine.match(/^(?:-|•)?\s*\d+(?:[~,\-]\d+)?회차\s*[:\-]/);
            if (isNewSession) {
              lastItem.content += "\n" + cleanLine;
            } else {
              lastItem.content += " " + cleanLine;
            }
          } else {
            lastItem.content += "\n" + cleanLine;
          }
        }
      }
    }
    
    return { sections, startDateInfo };
  };

const parsed = parseToTable(content);
console.log(JSON.stringify(parsed.sections, null, 2));
