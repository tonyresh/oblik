const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');

/**
 * Node.js script to generate the official, print-ready, multi-page vector PDF
 * for AIS KPP "412 Nemesis" user manual.
 * 
 * Features:
 * - 100% white background on all pages
 * - Embedded Cyrillic Roboto fonts (Regular & Bold)
 * - Page 1: Official Title Page with system description & military crest
 * - Page 2: Table of Contents (Оглавление / Зміст)
 * - Pages 3-15: All 12 sections duplicating the full web version with text, tables, checklists, mockups & sign-off
 */

function buildPdf() {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const printableWidth = pageWidth - marginX * 2; // 182mm
  const marginTop = 16;
  const marginBottom = 16;

  // 1. Load & Register Cyrillic Fonts
  const regFontBase64 = fs.readFileSync('public/fonts/Roboto-Regular.ttf').toString('base64');
  const boldFontBase64 = fs.readFileSync('public/fonts/Roboto-Bold.ttf').toString('base64');

  doc.addFileToVFS('Roboto-Regular.ttf', regFontBase64);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');

  doc.addFileToVFS('Roboto-Bold.ttf', boldFontBase64);
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');

  doc.setFont('Roboto', 'normal');

  // Helper: Decorate page with running headers & footers
  const totalPages = 15;
  const decoratePage = (p) => {
    // Fill page background white
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Page 1 is the Title Page (no running header)
    if (p > 1) {
      // Header line
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.setLineWidth(0.35);
      doc.line(marginX, 11, marginX + printableWidth, 11);

      doc.setFont('Roboto', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text('АІС КПП «412 NEMESIS» • ІНСТРУКЦІЯ КОРИСТУВАЧА СКУД', marginX, 9);

      doc.setTextColor(220, 38, 38); // red-600
      doc.text('ДСП • ДЛЯ СЛУЖБОВОГО КОРИСТУВАННЯ', marginX + printableWidth, 9, { align: 'right' });

      // Footer line
      doc.line(marginX, pageHeight - 11, marginX + printableWidth, pageHeight - 11);

      doc.setFont('Roboto', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text('СИСТЕМА КОНТРОЛЮ ДОСТУПУ • 100% LOCAL-FIRST • ФОРМА А-412', marginX, pageHeight - 6.5);

      doc.setFont('Roboto', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`Сторінка ${p} з ${totalPages}`, marginX + printableWidth, pageHeight - 6.5, { align: 'right' });
    }
  };

  // Helper: Vector Nemesis Crest
  const drawNemesisCrest = (cx, cy, r) => {
    doc.setFillColor(15, 23, 42);
    doc.setDrawColor(202, 138, 4); // gold-600
    doc.setLineWidth(1.2);

    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    doc.lines(
      pts.slice(1).map((p, idx) => [p[0] - pts[idx][0], p[1] - pts[idx][1]]),
      pts[0][0], pts[0][1], [1, 1], 'FD', true
    );

    // Inner ring & chevron
    doc.setDrawColor(71, 85, 105);
    doc.setLineWidth(0.4);
    doc.circle(cx, cy, r * 0.72, 'S');

    doc.setFillColor(234, 179, 8); // Gold
    doc.rect(cx - 1.5, cy - r * 0.45, 3, r * 0.9, 'F');
    doc.triangle(cx - 1.5, cy, cx - r * 0.4, cy - r * 0.2, cx - 1.5, cy + r * 0.35, 'F');
    doc.triangle(cx + 1.5, cy, cx + r * 0.4, cy - r * 0.2, cx + 1.5, cy + r * 0.35, 'F');
  };

  // Helper: Draw clean card
  const drawCard = (x, y, w, h, bg = [248, 250, 252], border = [203, 213, 225]) => {
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.roundedRect(x, y, w, h, 2, 2, 'F');
    doc.setDrawColor(border[0], border[1], border[2]);
    doc.setLineWidth(0.35);
    doc.roundedRect(x, y, w, h, 2, 2, 'S');
  };

  // Helper: Draw terminal box
  const drawTerminal = (x, y, w, h, title, status) => {
    doc.setFillColor(15, 23, 42); // dark slate
    doc.roundedRect(x, y, w, h, 2, 2, 'F');
    doc.setDrawColor(51, 65, 85);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, y, w, h, 2, 2, 'S');

    // Header bar
    doc.setFillColor(30, 41, 59);
    doc.rect(x, y, w, 5.5, 'F');

    // Dots
    doc.setFillColor(239, 68, 68); doc.circle(x + 3.2, y + 2.8, 0.8, 'F');
    doc.setFillColor(245, 158, 11); doc.circle(x + 6.2, y + 2.8, 0.8, 'F');
    doc.setFillColor(16, 185, 129); doc.circle(x + 9.2, y + 2.8, 0.8, 'F');

    doc.setFont('Roboto', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(241, 245, 249);
    doc.text(title, x + 13, y + 3.9);

    if (status) {
      doc.setTextColor(52, 211, 153);
      doc.text(status, x + w - 4, y + 3.9, { align: 'right' });
    }
  };

  // =========================================================================
  // PAGE 1: OFFICIAL TITLE PAGE (ТИТУЛЬНИЙ АРКУШ)
  // =========================================================================
  decoratePage(1);

  // Top header bar
  doc.setFillColor(15, 23, 42);
  doc.rect(marginX, 14, printableWidth, 10, 'F');
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('МІНІСТЕРСТВО ОБОРОНИ УКРАЇНИ • СЛУЖБА ОХОРОНИ ТА КОНТРОЛЮ ДОСТУПУ', marginX + 4, 20.5);

  doc.setFillColor(220, 38, 38);
  doc.roundedRect(marginX + printableWidth - 56, 15.5, 53, 7, 1, 1, 'F');
  doc.setFontSize(7.5);
  doc.text('ГРИФ: ДСП • ПРИМІРНИК №1', marginX + printableWidth - 29.5, 20.2, { align: 'center' });

  // Central Emblem
  drawNemesisCrest(pageWidth / 2, 48, 16);

  // System Titles
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(37, 99, 235); // primary blue
  doc.text('АВТОМАТИЗОВАНА ІНФОРМАЦІЙНА СИСТЕМА КОНТРОЛЮ ТА УПРАВЛІННЯ ДОСТУПОМ', pageWidth / 2, 72, { align: 'center' });

  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text('АІС КПП «412 NEMESIS»', pageWidth / 2, 82, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(71, 85, 105);
  doc.text('КОМПЛЕКСНА ПРАКТИЧНА ІНСТРУКЦІЯ КОРИСТУВАЧА СКУД', pageWidth / 2, 90, { align: 'center' });

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(8.5);
  doc.text('Повний методичний посібник чергового КПП, начальника варти та адміністратора безпеки', pageWidth / 2, 96, { align: 'center' });

  // Badges
  const badges = [
    { txt: 'Версія: 3.4.2 (2026 р.)', col: [37, 99, 235], bg: [239, 246, 255] },
    { txt: 'Архітектура: 100% Local-First', col: [16, 185, 129], bg: [236, 253, 245] },
    { txt: 'Автономність 24/7 без Інтернету', col: [217, 119, 6], bg: [254, 243, 199] },
    { txt: 'База: IndexedDB Encrypted', col: [71, 85, 105], bg: [241, 245, 249] }
  ];
  const bW = (printableWidth - 6) / 4;
  badges.forEach((b, idx) => {
    const bx = marginX + idx * (bW + 2);
    doc.setFillColor(b.bg[0], b.bg[1], b.bg[2]);
    doc.roundedRect(bx, 103, bW, 6.5, 1.2, 1.2, 'F');
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(b.col[0], b.col[1], b.col[2]);
    doc.text(b.txt, bx + bW / 2, 107.5, { align: 'center' });
  });

  // Brief System Description Box
  drawCard(marginX, 114, printableWidth, 142, [248, 250, 252], [203, 213, 225]);

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('КОРОТКИЙ ОПИС ТА ПРИЗНАЧЕННЯ СИСТЕМИ:', marginX + 6, 122);

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const descP1 = 'АІС КПП «412 NEMESIS» — це спеціалізований програмно-апаратний комплекс оперативного обліку особового складу, службового автотранспорту та відвідувачів на контрольно-пропускних пунктах режимних об\'єктів і військових частин. Система спроектована за архітектурним стандартом Local-First, що забезпечує 100% автономне функціонування 24/7 без підключення до Інтернету та захист від впливу засобів радіоелектронної боротьби (РЕБ).';
  const splitP1 = doc.splitTextToSize(descP1, printableWidth - 12);
  doc.text(splitP1, marginX + 6, 128);

  // 4 Tactical capability cards
  const caps = [
    { title: 'Миттєва фіксація проходу (<0.5 с)', desc: 'Реєстрація бійців в 1 клік, швидким пошуком за прізвищем/позивним або через модуль розпізнавання голосу Hands-Free.', col: [37, 99, 235] },
    { title: 'Спецпротокол «Брудне небо»', desc: 'Автоматичне блокування виходу з частини за сигналом тривоги, негайне спрямування бійців в укриття та захищений журнал евакуації.', col: [220, 38, 38] },
    { title: 'Облік варти та постів КПП', desc: 'Автоматичний контроль чатових на постах (шлагбаум, КПП №1/2), таймер зміни та передача чергування без помилок.', col: [16, 185, 129] },
    { title: 'Повна ізоляція даних (No-Cloud)', desc: 'Усі відомості про особовий склад зберігаються виключно локально у захищеному сховищі IndexedDB без витоку у відкриті мережі.', col: [217, 119, 6] }
  ];

  caps.forEach((c, idx) => {
    const cx = marginX + 6 + (idx % 2) * ((printableWidth - 16) / 2 + 4);
    const cy = 145 + Math.floor(idx / 2) * 36;
    const cw = (printableWidth - 16) / 2;
    drawCard(cx, cy, cw, 32, [255, 255, 255], [226, 232, 240]);

    doc.setFont('Roboto', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(c.col[0], c.col[1], c.col[2]);
    doc.text(c.title, cx + 4, cy + 6.5);

    doc.setFont('Roboto', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const sDesc = doc.splitTextToSize(c.desc, cw - 8);
    doc.text(sDesc, cx + 4, cy + 12.5);
  });

  // Target audience
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(15, 23, 42);
  doc.text('ЦІЛЬОВА АУДИТОРІЯ:', marginX + 6, 224);

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const audText = 'Документ призначений для обов\'язкового вивчення добовим нарядом КПП (черговий КПП, помічник чергового, чатові), начальником варти, черговим військової частини та системними адміністраторами СКУД.';
  const sAud = doc.splitTextToSize(audText, printableWidth - 12);
  doc.text(sAud, marginX + 6, 230);

  // Approval footer note
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('ВВЕДЕНО В ДІЮ НАКАЗОМ ПО ЧАСТИНІ № 412', marginX + 6, 248);
  doc.text('ЗАТВЕРДЖЕНО КОМАНДУВАННЯМ • 2026 РІК', marginX + printableWidth - 6, 248, { align: 'right' });

  // Official Seal
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.6);
  doc.circle(marginX + printableWidth - 45, 270, 9, 'S');
  doc.setFontSize(5.5);
  doc.setTextColor(37, 99, 235);
  doc.text('ВІЙСЬКОВА ЧАСТИНА', marginX + printableWidth - 45, 269, { align: 'center' });
  doc.text('ВАРТА КПП • М.П.', marginX + printableWidth - 45, 272.5, { align: 'center' });

  // =========================================================================
  // PAGE 2: TABLE OF CONTENTS (ОГЛАВЛЕНИЕ / ЗМІСТ ПОСІБНИКА)
  // =========================================================================
  doc.addPage();
  decoratePage(2);

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('ЗМІСТ ПОСІБНИКА КОРИСТУВАЧА (ОГЛАВЛЕНИЕ)', marginX, 22);

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Повний перелік 12 розділів, операційних функцій, практичних сценаріїв та регламентів СКУД', marginX, 27);

  const toc = [
    { num: 1, title: 'Введення та огляд архітектури системи Local-First', sub: 'Призначення продукту, тактичні завдання, надійність 24/7, обмеження', page: 3 },
    { num: 2, title: 'Що знадобиться перед початком роботи (Чекліст)', sub: 'Обладнання КПП, резервне живлення ДБЖ, чекліст прийому добової зміни', page: 4 },
    { num: 3, title: 'Важлива інформація з безпеки та режим «Брудне небо»', sub: 'Застереження, тривожні протоколи при загрозі обстрілу, захист персональних даних', page: 5 },
    { num: 4, title: 'Встановлення та первинне налаштування термінала', sub: 'Покроковий алгоритм розгортання з 5 кроків, імпорт довідників підрозділів', page: 6 },
    { num: 5, title: 'Перший запуск та інтерфейс робочого місця оператора', sub: 'Огляд робочого простору, стартові параметри, рекомендовані налаштування', page: 7 },
    { num: 6, title: 'Основні операційні модулі СКУД (зі скріншотами)', sub: '6.1 Перепустки, 6.2 Швидкий вхід, 6.3 Охорона, 6.4 Голос, 6.5 Брудне небо, 6.6 Звіти', page: 8 },
    { num: 7, title: 'Типові сценарії дій добового наряду КПП', sub: 'Реєстрація входу/виходу, повітряна тривога, перезмінка наряду варти', page: 10 },
    { num: 8, title: 'Розширені можливості та системне архівування', sub: 'Retention Policy, hands-free розпізнавання голосу, резервне копіювання JSON', page: 11 },
    { num: 9, title: 'Зведена таблиця налаштувань та конфігурації', sub: 'Повна матриця системних параметрів, теми, шрифти, категорії, звання', page: 12 },
    { num: 10, title: 'Часті помилки та матриця усунення несправностей', sub: 'Таблиця несправностей, ланцюжки: Симптом → Перевірка → Рішення', page: 13 },
    { num: 11, title: 'Діагностика цілісності та системний монітор КПП', sub: 'Алгоритм покрокової перевірки 4 компонентів, аварійне відновлення бази', page: 14 },
    { num: 12, title: 'Регламент оновлення, бекапи та відмітка затвердження', sub: 'Золоте правило бекапу, дії при збої, офіційна форма затвердження А-412', page: 15 },
  ];

  let tocY = 36;
  toc.forEach(item => {
    drawCard(marginX, tocY, printableWidth, 17, [248, 250, 252], [226, 232, 240]);

    // Number circle
    doc.setFillColor(37, 99, 235);
    doc.roundedRect(marginX + 3, tocY + 3.5, 8, 10, 1.5, 1.5, 'F');
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(String(item.num), marginX + 7, tocY + 9.5, { align: 'center' });

    // Title & sub
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(15, 23, 42);
    doc.text(`РОЗДІЛ ${item.num}. ${item.title}`, marginX + 14, tocY + 7);

    doc.setFont('Roboto', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(item.sub, marginX + 14, tocY + 12.5);

    // Dot leader
    doc.setTextColor(203, 213, 225);
    doc.text('. . . . . . . . . . . . . . . . . . . . . . . .', marginX + printableWidth - 45, tocY + 9.5);

    // Page badge
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(marginX + printableWidth - 22, tocY + 4, 18, 9, 1.2, 1.2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(marginX + printableWidth - 22, tocY + 4, 18, 9, 1.2, 1.2, 'S');

    doc.setFont('Roboto', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(`Стор. ${item.page}`, marginX + printableWidth - 13, tocY + 9.8, { align: 'center' });

    tocY += 19.5;
  });

  // =========================================================================
  // PAGE 3: РОЗДІЛ 1. ВВЕДЕННЯ ТА ОГЛЯД СИСТЕМИ
  // =========================================================================
  doc.addPage();
  decoratePage(3);

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('РОЗДІЛ 1. ВВЕДЕННЯ ТА ОГЛЯД СИСТЕМИ', marginX, 22);

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Призначення продукту, вирішувані тактичні завдання, архітектура Local-First та обмеження', marginX, 27);

  // Terminal Mockup 1
  drawTerminal(marginX, 32, printableWidth, 38, 'Скріншот 1: Архітектура та статус надійності терміналу СКУД «412 Nemesis»', 'Local-First • 100% Автономність');

  const m1Cards = [
    { title: 'Швидкість фіксації', val: '< 0.5 секунди', desc: 'В 1 клік або через мікрофон голосом', col: [52, 211, 153] },
    { title: 'Енергонезалежність', val: 'IndexedDB local', desc: 'Повне збереження при знеструмленні', col: [56, 189, 248] },
    { title: 'Захист «Брудне небо»', val: 'Автоблокування', desc: 'Укриття відкриті, вихід закритий', col: [251, 113, 133] }
  ];
  const m1W = (printableWidth - 16) / 3;
  m1Cards.forEach((c, idx) => {
    const mx = marginX + 4 + idx * (m1W + 4);
    doc.setFillColor(23, 23, 23);
    doc.roundedRect(mx, 40, m1W, 26, 1.2, 1.2, 'F');
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(c.col[0], c.col[1], c.col[2]);
    doc.text(c.title, mx + 3, 46);

    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(c.val, mx + 3, 53);

    doc.setFont('Roboto', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(163, 163, 163);
    doc.text(c.desc, mx + 3, 60);
  });

  // Section 1.1
  let s1Y = 74;
  drawCard(marginX, s1Y, printableWidth, 52, [255, 255, 255], [203, 213, 225]);
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('1.1 Призначення продукту та сфера застосування', marginX + 6, s1Y + 8);

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(51, 65, 85);
  const s1Text = [
    '• АІС КПП «412 NEMESIS» створена як надійний цифровий журнал добового наряду КПП для заміни паперових зошитів.',
    '• Забезпечує миттєву ідентифікацію військовослужбовців частини, облік прибуття та вибуття підрозділів.',
    '• Підтримує поділ на категорії: Постійний склад, Тимчасові відвідувачі, Службовий автотранспорт, Наряд варти.',
    '• Завдяки технології Local-First система зберігає всі записи в локальному захищеному сховищі браузера (IndexedDB). Навіть у разі повного зникнення живлення або раптового перезавантаження ПК жоден запис не втрачається.',
    '• В умовах відсутності дротового та стільникового зв\'язку термінал продовжує виконувати всі функції без затримок.'
  ];
  let pY = s1Y + 15;
  s1Text.forEach(line => {
    const sLine = doc.splitTextToSize(line, printableWidth - 12);
    doc.text(sLine, marginX + 6, pY);
    pY += sLine.length * 4.2 + 2;
  });

  // Section 1.2
  s1Y = 130;
  drawCard(marginX, s1Y, printableWidth, 68, [248, 250, 252], [203, 213, 225]);
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('1.2 Ключові тактичні завдання СКУД на КПП', marginX + 6, s1Y + 8);

  const tasks = [
    { title: 'Безпека периметра:', desc: 'Запобігання несанкціонованому проникненню сторонніх осіб на територію військової частини.' },
    { title: 'Миттєвий пошук бійця:', desc: 'Пошук за 1-2 літерами прізвища, позивним, підрозділом або номером службового посвідчення.' },
    { title: 'Контроль добового наряду:', desc: 'Фіксація виставлення чатових на пости та своєчасне інформування про необхідність зміни варти.' },
    { title: 'Екстрене реагування:', desc: 'Автоматичне блокування кнопки «Вихід» у режимі «Брудне небо» при загрозі дронової чи ракетної атаки.' },
    { title: 'Швидка звітність:', desc: 'Формування добових звітів про кількість людей на території частини для чергового частини та комбата.' }
  ];
  let tY = s1Y + 15;
  tasks.forEach(t => {
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(37, 99, 235);
    doc.text(`• ${t.title}`, marginX + 6, tY);

    doc.setFont('Roboto', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(t.desc, marginX + 46, tY);
    tY += 8;
  });

  // Limitations
  s1Y = 202;
  drawCard(marginX, s1Y, printableWidth, 42, [254, 242, 242], [254, 202, 202]);
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(185, 28, 28); // red-700
  doc.text('1.3 Обмеження системи та правила автономної роботи', marginX + 6, s1Y + 8);

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(85, 26, 26);
  const lims = [
    '• Система призначена для роботи в єдиному довіреному браузері на стаціонарному терміналі КПП.',
    '• Очищення історії та кешу браузера («Очистити дані сайтів») категорично заборонено без попереднього експорту бекапу!',
    '• Робота голосового модуля вимагає надання дозволу на доступ до мікрофона у браузері (одноразово при налаштуванні).',
    '• Для надійного збереження даних наряд КПП зобов\'язаний щодня експортувати резервну копію бази на перевірену USB-флешку.'
  ];
  let lY = s1Y + 15;
  lims.forEach(l => {
    const sL = doc.splitTextToSize(l, printableWidth - 12);
    doc.text(sL, marginX + 6, lY);
    lY += sL.length * 4.2 + 1.5;
  });

  // =========================================================================
  // PAGE 4: РОЗДІЛ 2. ЩО ЗНАДОБИТЬСЯ ПЕРЕД ПОЧАТКОМ РОБОТИ
  // =========================================================================
  doc.addPage();
  decoratePage(4);

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('РОЗДІЛ 2. ЩО ЗНАДОБИТЬСЯ ПЕРЕД ПОЧАТКОМ РОБОТИ', marginX, 22);

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Обладнання, автономне живлення ДБЖ, необхідні доступи та обов\'язковий чекліст прийому зміни', marginX, 27);

  // Terminal Mockup 2: Checklist
  drawTerminal(marginX, 32, printableWidth, 38, 'Скріншот 2: Інтерактивний чекліст готовності термінала КПП до зміни', 'ЧЕКЛІСТ: 6/6 ГОТОВО');

  const checkMock = [
    { title: '[✓] Джерело безперебійного живлення (ДБЖ)', st: 'Батарея 100% / 220V', col: [52, 211, 153] },
    { title: '[✓] Браузер Google Chrome / Chromium', st: 'IndexedDB доступна', col: [52, 211, 153] },
    { title: '[✓] Синхронізація системного часу КПП', st: 'Точний час (Київ)', col: [52, 211, 153] },
    { title: '[✓] Резервна копія бази (USB-Flash)', st: 'Файл JSON перевірено', col: [52, 211, 153] },
    { title: '[✓] Склад добового наряду внесено', st: '3 чатові на постах', col: [52, 211, 153] },
    { title: '[✓] USB-мікрофон голосового вводу', st: 'Hands-Free готовий', col: [52, 211, 153] }
  ];
  checkMock.forEach((cm, idx) => {
    const cx = marginX + 4 + (idx % 2) * ((printableWidth - 12) / 2 + 4);
    const cy = 40 + Math.floor(idx / 2) * 8.5;
    const cw = (printableWidth - 12) / 2;

    doc.setFont('Roboto', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(241, 245, 249);
    doc.text(cm.title, cx + 2, cy + 4);

    doc.setFont('Roboto', 'normal');
    doc.setTextColor(cm.col[0], cm.col[1], cm.col[2]);
    doc.text(cm.st, cx + cw - 2, cy + 4, { align: 'right' });
  });

  // Hardware Table
  let s2Y = 74;
  drawCard(marginX, s2Y, printableWidth, 68, [255, 255, 255], [203, 213, 225]);
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('2.1 Таблиця необхідного обладнання та аксесуарів', marginX + 6, s2Y + 8);

  const hwCols = [
    { title: 'Компонент', w: 42 },
    { title: 'Мінімальні вимоги', w: 68 },
    { title: 'Призначення на КПП', w: 62 }
  ];

  // Table header
  doc.setFillColor(241, 245, 249);
  doc.rect(marginX + 6, s2Y + 12, printableWidth - 12, 6, 'F');
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  let hx = marginX + 8;
  hwCols.forEach(col => {
    doc.text(col.title, hx, s2Y + 16.2);
    hx += col.w;
  });

  const hwRows = [
    ['ПК або Ноутбук чергового', 'CPU 2 ядра, 4 GB RAM, екран 13"+', 'Основне робоче місце чергового КПП'],
    ['ДБЖ (UPS) з акумулятором', 'Потужність від 600 VA (30-60 хв)', 'Захист термінала при відключенні 220V'],
    ['USB-мікрофон або гарнітура', 'Будь-який сумісний мікрофон', 'Голосова фіксація бійців без рук'],
    ['USB-флеш носій (2 шт)', 'Обсяг від 4 GB, FAT32/NTFS', 'Щозмінне зберігання архівних бекапів'],
    ['Браузер Chrome / Firefox', 'Версія 100+ з підтримкою IndexedDB', 'Середовище виконання інтерфейсу СКУД'],
    ['Кабель живлення 220V', 'Мережевий фільтр із заземленням', 'Захист від стрибків напруги на КПП']
  ];

  let rY = s2Y + 22;
  hwRows.forEach((row, rIdx) => {
    if (rIdx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX + 6, rY - 3.8, printableWidth - 12, 6.5, 'F');
    }
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(51, 65, 85);
    let rx = marginX + 8;
    row.forEach((cell, cIdx) => {
      doc.text(cell, rx, rY);
      rx += hwCols[cIdx].w;
    });
    rY += 6.8;
  });

  // Checklist Details
  s2Y = 146;
  drawCard(marginX, s2Y, printableWidth, 98, [248, 250, 252], [203, 213, 225]);
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('2.2 Покроковий чекліст підготовки та прийому чергування', marginX + 6, s2Y + 8);

  const prepSteps = [
    { n: 'Крок 1', title: 'Перевірка електроживлення та ДБЖ:', desc: 'Увімкніть ДБЖ, переконайтеся у відсутності сигналів аварії акумулятора. Індикатор живлення повинен світитися зеленим.' },
    { n: 'Крок 2', title: 'Запуск термінала КПП:', desc: 'Увімкніть комп\'ютер, відкрийте робочу вкладку СКУД «412 Nemesis». Переконайтеся, що статус термінала відображає «Local-First 100%».' },
    { n: 'Крок 3', title: 'Синхронізація часу та дати:', desc: 'Звірте системний час на комп\'ютері з оперативним часом військової частини. Усі записи відвідувачів маркуються системним часом.' },
    { n: 'Крок 4', title: 'Перевірка актуальності бази відвідувачів:', desc: 'Перевірте загальну кількість бійців у довіднику. Якщо за минулу добу надходили накази про переведення — внесіть зміни.' },
    { n: 'Крок 5', title: 'Внесення складу добового наряду:', desc: 'Перейдіть у вкладку «Охорона» та призначте чатових на Пост №1 (Шлагбаум), Пост №2 (Технічний) та вільну зміну.' },
    { n: 'Крок 6', title: 'Тестування кнопки «Брудне небо»:', desc: 'Короткочасно активуйте та вимкніть режим для перевірки миттєвого блокування виходу та появи індикатора тривоги.' }
  ];

  let psY = s2Y + 15;
  prepSteps.forEach(ps => {
    doc.setFillColor(37, 99, 235);
    doc.roundedRect(marginX + 6, psY - 3, 13, 5.5, 1, 1, 'F');
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(255, 255, 255);
    doc.text(ps.n, marginX + 12.5, psY + 0.8, { align: 'center' });

    doc.setFont('Roboto', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(ps.title, marginX + 22, psY + 0.8);

    doc.setFont('Roboto', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const sDesc = doc.splitTextToSize(ps.desc, printableWidth - 28);
    doc.text(sDesc, marginX + 22, psY + 5.5);

    psY += sDesc.length * 3.8 + 6.5;
  });

  // =========================================================================
  // PAGE 5: РОЗДІЛ 3. ВАЖЛИВА ІНФОРМАЦІЯ З БЕЗПЕКИ
  // =========================================================================
  doc.addPage();
  decoratePage(5);

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('РОЗДІЛ 3. ВАЖЛИВА ІНФОРМАЦІЯ З БЕЗПЕКИ ТА «БРУДНЕ НЕБО»', marginX, 22);

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Система попереджень, захист персональних даних та бойовий регламент дій при сигналі тривоги', marginX, 27);

  // Terminal Mockup 3: Dirty Sky
  drawTerminal(marginX, 32, printableWidth, 38, 'Скріншот 3: Бойовий режим «Брудне небо» — блокування виходу КПП', 'ТРИВОГА: ВИХІД ЗАБЛОКОВАНО');

  doc.setFillColor(239, 68, 68);
  doc.roundedRect(marginX + 6, 42, printableWidth - 12, 12, 1.5, 1.5, 'F');
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('УВАГА! РЕЖИМ «БРУДНЕ НЕБО» АКТИВОВАНО! ВИХІД З ЧАСТИНИ ЗАБЛОКОВАНО!', marginX + printableWidth / 2, 49.5, { align: 'center' });

  doc.setFillColor(30, 41, 59);
  doc.roundedRect(marginX + 6, 56, printableWidth - 12, 10, 1.2, 1.2, 'F');
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(203, 213, 225);
  doc.text('Маршрут евакуації: Укриття №1 (Караульне приміщення) • Шлагбаум заблоковано в положенні ЗАКРИТО', marginX + printableWidth / 2, 62.5, { align: 'center' });

  // 3 Warnings
  let s3Y = 74;
  const warnings = [
    {
      type: 'ВАЖЛИВО:',
      col: [37, 99, 235],
      bg: [239, 246, 255],
      border: [191, 219, 254],
      text: 'Всі дії чергового КПП щодо пропуску військовослужбовців та транспорту є юридично значущими. Забороняється передавати керування терміналом стороннім особам або залишати робоче місце без нагляду.'
    },
    {
      type: 'УВАГА (РЕЖИМ БЕЗПЕКИ):',
      col: [217, 119, 6],
      bg: [254, 243, 199],
      border: [253, 230, 138],
      text: 'При раптовому відключенні електромережі 220V термінал миттєво переходить на живлення від ДБЖ. Не вимикайте комп\'ютер! ДБЖ забезпечує від 30 до 60 хвилин роботи для безпечного завершення фіксації та експорту бекапу.'
    },
    {
      type: 'ЗАСТЕРЕЖЕННЯ (ЗАХИСТ ДАНИХ):',
      col: [220, 38, 38],
      bg: [254, 242, 242],
      border: [254, 202, 202],
      text: 'Категорично забороняється підключати термінал КПП до відкритих публічних Wi-Fi мереж або сторонніх модемів. База даних містить прізвища, звання, підрозділи та переміщення бійців (інформація ДСП).'
    }
  ];

  warnings.forEach(w => {
    drawCard(marginX, s3Y, printableWidth, 24, w.bg, w.border);
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(w.col[0], w.col[1], w.col[2]);
    doc.text(w.type, marginX + 6, s3Y + 6.5);

    doc.setFont('Roboto', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(51, 65, 85);
    const sW = doc.splitTextToSize(w.text, printableWidth - 12);
    doc.text(sW, marginX + 6, s3Y + 12);

    s3Y += 27;
  });

  // Action Protocol
  s3Y = 158;
  drawCard(marginX, s3Y, printableWidth, 86, [248, 250, 252], [203, 213, 225]);
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('3.2 Бойовий алгоритм дій наряду КПП у режимі «Брудне небо»', marginX + 6, s3Y + 8);

  const bSteps = [
    { step: '1', title: 'Отримання сигналу тривоги:', desc: 'При отриманні сигналу «Повітряна тривога» або «Ракетна небезпека» черговий КПП негайно натискає велику червону кнопку «Брудне небо» у верхньому правому куті екрана.' },
    { step: '2', title: 'Миттєве блокування шлагбаума та хвіртки:', desc: 'Кнопки «Вихід» для всіх відвідувачів автоматично блокуються. Пропуск будь-яких осіб за межі частини суворо припиняється.' },
    { step: '3', title: 'Оповіщення прибуваючих осіб:', desc: 'Усі військовослужбовці, які перебувають на території КПП, негайно спрямовуються черговим до найближчого укриття (сховище підрозділу варти).' },
    { step: '4', title: 'Фіксація осіб, які увійшли в укриття:', desc: 'Кнопка «Вхід» залишається активною для фіксації бійців, які забігають на територію частини з вулиці під час оголошення тривоги.' },
    { step: '5', title: 'Скасування режиму тривоги:', desc: 'Лише після офіційного сигналу «Відбій тривоги» від чергового частини черговий КПП натискає «Відбій режиму» та повертає систему у штатний режим.' }
  ];

  let bsY = s3Y + 15;
  bSteps.forEach(b => {
    doc.setFillColor(220, 38, 38);
    doc.circle(marginX + 10, bsY + 1, 3.5, 'F');
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(b.step, marginX + 10, bsY + 2.5, { align: 'center' });

    doc.setFont('Roboto', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(b.title, marginX + 17, bsY + 2);

    doc.setFont('Roboto', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const sDesc = doc.splitTextToSize(b.desc, printableWidth - 23);
    doc.text(sDesc, marginX + 17, bsY + 6.8);

    bsY += sDesc.length * 3.8 + 6;
  });

  // Write remaining pages (6 to 15) with rich duplicate web content
  const pagesData = [
    {
      num: 6,
      title: 'РОЗДІЛ 4. ВСТАНОВЛЕННЯ ТА ПЕРВИННЕ НАЛАШТУВАННЯ',
      sub: 'Покроковий алгоритм розгортання робочого місця чергового КПП та конфігурація довідників',
      mTitle: 'Скріншот 4: Майстер первинного налаштування термінала КПП',
      mStatus: 'РОЗГОРТАННЯ: 5 З 5 КРОКІВ',
      cards: [
        { title: 'Шаг 1. Підключення обладнання:', desc: 'Підключіть ПК до ДБЖ. Підключіть USB-мікрофон, перевірте розпізнавання в системі. Запустіть браузер.' },
        { title: 'Шаг 2. Конфігурація довідника військових звань:', desc: 'Перейдіть у «Налаштування» → «Звання». Внесіть армійські звання (від солдата до полковника).' },
        { title: 'Шаг 3. Додавання підрозділів та груп:', desc: 'Створіть категорії: 1-й батальйон, Рота зв\'язку, Медична рота, Автопарк, Командування частини.' },
        { title: 'Шаг 4. Налаштування постів варти:', desc: 'Внесіть перелік постів охорони: Пост №1 (Шлагбаум), Пост №2 (Склад РАО), Пост №3 (Парк).' },
        { title: 'Шаг 5. Первинний імпорт бази бійців:', desc: 'Завантажте список військовослужбовців через JSON-файл або внесіть перших бійців вручну.' }
      ]
    },
    {
      num: 7,
      title: 'РОЗДІЛ 5. ПЕРШИЙ ЗАПУСК ТА ІНТЕРФЕЙС РОБОЧОГО МІСЦЯ',
      sub: 'Головні навігаційні блоки, статусний рядок та рекомендовані системні параметри',
      mTitle: 'Скріншот 5: Головний екран робочого місця оператора КПП',
      mStatus: 'ТЕРМІНАЛ: ОНЛАЙН 24/7',
      cards: [
        { title: '1. Навігаційна панель (Header):', desc: 'Містить логотип «412 Nemesis», годинник реального часу, індикатор надійності бази та червону тривожну кнопку «Брудне небо».' },
        { title: '2. Операційна панель швидкої дії:', desc: 'Поле миттєвого пошуку бійця, кнопки фільтрації «Всі», «На території», «За межами», та кнопка голосового вводу.' },
        { title: '3. Картки військовослужбовців:', desc: 'Показують ПІБ, звання, підрозділ, шеврон, статус перебування («НА ТЕРИТОРІЇ» або «ВИБУВ») та кнопку дії.' },
        { title: '4. Статусна панель варти КПП:', desc: 'Відображає поточну зміну варти, кількість чатових на постах та загальну чисельність особового складу в частині.' }
      ]
    },
    {
      num: 8,
      title: 'РОЗДІЛ 6. ОСНОВНІ ОПЕРАЦІЙНІ ФУНКЦІЇ (ЧАСТИНА 1)',
      sub: 'Журнал перепусток, швидкий вхід та управління зміною варти',
      mTitle: 'Скріншот 6.1: Модуль обліку перепусток та швидкого пропуску',
      mStatus: 'ЖУРНАЛ: 100% АКТИВНИЙ',
      cards: [
        { title: '6.1 Облік перепусток бійців:', desc: 'Фіксація входу/виходу здійснюється натисканням відповідної кнопки на картці військовослужбовця. Час фіксується автоматично.' },
        { title: '6.2 Швидкий вхід (Пошук <0.5 с):', desc: 'Введіть перші 2-3 літери прізвища (напр. «Мель») — система миттєво відфільтрує картку майора Мельника О.В. для фіксації в 1 клік.' },
        { title: '6.3 Модуль «Охорона» та пости:', desc: 'Призначення бійців добового наряду на пости охорони. Таймер рахує час перебування на посту та сигналізує про необхідність зміни.' }
      ]
    },
    {
      num: 9,
      title: 'РОЗДІЛ 6. ОСНОВНІ ОПЕРАЦІЙНІ ФУНКЦІЇ (ЧАСТИНА 2)',
      sub: 'Голосовий ввід Hands-Free, тривога «Брудне небо» та звітність',
      mTitle: 'Скріншот 6.4: Модуль Hands-Free та журнал тривог',
      mStatus: 'ГОЛОС: АКТИВНИЙ (UA)',
      cards: [
        { title: '6.4 Голосове керування Hands-Free:', desc: 'Натисніть кнопку мікрофона. Вимовте чітко: «Вхід Мельник» або «Вихід Коваленко». Система розпізнає команду та здійснить відмітку без дотику до миші.' },
        { title: '6.5 Блокування виходу «Брудне небо»:', desc: 'При тривозі екран переходить у червоний захисний режим. Кнопки виходу деактивуються. Ведеться захищений лог укриття.' },
        { title: '6.6 Звіти та експорт журналу:', desc: 'Формування підсумкового добового зведеного звіту для начальника штабу частини. Експорт у форматі CSV/Excel.' }
      ]
    },
    {
      num: 10,
      title: 'РОЗДІЛ 7. ТИПОВІ СЦЕНАРІЇ ВИКОРИСТАННЯ НА КПП',
      sub: 'Покрокові практичні рішення типових задач добового наряду',
      mTitle: 'Скріншот 7: Екран відпрацювання типових бойових сценаріїв',
      mStatus: 'СЦЕНАРІЇ: ШТАТНО',
      cards: [
        { title: 'Сценарій 1. Пропуск бійця з вантажем (Руки зайняті):', desc: 'Черговий активує мікрофон, боєць називає прізвище. Система розпізнає «Вхід Шевченко», відчиняє турнікет і робить запис.' },
        { title: 'Сценарій 2. Дії при оголошенні повітряної тривоги:', desc: '1. Натиснути «Брудне небо» → 2. Переконатися у блокуванні виходу → 3. Спрямувати прибуваючих в укриття → 4. Доповісти черговому частини.' },
        { title: 'Сценарій 3. Перезмінка наряду КПП (08:00):', desc: '1. Створити експорт бекапу бази → 2. Звірити кількість бійців на території → 3. Здати USB-носій новій зміні під підпис у книзі.' },
        { title: 'Сценарій 4. Помилкове натискання кнопки:', desc: 'Якщо оператор випадково натиснув «Вихід» замість «Вхід», повторне натискання протягом 30 секунд повертає статус з поміткою в журналі.' }
      ]
    },
    {
      num: 11,
      title: 'РОЗДІЛ 8. РОЗШИРЕНІ МОЖЛИВОСТІ ТА АВТОМАТИЗАЦІЯ',
      sub: 'Retention Policy, кастомізація сіток та системне архівування',
      mTitle: 'Скріншот 8: Налаштування політики збереження журналів',
      mStatus: 'RETENTION: 30 ДНІВ',
      cards: [
        { title: '8.1 Політика зберігання логів (Retention Policy):', desc: 'Налаштування терміну зберігання історії перепусток: 7 днів, 30 днів, 90 днів або безстроково для оптимізації швидкодії.' },
        { title: '8.2 Адаптивні сітки карток (1–4 колонки):', desc: 'Перемикання вигляду списку залежно від діагоналі монітора чергового КПП (компактний список або великі плитки).' },
        { title: '8.3 Аудіо-сигнали сповіщень:', desc: 'Звукове підтвердження успішної реєстрації (короткий біп) та тривожний сигнал при спробі виходу під час тривоги.' },
        { title: '8.4 Автоматизований знімок бази:', desc: 'Система нагадує про необхідність створення архівного знімка бази кожні 12 годин чергування.' }
      ]
    },
    {
      num: 12,
      title: 'РОЗДІЛ 9. ЗВЕДЕНА ТАБЛИЦЯ НАЛАШТУВАНЬ СИСТЕМИ',
      sub: 'Повна матриця системних параметрів, рекомендовані значення та наслідки змін',
      mTitle: 'Скріншот 9: Меню конфігурації параметрів термінала СКУД',
      mStatus: 'ПАРАМЕТРИ: ВЕРИФІКОВАНО',
      cards: [
        { title: 'Тема оформлення (Theme):', desc: 'Значення: Світла, Темна, Тактична (Олива). За замовчуванням: Темна тактична. Рекомендовано для КПП: Світла для друку або Олива.' },
        { title: 'Розмір шрифту (Font Size):', desc: 'Значення: Звичайний (14px), Збільшений (16px), Великий (18px). Рекомендовано: Збільшений для легкого читання з відстані 1 метра.' },
        { title: 'Звукові сповіщення (Audio Alerts):', desc: 'Значення: Увімкнено / Вимкнено. Рекомендовано: Увімкнено (гучність 70%) для звукового контролю кожної перепустки.' },
        { title: 'Колонки сітки (Grid Columns):', desc: 'Значення: 1, 2, 3, 4. За замовчуванням: 2 колонки для стандартних екранів 15.6" ноутбука чергового.' },
        { title: 'Тривалість тостів (Toast Duration):', desc: 'Значення: 2-8 секунд. За замовчуванням: 4 секунди для підтвердження успішної дії оператора.' }
      ]
    },
    {
      num: 13,
      title: 'РОЗДІЛ 10. ЧАСТІ ПОМИЛКИ ТА СПОСОБИ ЇХ УСУНЕННЯ',
      sub: 'Матриця діагностики: Симптом → Можлива причина → Покрокове рішення',
      mTitle: 'Скріншот 10: Індикатори системних помилок та станів',
      mStatus: 'ДІАГНОСТИКА: ГОТОВО',
      cards: [
        { title: 'Проблема: «Не працює розпізнавання голосу»:', desc: 'Причина: Заблоковано мікрофон у браузері. Рішення: Натиснути іконку замка в адресному рядку браузера → Дозволити мікрофон → Перезавантажити вкладку.' },
        { title: 'Проблема: «Кнопка виходу не натискається»:', desc: 'Причина: Увімкнено режим «Брудне небо». Рішення: Вимкнути бойову тривогу після сигналу відбою від чергового частини.' },
        { title: 'Проблема: «Порожній список після очищення кешу»:', desc: 'Причина: Очищено дані IndexedDB. Рішення: Відкрити «Налаштування» → «Резервна копія» → «Імпорт бази» → обрати вчорашній файл JSON з флешки.' },
        { title: 'Проблема: «Годинник термінала поспішає/відстає»:', desc: 'Причина: Збився час ОС Windows/Linux. Рішення: Налаштувати системний час комп\'ютера в панелі керування ОС.' }
      ]
    },
    {
      num: 14,
      title: 'РОЗДІЛ 11. ДІАГНОСТИКА ТА СИСТЕМНИЙ МОНІТОР КПП',
      sub: 'Покроковий алгоритм тестування 4 ключових компонентів термінала',
      mTitle: 'Скріншот 11: Системний монітор самодіагностики терміналу КПП',
      mStatus: 'СТАТУС: ШТАТНО 24/7',
      cards: [
        { title: 'Компонент 1: IndexedDB Local Storage:', desc: 'Перевірка: Тестовий запис і зчитування ключа. Статус: 100% цілісність, сектори бази без пошкоджень.' },
        { title: 'Компонент 2: Web Speech API Audio:', desc: 'Перевірка: Захоплення аудіопотоку з мікрофона. Статус: Дозволено, рівень сигналу оптимальний.' },
        { title: 'Компонент 3: Електроживлення та ДБЖ:', desc: 'Перевірка: Наявність напруги мережі 220V та готовність батареї безперебійника.' },
        { title: 'Компонент 4: Ізоляція контуру (No-Cloud):', desc: 'Перевірка: Відсутність несанкціонованих зовнішніх запитів. Статус: 100% захищено та автономно.' }
      ]
    },
    {
      num: 15,
      title: 'РОЗДІЛ 12. ОНОВЛЕННЯ ТА ВІДМІТКА ЗАТВЕРДЖЕННЯ',
      sub: 'Регламент оновлення ПЗ, створення бекапів та офіційна форма затвердження А-412',
      mTitle: 'Скріншот 12: Панель резервного копіювання та штамп діловодства',
      mStatus: 'ЗАТВЕРДЖЕНО: А-412',
      cards: [
        { title: 'Золоте правило оновлення СКУД:', desc: 'Перед будь-яким оновленням версії ПЗ обов\'язково експортуйте резервну копію бази на дві незалежні USB-флешки!' },
        { title: 'Щотижневий регламент обслуговування:', desc: '1. Створення повного архівного дампу бази. 2. Очищення корпусу термінала від пилу. 3. Перевірка кабелів підключення шлагбаума.' },
        { title: 'Дії при аварійному збої оновлення:', desc: '1. Очистіть кеш браузера. 2. Відкрийте стабільну версію системи. 3. Натисніть «Імпорт бази» та відновіть дані з файлу бекапу.' }
      ]
    }
  ];

  pagesData.forEach(pd => {
    doc.addPage();
    decoratePage(pd.num);

    doc.setFont('Roboto', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(pd.title, marginX, 22);

    doc.setFont('Roboto', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(pd.sub, marginX, 27);

    // Terminal
    drawTerminal(marginX, 32, printableWidth, 36, pd.mTitle, pd.mStatus);

    doc.setFont('Roboto', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(203, 213, 225);
    doc.text(`[ІНТЕРФЕЙС ТЕРМІНАЛА КПП • МОДУЛЬ: ${pd.title.split('.')[1]?.trim() || 'СКУД'}]`, marginX + printableWidth / 2, 52, { align: 'center' });

    // Cards
    let cY = 74;
    pd.cards.forEach(c => {
      const sDesc = doc.splitTextToSize(c.desc, printableWidth - 14);
      const cH = 12 + sDesc.length * 4.2;

      drawCard(marginX, cY, printableWidth, cH, [248, 250, 252], [226, 232, 240]);

      doc.setFont('Roboto', 'bold');
      doc.setFontSize(8.8);
      doc.setTextColor(37, 99, 235);
      doc.text(c.title, marginX + 6, cY + 6.5);

      doc.setFont('Roboto', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(sDesc, marginX + 6, cY + 12);

      cY += cH + 4;
    });

    // On Page 15, add the official military sign-off stamp box
    if (pd.num === 15) {
      const sigY = 196;
      drawCard(marginX, sigY, printableWidth, 54, [255, 255, 255], [148, 163, 184]);

      doc.setFont('Roboto', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text('ВІДМІТКА ПРО ЗАТВЕРДЖЕННЯ ТА ПРОВЕДЕННЯ ІНСТРУКТАЖУ НА ПОСТУ (ФОРМА А-412):', marginX + 6, sigY + 8);

      doc.setFont('Roboto', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      const stampText = [
        'Даний посібник затверджений командуванням військової частини як обов\'язковий стандарт несення служби на контрольно-пропускних пунктах.',
        'Особовий склад добового наряду ознайомлений під підпис з безпековими протоколами, порядком дій у режимі «Брудне небо» та веденням журналів СКУД.'
      ];
      doc.text(stampText[0], marginX + 6, sigY + 16);
      doc.text(stampText[1], marginX + 6, sigY + 22);

      doc.setFont('Roboto', 'bold');
      doc.setFontSize(8.5);
      doc.text('Командир підрозділу охорони / Начальник варти: ____________________ / ____________________', marginX + 6, sigY + 33);
      doc.text('М.П.                                                                                  Дата: «___» ____________ 2026 року', marginX + 6, sigY + 44);
    }
  });

  // Save the complete ready-for-download PDF directly to public/
  const outPath = path.join('public', 'Posibnyk_Korystuvacha_SKUD_412_Nemesis.pdf');
  const buffer = Buffer.from(doc.output('arraybuffer'));
  fs.writeFileSync(outPath, buffer);
  console.log(`Successfully built ${outPath}, size: ${buffer.length} bytes, total pages: ${totalPages}`);
}

buildPdf();
