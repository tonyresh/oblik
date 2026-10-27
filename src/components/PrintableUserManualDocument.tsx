import React from 'react';
import { 
  Shield, ShieldCheck, ShieldAlert, BookOpen, AlertTriangle, 
  Terminal, CheckSquare, Layers, Lock, Cpu, Settings, 
  Users, UserRound, MapPin, Clock, Search, LogIn, LogOut, 
  Radio, Volume2, HardDrive, Monitor, CheckCircle2, FileText, Check
} from 'lucide-react';
import { Logo } from './Logo';
import { SECTIONS_LIST, MANUAL_METADATA } from '../data/userManualData';

export default function PrintableUserManualDocument() {
  const generatedAt = new Date();

  return (
    <div className="printable-user-manual bg-white text-neutral-900 font-sans p-6 sm:p-8 md:p-10 w-full max-w-[210mm] mx-auto select-text leading-normal">
      
      {/* ========================================================================= */}
      {/* PAGE 1: OFFICIAL TITLE PAGE (ТИТУЛЬНИЙ АРКУШ) */}
      {/* ========================================================================= */}
      <div className="min-h-[265mm] flex flex-col justify-between border-2 border-neutral-900 rounded-2xl p-6 sm:p-8 relative bg-white page-break-after print:border-black">
        {/* Top Header Bar */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b-2 border-neutral-900 text-[10px] font-mono uppercase tracking-wider text-neutral-600 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-neutral-900" />
              <span className="font-bold text-neutral-900">МІНІСТЕРСТВО ОБОРОНИ УКРАЇНИ • СЛУЖБА ОХОРОНИ ТА КПП</span>
            </div>
            <span className="px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-red-100 text-red-700 border border-red-300">
              ГРИФ: ДСП • ПРИМІРНИК №1
            </span>
          </div>

          {/* Central Emblem & Title */}
          <div className="text-center py-6 space-y-3">
            <div className="inline-flex p-3 rounded-2xl bg-neutral-900 text-white shadow-md">
              <Logo className="w-auto h-12 text-white" />
            </div>

            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">
                Автоматизована інформаційна система контролю та управління доступом
              </div>
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-neutral-950 font-serif">
                АІС КПП «412 NEMESIS»
              </h1>
              <h2 className="text-sm sm:text-base font-bold text-neutral-700">
                КОМПЛЕКСНА ПРАКТИЧНА ІНСТРУКЦІЯ КОРИСТУВАЧА СКУД
              </h2>
              <p className="text-xs text-neutral-500 max-w-lg mx-auto">
                Повний методичний посібник та довідник чергового КПП, начальника варти та адміністратора безпеки
              </p>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 text-[10px] font-mono">
              <span className="px-2.5 py-0.5 rounded-full font-bold bg-blue-50 text-blue-800 border border-blue-200">
                Версія: 3.4.2 (2026 р.)
              </span>
              <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                100% Local-First
              </span>
              <span className="px-2.5 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-200">
                Автономність 24/7 без Інтернету
              </span>
              <span className="px-2.5 py-0.5 rounded-full font-bold bg-neutral-100 text-neutral-800 border border-neutral-300">
                IndexedDB Encrypted
              </span>
            </div>
          </div>

          {/* System Description Card */}
          <div className="p-4 sm:p-5 rounded-xl bg-neutral-50 border border-neutral-300 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Короткий опис та призначення системи
            </h3>
            <p className="text-xs text-neutral-700 leading-relaxed text-justify">
              <strong>АІС КПП «412 NEMESIS»</strong> — це спеціалізований програмно-апаратний комплекс оперативного обліку особового складу, службового автотранспорту та відвідувачів на контрольно-пропускних пунктах режимних об'єктів і військових частин. Система спроектована за архітектурним стандартом <strong>Local-First</strong>, що забезпечує 100% автономне функціонування 24/7 без підключення до мережі Інтернет та захист від впливу засобів радіоелектронної боротьби (РЕБ).
            </p>

            {/* 4 Tactical capabilities */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
              <div className="p-2.5 rounded-lg bg-white border border-neutral-200">
                <span className="font-bold text-blue-700 block text-[11px]">Миттєва фіксація проходу (&lt;0.5 с):</span>
                <span className="text-[10px] text-neutral-600">Реєстрація бійців в 1 клік, швидким пошуком за прізвищем/позивним або через голосове розпізнавання Hands-Free.</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-neutral-200">
                <span className="font-bold text-red-700 block text-[11px]">Спецпротокол «Брудне небо»:</span>
                <span className="text-[10px] text-neutral-600">Автоматичне блокування виходу з частини за сигналом тривоги, негайне спрямування в укриття та захищений журнал.</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-neutral-200">
                <span className="font-bold text-emerald-700 block text-[11px]">Облік варти та постів КПП:</span>
                <span className="text-[10px] text-neutral-600">Автоматичний контроль чатових на постах (шлагбаум, технічний КПП), таймер зміни та передача чергування без помилок.</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-neutral-200">
                <span className="font-bold text-amber-700 block text-[11px]">Повна ізоляція даних (No-Cloud):</span>
                <span className="text-[10px] text-neutral-600">Усі відомості про особовий склад зберігаються виключно локально у захищеному сховищі IndexedDB без витоку в хмару.</span>
              </div>
            </div>

            {/* Audience */}
            <div className="pt-2 border-t border-neutral-200 text-[11px] text-neutral-600">
              <strong>Цільова аудиторія:</strong> Документ є обов'язковим для вивчення добовим нарядом КПП (черговий КПП, помічник чергового, чатові), начальником варти, черговим військової частини та адміністраторами СКУД.
            </div>
          </div>
        </div>

        {/* Bottom Approval Footer */}
        <div className="pt-4 border-t-2 border-neutral-900 flex items-center justify-between text-xs text-neutral-800">
          <div className="space-y-1">
            <div className="font-bold uppercase tracking-wider text-[10px] text-neutral-600">Введено в дію наказом по частині № 412</div>
            <div className="font-bold text-neutral-900">Затверджено командуванням • 2026 рік</div>
          </div>
          <div className="text-right">
            <div className="w-16 h-16 rounded-full border-2 border-blue-600 text-blue-700 flex flex-col items-center justify-center font-bold text-[8px] leading-tight select-none">
              <span>ВАРТА КПП</span>
              <span>№ 412</span>
              <span>М. П.</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 2: TABLE OF CONTENTS (ОГЛАВЛЕНИЕ / ЗМІСТ ПОСІБНИКА) */}
      {/* ========================================================================= */}
      <div className="min-h-[265mm] pt-8 page-break-after">
        <div className="border-b-2 border-neutral-900 pb-3 mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-neutral-900 font-serif">
              Зміст посібника користувача (Оглавление)
            </h2>
            <p className="text-xs text-neutral-500">
              Повний перелік 12 розділів, операційних функцій, практичних сценаріїв та регламентів СКУД
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-neutral-400">Стор. 2</span>
        </div>

        <div className="space-y-2.5">
          {SECTIONS_LIST.map((sec, idx) => {
            const pageNum = idx + 3;
            return (
              <div 
                key={sec.id}
                className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs gap-3 hover:bg-neutral-100 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white font-bold flex items-center justify-center text-xs shrink-0 font-mono">
                    {sec.number}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-neutral-900 text-xs truncate">
                      {sec.title}
                    </div>
                    <div className="text-[10px] text-neutral-500 truncate">
                      {sec.summary}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden sm:block text-neutral-300 font-mono text-[10px] select-none">
                    . . . . . . . . . . . . . . . . . . . .
                  </div>
                  <span className="px-2.5 py-1 rounded bg-white border border-neutral-300 font-mono font-bold text-neutral-800 text-[11px]">
                    Стор. {pageNum}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 rounded-xl bg-neutral-100 border border-neutral-200 text-xs text-neutral-600 flex items-center justify-between">
          <span>Формат документа: A4 Portrait • 100% друк на білому фоні</span>
          <span className="font-mono font-bold text-neutral-900">Всього сторінок: 15</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGES 3-15: ALL 12 SECTIONS */}
      {/* ========================================================================= */}

      {/* РОЗДІЛ 1 */}
      <div className="min-h-[265mm] pt-8 page-break-after">
        <div className="border-b-2 border-neutral-900 pb-3 mb-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 block">Розділ 1</span>
            <h2 className="text-lg sm:text-xl font-black uppercase text-neutral-900">
              Введення та огляд архітектури системи Local-First
            </h2>
          </div>
          <span className="text-xs font-mono font-bold text-neutral-400">Стор. 3</span>
        </div>

        <div className="space-y-4 text-xs text-neutral-800">
          <div className="p-4 rounded-xl bg-neutral-900 text-white font-mono space-y-2">
            <div className="flex items-center justify-between text-[11px] pb-2 border-b border-neutral-800">
              <span className="font-bold text-amber-400">Скріншот 1: Термінал КПП «412 Nemesis»</span>
              <span className="text-emerald-400">СТАТУС: LOCAL-FIRST 100%</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px] pt-1">
              <div className="bg-neutral-800 p-2 rounded">
                <span className="text-neutral-400 block">Фіксація проходу:</span>
                <span className="text-emerald-400 font-bold">&lt; 0.5 секунди</span>
              </div>
              <div className="bg-neutral-800 p-2 rounded">
                <span className="text-neutral-400 block">Енергонезалежність:</span>
                <span className="text-sky-400 font-bold">IndexedDB локально</span>
              </div>
              <div className="bg-neutral-800 p-2 rounded">
                <span className="text-neutral-400 block">Захист «Брудне небо»:</span>
                <span className="text-rose-400 font-bold">Автоблокування виходу</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
            <h3 className="font-bold text-neutral-900 text-sm">1.1 Призначення продукту та сфера застосування</h3>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-700">
              <li>АІС КПП «412 NEMESIS» створена як надійний цифровий журнал добового наряду КПП для повної заміни паперових зошитів обліку.</li>
              <li>Забезпечує миттєву ідентифікацію військовослужбовців частини, облік прибуття та вибуття підрозділів і службового транспорту.</li>
              <li>Підтримує поділ на категорії: Постійний склад, Тимчасові відвідувачі, Службовий автотранспорт, Наряд варти.</li>
              <li>Завдяки технології Local-First система зберігає всі записи в локальному захищеному сховищі браузера (IndexedDB). Навіть у разі повного знеструмлення або раптового перезавантаження ПК жоден запис не втрачається.</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
            <h3 className="font-bold text-neutral-900 text-sm">1.2 Ключові тактичні завдання на КПП</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-neutral-700">
              <div><strong>• Безпека периметра:</strong> Запобігання несанкціонованому проникненню сторонніх осіб.</div>
              <div><strong>• Миттєвий пошук бійця:</strong> Пошук за 1-2 літерами прізвища або позивним.</div>
              <div><strong>• Контроль варти:</strong> Фіксація чатових на постах та інформування про час зміни.</div>
              <div><strong>• Екстрене реагування:</strong> Автоматичне блокування кнопки «Вихід» у режимі тривоги.</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 space-y-1">
            <h4 className="font-bold text-xs">1.3 Обмеження системи та правила автономної роботи:</h4>
            <p className="text-[11px] leading-relaxed">
              Очищення історії та кешу браузера («Очистити дані сайтів») категорично заборонено без попереднього експорту бекапу! Добовий наряд КПП зобов'язаний щодоби експортувати резервну копію бази на перевірену USB-флешку.
            </p>
          </div>
        </div>
      </div>

      {/* РОЗДІЛ 2 */}
      <div className="min-h-[265mm] pt-8 page-break-after">
        <div className="border-b-2 border-neutral-900 pb-3 mb-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 block">Розділ 2</span>
            <h2 className="text-lg sm:text-xl font-black uppercase text-neutral-900">
              Що знадобиться перед початком роботи (Чекліст зміни)
            </h2>
          </div>
          <span className="text-xs font-mono font-bold text-neutral-400">Стор. 4</span>
        </div>

        <div className="space-y-4 text-xs text-neutral-800">
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
            <h3 className="font-bold text-neutral-900 text-sm">2.1 Таблиця необхідного обладнання та периферії на КПП</h3>
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-neutral-300 bg-neutral-200 text-neutral-900 font-bold">
                  <th className="p-2">Компонент</th>
                  <th className="p-2">Мінімальні вимоги</th>
                  <th className="p-2">Призначення</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                <tr>
                  <td className="p-2 font-bold">ПК або Ноутбук чергового</td>
                  <td className="p-2">CPU 2 ядра, 4 GB RAM, екран 13"+</td>
                  <td className="p-2">Робоче місце оператора КПП</td>
                </tr>
                <tr className="bg-neutral-50">
                  <td className="p-2 font-bold">ДБЖ (UPS) з акумулятором</td>
                  <td className="p-2">Потужність від 600 VA (30-60 хв)</td>
                  <td className="p-2">Захист при відключенні 220V</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold">USB-мікрофон / гарнітура</td>
                  <td className="p-2">Будь-який сумісний мікрофон</td>
                  <td className="p-2">Голосова фіксація Hands-Free</td>
                </tr>
                <tr className="bg-neutral-50">
                  <td className="p-2 font-bold">USB-флеш носій (2 шт)</td>
                  <td className="p-2">Обсяг від 4 GB, FAT32/NTFS</td>
                  <td className="p-2">Щозмінні архівні бекапи бази</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold">Браузер Chrome / Firefox</td>
                  <td className="p-2">Версія 100+ з IndexedDB</td>
                  <td className="p-2">Середовище виконання СКУД</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
            <h3 className="font-bold text-neutral-900 text-sm">2.2 Покроковий чекліст підготовки та прийому чергування</h3>
            <div className="space-y-2 text-neutral-700">
              <div className="p-2 rounded bg-white border border-neutral-200 flex items-start gap-2">
                <span className="font-mono font-bold text-blue-600 shrink-0">[1]</span>
                <div><strong>Перевірка електроживлення та ДБЖ:</strong> Увімкніть ДБЖ, переконайтеся у відсутності аварійного сигналу батареї.</div>
              </div>
              <div className="p-2 rounded bg-white border border-neutral-200 flex items-start gap-2">
                <span className="font-mono font-bold text-blue-600 shrink-0">[2]</span>
                <div><strong>Запуск термінала КПП:</strong> Відкрийте вкладку СКУД «412 Nemesis», перевірте статус «Local-First 100%».</div>
              </div>
              <div className="p-2 rounded bg-white border border-neutral-200 flex items-start gap-2">
                <span className="font-mono font-bold text-blue-600 shrink-0">[3]</span>
                <div><strong>Синхронізація часу та дати:</strong> Звірте системний час комп'ютера з оперативним часом військової частини.</div>
              </div>
              <div className="p-2 rounded bg-white border border-neutral-200 flex items-start gap-2">
                <span className="font-mono font-bold text-blue-600 shrink-0">[4]</span>
                <div><strong>Перевірка актуальності бази:</strong> Звірте кількість бійців у довіднику та внесіть нові накази.</div>
              </div>
              <div className="p-2 rounded bg-white border border-neutral-200 flex items-start gap-2">
                <span className="font-mono font-bold text-blue-600 shrink-0">[5]</span>
                <div><strong>Призначення наряду варти:</strong> Перейдіть у вкладку «Охорона» та виставте чатових на Пост №1 та Пост №2.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* РОЗДІЛ 3 */}
      <div className="min-h-[265mm] pt-8 page-break-after">
        <div className="border-b-2 border-neutral-900 pb-3 mb-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 block">Розділ 3</span>
            <h2 className="text-lg sm:text-xl font-black uppercase text-neutral-900">
              Важлива інформація з безпеки та режим «Брудне небо»
            </h2>
          </div>
          <span className="text-xs font-mono font-bold text-neutral-400">Стор. 5</span>
        </div>

        <div className="space-y-4 text-xs text-neutral-800">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900">
              <strong className="block text-xs uppercase mb-1">ВАЖЛИВО:</strong>
              <p className="text-[11px]">Усі дії чергового КПП щодо пропуску є юридично значущими. Забороняється залишати термінал стороннім особам.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
              <strong className="block text-xs uppercase mb-1">УВАГА (ЖИВЛЕННЯ):</strong>
              <p className="text-[11px]">При знеструмленні термінал живиться від ДБЖ (до 60 хв). Не вимикайте ПК до безпечного збереження даних.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900">
              <strong className="block text-xs uppercase mb-1">ЗАСТЕРЕЖЕННЯ (ДСП):</strong>
              <p className="text-[11px]">Суворо заборонено підключати термінал КПП до відкритих публічних Wi-Fi мереж. Дані бійців захищені.</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-red-50 border-2 border-red-300 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-red-700 text-sm flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                БОЙОВИЙ АЛГОРИТМ ДІЙ У РЕЖИМІ «БРУДНЕ НЕБО» (ТРИВОГА)
              </h3>
              <span className="px-2 py-0.5 rounded bg-red-600 text-white font-mono font-bold text-[10px]">
                ПРОТОКОЛ БЕЗПЕКИ
              </span>
            </div>

            <div className="space-y-2 text-neutral-800">
              <div className="p-2.5 rounded bg-white border border-red-200">
                <strong>1. Отримання сигналу тривоги:</strong> Черговий КПП негайно натискає велику червону кнопку «Брудне небо» у правому верхньому куті екрана.
              </div>
              <div className="p-2.5 rounded bg-white border border-red-200">
                <strong>2. Миттєве блокування шлагбаума:</strong> Кнопки «Вихід» для всіх осіб автоматично блокуються. Вихід за межі території суворо заборонено.
              </div>
              <div className="p-2.5 rounded bg-white border border-red-200">
                <strong>3. Евакуація в укриття:</strong> Усі військовослужбовці на КПП негайно спрямовуються черговим до захисної споруди варти.
              </div>
              <div className="p-2.5 rounded bg-white border border-red-200">
                <strong>4. Фіксація бійців з вулиці:</strong> Кнопка «Вхід» залишається активною для реєстрації військових, які забігають в укриття з вулиці.
              </div>
              <div className="p-2.5 rounded bg-white border border-red-200">
                <strong>5. Скасування тривоги:</strong> Лише після сигналу «Відбій» від чергового частини черговий КПП натискає «Відбій режиму».
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* РОЗДІЛИ 4 ТА 5 */}
      <div className="min-h-[265mm] pt-8 page-break-after">
        <div className="border-b-2 border-neutral-900 pb-3 mb-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 block">Розділи 4 та 5</span>
            <h2 className="text-lg sm:text-xl font-black uppercase text-neutral-900">
              Встановлення, налаштування та інтерфейс оператора
            </h2>
          </div>
          <span className="text-xs font-mono font-bold text-neutral-400">Стор. 6</span>
        </div>

        <div className="space-y-4 text-xs text-neutral-800">
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
            <h3 className="font-bold text-neutral-900 text-sm">Розділ 4: Алгоритм первинного розгортання термінала (5 кроків)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-[11px]">
              <div className="p-2.5 rounded bg-white border border-neutral-200">
                <span className="font-bold text-blue-600 block">Крок 1</span>
                <span>Підключення ПК до ДБЖ та мікрофона.</span>
              </div>
              <div className="p-2.5 rounded bg-white border border-neutral-200">
                <span className="font-bold text-blue-600 block">Крок 2</span>
                <span>Внесення довідника військових звань.</span>
              </div>
              <div className="p-2.5 rounded bg-white border border-neutral-200">
                <span className="font-bold text-blue-600 block">Крок 3</span>
                <span>Додавання підрозділів (батальйони, роти).</span>
              </div>
              <div className="p-2.5 rounded bg-white border border-neutral-200">
                <span className="font-bold text-blue-600 block">Крок 4</span>
                <span>Створення постів охорони (Пост 1, 2).</span>
              </div>
              <div className="p-2.5 rounded bg-white border border-neutral-200">
                <span className="font-bold text-blue-600 block">Крок 5</span>
                <span>Імпорт списку особового складу з JSON.</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
            <h3 className="font-bold text-neutral-900 text-sm">Розділ 5: Робочий простір чергового КПП</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
              <div className="p-3 rounded bg-white border border-neutral-200">
                <strong className="text-neutral-900 block mb-1">1. Навігаційний заголовок (Header):</strong>
                <p className="text-neutral-600">Годинник точного часу, індикатор цілісності Local-First, червона кнопка тривоги «Брудне небо».</p>
              </div>
              <div className="p-3 rounded bg-white border border-neutral-200">
                <strong className="text-neutral-900 block mb-1">2. Панель швидких дій:</strong>
                <p className="text-neutral-600">Рядок швидкого пошуку бійця (&lt;0.5 с), фільтри «Всі / На території / Вибули», кнопка голосового вводу.</p>
              </div>
              <div className="p-3 rounded bg-white border border-neutral-200">
                <strong className="text-neutral-900 block mb-1">3. Картки військовослужбовців:</strong>
                <p className="text-neutral-600">ПІБ, звання, підрозділ, статус перебування та кнопка відмітки в 1 клік («Вхід» / «Вихід»).</p>
              </div>
              <div className="p-3 rounded bg-white border border-neutral-200">
                <strong className="text-neutral-900 block mb-1">4. Панель добового наряду:</strong>
                <p className="text-neutral-600">Поточна зміна варти, таймер несення служби на посту, загальна кількість людей у частині.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* РОЗДІЛИ 6 ТА 7 */}
      <div className="min-h-[265mm] pt-8 page-break-after">
        <div className="border-b-2 border-neutral-900 pb-3 mb-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 block">Розділи 6 та 7</span>
            <h2 className="text-lg sm:text-xl font-black uppercase text-neutral-900">
              Операційні модулі СКУД та бойові сценарії КПП
            </h2>
          </div>
          <span className="text-xs font-mono font-bold text-neutral-400">Стор. 7</span>
        </div>

        <div className="space-y-4 text-xs text-neutral-800">
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
            <h3 className="font-bold text-neutral-900 text-sm">Розділ 6: Основні модулі системи</h3>
            <div className="space-y-2 text-[11px]">
              <div className="p-2.5 rounded bg-white border border-neutral-200">
                <strong>6.1 Журнал перепусток та швидкий вхід:</strong> Введіть 2 літери прізвища (напр. «Мель») — картка миттєво підтягується для фіксації входу або виходу одним дотиком.
              </div>
              <div className="p-2.5 rounded bg-white border border-neutral-200">
                <strong>6.2 Модуль «Охорона» та пости:</strong> Розподіл бійців наряду за постами. Таймер веде зворотний відлік до перезмінки та подає сигнал.
              </div>
              <div className="p-2.5 rounded bg-white border border-neutral-200">
                <strong>6.3 Голосовий модуль Hands-Free:</strong> Натисніть кнопку мікрофона та вимовте «Вхід Коваленко» — відмітка ставиться автоматично без клавіатури.
              </div>
              <div className="p-2.5 rounded bg-white border border-neutral-200">
                <strong>6.4 Звіти та аналітика:</strong> Формування добових відомостей, статистика перебування особового складу, експорт у PDF та CSV.
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
            <h3 className="font-bold text-neutral-900 text-sm">Розділ 7: Типові сценарії дій добового наряду</h3>
            <div className="space-y-2 text-[11px]">
              <div className="p-2.5 rounded bg-white border border-neutral-200">
                <strong>Сценарій 1 (Вантаж / Зайняті руки):</strong> Черговий активує Hands-Free, боєць називає прізвище, система відкриває доступ.
              </div>
              <div className="p-2.5 rounded bg-white border border-neutral-200">
                <strong>Сценарій 2 (Перезмінка варти о 08:00):</strong> 1. Експорт бекапу бази → 2. Звірка чисельності людей на території → 3. Передача флешки новій зміні під підпис.
              </div>
              <div className="p-2.5 rounded bg-white border border-neutral-200">
                <strong>Сценарій 3 (Виправлення помилкового натискання):</strong> Якщо випадково натиснуто «Вихід», повторне натискання повертає статус з поміткою в журналі.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* РОЗДІЛИ 8, 9, 10, 11 */}
      <div className="min-h-[265mm] pt-8 page-break-after">
        <div className="border-b-2 border-neutral-900 pb-3 mb-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 block">Розділи 8, 9, 10, 11</span>
            <h2 className="text-lg sm:text-xl font-black uppercase text-neutral-900">
              Автоматизація, налаштування та усунення несправностей
            </h2>
          </div>
          <span className="text-xs font-mono font-bold text-neutral-400">Стор. 8</span>
        </div>

        <div className="space-y-4 text-xs text-neutral-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1.5">
              <h3 className="font-bold text-neutral-900 text-xs uppercase">Розділ 8: Retention Policy &amp; Сітки</h3>
              <p className="text-[11px] text-neutral-600">
                Налаштування зберігання логів (7, 30, 90 діб), адаптивні сітки 1–4 колонок під монітори чергового, звукові оповіщення успішного пропуску.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1.5">
              <h3 className="font-bold text-neutral-900 text-xs uppercase">Розділ 9: Матриця налаштувань</h3>
              <p className="text-[11px] text-neutral-600">
                Теми: Світла, Темна, Тактична Олива. Рекомендовано для КПП: Тактична Олива або Світла для роздруківки. Шрифт: Збільшений (16px).
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
            <h3 className="font-bold text-neutral-900 text-sm">Розділ 10: FAQ та матриця усунення несправностей</h3>
            <div className="space-y-1.5 text-[11px]">
              <div className="p-2 rounded bg-white border border-neutral-200">
                <strong>• Не працює мікрофон:</strong> Натисніть іконку замка в адресному рядку браузера → Дозволити мікрофон → Перезавантажте вкладку.
              </div>
              <div className="p-2 rounded bg-white border border-neutral-200">
                <strong>• Не натискається кнопка виходу:</strong> Увімкнено режим «Брудне небо». Вимкніть режим після відбою тривоги черговим частини.
              </div>
              <div className="p-2 rounded bg-white border border-neutral-200">
                <strong>• Порожній список після очищення кешу:</strong> Відкрийте «Налаштування» → «Резервна копія» → «Імпорт бази» та відновіть вчорашній JSON з флешки.
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
            <h3 className="font-bold text-neutral-900 text-sm">Розділ 11: Самодіагностика термінала (4 компоненти)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px]">
              <div className="p-2 rounded bg-white border border-neutral-200 font-bold">1. IndexedDB<br /><span className="text-emerald-600">Цілісність 100%</span></div>
              <div className="p-2 rounded bg-white border border-neutral-200 font-bold">2. Аудіо-потік<br /><span className="text-emerald-600">Доступно</span></div>
              <div className="p-2 rounded bg-white border border-neutral-200 font-bold">3. ДБЖ 220V<br /><span className="text-emerald-600">Акумулятор ОК</span></div>
              <div className="p-2 rounded bg-white border border-neutral-200 font-bold">4. No-Cloud<br /><span className="text-emerald-600">Ізольовано</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* РОЗДІЛ 12 ТА ОФІЦІЙНА ВІДМІТКА ЗАТВЕРДЖЕННЯ */}
      <div className="min-h-[265mm] pt-8 flex flex-col justify-between">
        <div>
          <div className="border-b-2 border-neutral-900 pb-3 mb-5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 block">Розділ 12</span>
              <h2 className="text-lg sm:text-xl font-black uppercase text-neutral-900">
                Оновлення, бекапи та відмітка затвердження (Форма А-412)
              </h2>
            </div>
            <span className="text-xs font-mono font-bold text-neutral-400">Стор. 9</span>
          </div>

          <div className="space-y-4 text-xs text-neutral-800">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 space-y-1">
              <strong className="text-xs uppercase block">Золоте правило безпечного обслуговування СКУД:</strong>
              <p className="text-[11px] leading-relaxed">
                Перед будь-яким оновленням версії ПЗ або зміною налаштувань обов'язково експортуйте резервну копію бази на дві незалежні USB-флешки!
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
                <strong>Щотижневий регламент:</strong>
                <ul className="list-disc pl-4 space-y-1 text-neutral-600">
                  <li>Створення повного архівного дампу бази.</li>
                  <li>Очищення корпусу термінала від пилу.</li>
                  <li>Тестування батареї безперебійника ДБЖ.</li>
                  <li>Звірка списків бійців зі стройовою частиною.</li>
                </ul>
              </div>
              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
                <strong>Дії при аварійному збої:</strong>
                <ul className="list-disc pl-4 space-y-1 text-neutral-600">
                  <li>Збережіть спокій: дані збережено на USB.</li>
                  <li>Очистіть кеш браузера та перезапустіть термінал.</li>
                  <li>Натисніть «Імпорт бази» та оберіть файл бекапу.</li>
                  <li>Доповісти начальнику варти про готовність.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* OFFICIAL SIGNATURE & STAMP BOX */}
        <div className="border-2 border-neutral-900 rounded-2xl p-6 bg-white space-y-4 my-6 select-none print:border-black">
          <div className="flex items-center justify-between border-b-2 border-neutral-900 pb-2">
            <h3 className="font-black text-sm uppercase tracking-wider text-neutral-900">
              ВІДМІТКА ПРО ЗАТВЕРДЖЕННЯ ТА ПРОВЕДЕННЯ ІНСТРУКТАЖУ НА ПОСТУ:
            </h3>
            <span className="font-mono font-bold text-xs bg-neutral-100 px-2 py-0.5 rounded border border-neutral-300">
              ФОРМА А-412
            </span>
          </div>

          <p className="text-xs text-neutral-700 leading-relaxed text-justify">
            Даний методичний посібник користувача затверджений командуванням військової частини як обов'язковий стандарт організації несення служби на контрольно-пропускних пунктах. Особовий склад добового наряду КПП ознайомлений під особистий підпис із безпековими протоколами, порядком дій у режимі «Брудне небо» та веденням журналів СКУД.
          </p>

          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] text-neutral-500 uppercase font-mono block">Начальник варти / Командир роти охорони:</span>
              <div className="font-bold text-neutral-900">Підпис: ____________________ / ПІБ: ____________________</div>
            </div>
            <div className="space-y-1 sm:text-right">
              <span className="text-[10px] text-neutral-500 uppercase font-mono block">Дата затвердження та печатка:</span>
              <div className="font-bold text-neutral-900">«___» ____________ 2026 року • М. П.</div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
