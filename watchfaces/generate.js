// 可爱 Apple Watch 表盘壁纸生成器
// 用法：node watchfaces/generate.js
// 输出：watchfaces/output/*.png（默认 416x496，对应 Apple Watch Series 10/11 46mm）
// 顶部约 1/4 区域刻意留空，给「照片」表盘叠加的系统时间留位置。

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const W = 416;
const H = 496;
const OUT = path.join(__dirname, 'output');

// ---------- 通用小部件 ----------
const eye = (x, y, r = 11) => `
  <ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 1.15}" fill="#3B2A2A"/>
  <circle cx="${x + r * 0.35}" cy="${y - r * 0.4}" r="${r * 0.38}" fill="#fff"/>
  <circle cx="${x - r * 0.3}" cy="${y + r * 0.35}" r="${r * 0.16}" fill="#fff"/>`;
const blush = (x, y, rx = 20, color = '#FF8FAB') =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${rx * 0.55}" fill="${color}" opacity="0.55"/>`;
const wMouth = (x, y, s = 1, color = '#3B2A2A') =>
  `<path d="M ${x - 14 * s} ${y} q ${7 * s} ${10 * s} ${14 * s} 0 q ${7 * s} ${10 * s} ${14 * s} 0"
     fill="none" stroke="${color}" stroke-width="${3.5 * s}" stroke-linecap="round" stroke-linejoin="round"/>`;
const heart = (x, y, s, color, op = 1) =>
  `<path transform="translate(${x} ${y}) scale(${s})" opacity="${op}" fill="${color}"
     d="M0 6 C -6 -2 -16 2 -12 10 C -9 16 0 21 0 24 C 0 21 9 16 12 10 C 16 2 6 -2 0 6 Z"/>`;
const star = (x, y, r, color, op = 1) => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${color}" opacity="${op}" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>`;
};
const sparkle = (x, y, r, color, op = 1) =>
  `<path transform="translate(${x} ${y})" opacity="${op}" fill="${color}"
     d="M0 ${-r} Q ${r * 0.15} ${-r * 0.15} ${r} 0 Q ${r * 0.15} ${r * 0.15} 0 ${r} Q ${-r * 0.15} ${r * 0.15} ${-r} 0 Q ${-r * 0.15} ${-r * 0.15} 0 ${-r} Z"/>`;
const paw = (x, y, s, color, op = 1) => `
  <g transform="translate(${x} ${y}) scale(${s})" fill="${color}" opacity="${op}">
    <ellipse cx="0" cy="6" rx="10" ry="8"/>
    <circle cx="-11" cy="-6" r="4.5"/><circle cx="-4" cy="-12" r="4.5"/>
    <circle cx="4" cy="-12" r="4.5"/><circle cx="11" cy="-6" r="4.5"/>
  </g>`;
const bg = (id, c1, c2) => `
  <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
  </linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#${id})"/>`;

// ---------- 6 款表盘 ----------
const faces = {};

// 1. 偷看的奶猫
faces['01-peeking-kitty'] = `
  ${bg('g1', '#FFE9F0', '#FFC4D6')}
  ${paw(60, 190, 1.1, '#fff', 0.6)}${paw(350, 230, 0.9, '#fff', 0.6)}
  ${heart(330, 150, 1.1, '#FF9EBB', 0.7)}${heart(80, 270, 0.8, '#FF9EBB', 0.6)}
  ${sparkle(250, 175, 9, '#fff', 0.9)}${sparkle(150, 230, 6, '#fff', 0.8)}
  <!-- 耳朵 -->
  <path d="M 68 380 Q 62 250 112 262 Q 150 275 176 320 Z" fill="#FFF7EE" stroke="#5A3E3E" stroke-width="4" stroke-linejoin="round"/>
  <path d="M 348 380 Q 354 250 304 262 Q 266 275 240 320 Z" fill="#FFF7EE" stroke="#5A3E3E" stroke-width="4" stroke-linejoin="round"/>
  <path d="M 90 345 Q 90 285 118 290 Q 140 297 152 320 Z" fill="#FFB3C7"/>
  <path d="M 326 345 Q 326 285 298 290 Q 276 297 264 320 Z" fill="#FFB3C7"/>
  <!-- 头 -->
  <ellipse cx="208" cy="450" rx="172" ry="148" fill="#FFF7EE" stroke="#5A3E3E" stroke-width="4"/>
  <!-- 头顶花纹 -->
  <path d="M 190 306 q 4 22 0 34 M 208 303 q 0 26 0 40 M 226 306 q -4 22 0 34" stroke="#F4B183" stroke-width="7" stroke-linecap="round" fill="none"/>
  ${eye(148, 398, 13)}${eye(268, 398, 13)}
  ${blush(112, 432, 22)}${blush(304, 432, 22)}
  <path d="M 201 418 L 215 418 L 208 426 Z" fill="#FF7A9C" stroke="#FF7A9C" stroke-width="3" stroke-linejoin="round"/>
  ${wMouth(208, 430, 0.85)}
  <!-- 胡须 -->
  <g stroke="#5A3E3E" stroke-width="3" stroke-linecap="round">
    <line x1="60" y1="410" x2="96" y2="416"/><line x1="58" y1="432" x2="94" y2="430"/>
    <line x1="356" y1="410" x2="320" y2="416"/><line x1="358" y1="432" x2="322" y2="430"/>
  </g>
  <!-- 小爪子扒着屏幕边 -->
  <g stroke="#5A3E3E" stroke-width="4" fill="#FFF7EE">
    <ellipse cx="128" cy="486" rx="40" ry="28"/><ellipse cx="288" cy="486" rx="40" ry="28"/>
  </g>
  <g stroke="#5A3E3E" stroke-width="3" stroke-linecap="round">
    <line x1="118" y1="466" x2="118" y2="478"/><line x1="138" y1="466" x2="138" y2="478"/>
    <line x1="278" y1="466" x2="278" y2="478"/><line x1="298" y1="466" x2="298" y2="478"/>
  </g>`;

// 2. 抱蜂蜜罐的小熊
faces['02-honey-bear'] = `
  ${bg('g2', '#FFF6D8', '#FFD98C')}
  <!-- 小蜜蜂 -->
  <g transform="translate(320 175)">
    <path d="M -60 20 q 20 -30 40 -5 q 15 20 35 -5" stroke="#C9963F" stroke-width="2.5" stroke-dasharray="5 6" fill="none"/>
    <ellipse cx="-4" cy="-14" rx="9" ry="12" fill="#fff" opacity="0.9" transform="rotate(-25 -4 -14)"/>
    <ellipse cx="8" cy="-14" rx="9" ry="12" fill="#fff" opacity="0.9" transform="rotate(25 8 -14)"/>
    <ellipse cx="2" cy="0" rx="17" ry="13" fill="#FFD23F" stroke="#4A3428" stroke-width="3"/>
    <path d="M -4 -12 v 24 M 8 -11 v 22" stroke="#4A3428" stroke-width="4"/>
    <circle cx="14" cy="-3" r="2.2" fill="#4A3428"/>
  </g>
  ${sparkle(80, 200, 8, '#fff', 0.9)}${sparkle(120, 160, 5, '#fff', 0.8)}
  <!-- 耳朵 -->
  <circle cx="92" cy="268" r="44" fill="#C98B5A" stroke="#4A3428" stroke-width="4"/>
  <circle cx="324" cy="268" r="44" fill="#C98B5A" stroke="#4A3428" stroke-width="4"/>
  <circle cx="92" cy="268" r="24" fill="#F0C9A0"/><circle cx="324" cy="268" r="24" fill="#F0C9A0"/>
  <!-- 头 -->
  <ellipse cx="208" cy="372" rx="148" ry="122" fill="#C98B5A" stroke="#4A3428" stroke-width="4"/>
  ${eye(150, 352, 12)}${eye(266, 352, 12)}
  ${blush(118, 390, 20, '#FF8C7A')}${blush(298, 390, 20, '#FF8C7A')}
  <ellipse cx="208" cy="396" rx="50" ry="36" fill="#F3D6B5"/>
  <ellipse cx="208" cy="380" rx="15" ry="10" fill="#4A3428"/>
  <circle cx="203" cy="377" r="3.5" fill="#fff"/>
  ${wMouth(208, 398, 0.8, '#4A3428')}
  <!-- 蜂蜜罐 -->
  <path d="M 140 448 Q 136 430 160 428 L 256 428 Q 280 430 276 448 Q 300 496 280 520 L 136 520 Q 116 496 140 448 Z" fill="#E8A13A" stroke="#4A3428" stroke-width="4"/>
  <rect x="146" y="418" width="124" height="22" rx="11" fill="#B07330" stroke="#4A3428" stroke-width="4"/>
  <path d="M 160 440 q 4 18 -2 26 q -5 6 4 6 q 9 0 4 -8 q -4 -10 0 -24 Z" fill="#FFC94A"/>
  <path d="M 200 440 q 3 10 -1 16 q -4 5 3 5 q 7 0 3 -6 q -3 -6 -1 -15 Z" fill="#FFC94A"/>
  <ellipse cx="208" cy="478" rx="40" ry="20" fill="#FFF3D6" stroke="#4A3428" stroke-width="3"/>
  ${heart(208, 468, 0.75, '#FF7A7A')}
  <!-- 小手 -->
  <ellipse cx="128" cy="462" rx="28" ry="22" fill="#C98B5A" stroke="#4A3428" stroke-width="4"/>
  <ellipse cx="288" cy="462" rx="28" ry="22" fill="#C98B5A" stroke="#4A3428" stroke-width="4"/>`;

// 3. 云朵上的兔兔（夜空）
const nightStars = [[60,150,7],[350,140,9],[300,210,5],[110,230,5],[370,260,6],[40,300,5],[200,160,4]]
  .map(([x,y,r]) => star(x, y, r, '#FFF3B0', 0.9)).join('');
faces['03-cloud-bunny'] = `
  ${bg('g3', '#B7B0F5', '#F5DDF7')}
  ${nightStars}
  <!-- 月亮 -->
  <path d="M 72 70 a 34 34 0 1 0 40 44 a 28 28 0 1 1 -40 -44 Z" fill="#FFF3B0" opacity="0.95" transform="translate(-20 110)"/>
  <!-- 耳朵 -->
  <ellipse cx="160" cy="250" rx="28" ry="78" fill="#fff" stroke="#5B4B7A" stroke-width="4" transform="rotate(-12 160 250)"/>
  <ellipse cx="256" cy="250" rx="28" ry="78" fill="#fff" stroke="#5B4B7A" stroke-width="4" transform="rotate(12 256 250)"/>
  <ellipse cx="160" cy="256" rx="13" ry="56" fill="#FFC6DA" transform="rotate(-12 160 256)"/>
  <ellipse cx="256" cy="256" rx="13" ry="56" fill="#FFC6DA" transform="rotate(12 256 256)"/>
  <!-- 头 -->
  <ellipse cx="208" cy="380" rx="118" ry="96" fill="#fff" stroke="#5B4B7A" stroke-width="4"/>
  <!-- 睡着的眼睛 -->
  <path d="M 140 370 q 18 16 36 0 M 240 370 q 18 16 36 0" stroke="#5B4B7A" stroke-width="4.5" fill="none" stroke-linecap="round"/>
  ${blush(140, 400, 18)}${blush(276, 400, 18)}
  <ellipse cx="208" cy="392" rx="8" ry="6" fill="#FF8FAB"/>
  ${wMouth(208, 402, 0.6, '#5B4B7A')}
  <!-- Zzz -->
  <g fill="#fff" font-family="Arial Rounded MT Bold, Arial, sans-serif" font-weight="bold">
    <text x="318" y="318" font-size="26">z</text><text x="340" y="292" font-size="20">z</text><text x="356" y="270" font-size="15">z</text>
  </g>
  <!-- 云朵 -->
  <g fill="#fff" stroke="#E3D7F7" stroke-width="3">
    <circle cx="60" cy="480" r="62"/><circle cx="150" cy="462" r="60"/><circle cx="256" cy="470" r="64"/>
    <circle cx="356" cy="476" r="66"/><rect x="0" y="470" width="416" height="40"/>
  </g>
  <g fill="#fff"><rect x="0" y="472" width="416" height="30"/></g>`;

// 4. 荷叶上的小青蛙
faces['04-lily-frog'] = `
  ${bg('g4', '#DDF8EA', '#9FE3C3')}
  <!-- 水波 -->
  <g stroke="#fff" stroke-width="3" fill="none" opacity="0.7" stroke-linecap="round">
    <path d="M 40 210 q 15 -10 30 0 q 15 10 30 0"/><path d="M 300 180 q 15 -10 30 0 q 15 10 30 0"/>
    <path d="M 320 280 q 12 -8 24 0 q 12 8 24 0"/>
  </g>
  <!-- 小花 -->
  <g transform="translate(78 290)">
    ${[0,72,144,216,288].map(a => `<ellipse cx="0" cy="-14" rx="9" ry="14" fill="#FFB8D2" transform="rotate(${a})"/>`).join('')}
    <circle r="8" fill="#FFE27A"/>
  </g>
  <!-- 荷叶 -->
  <path d="M 208 470 L 40 440 A 190 70 0 1 0 376 440 Z" fill="#4FB477" stroke="#2F6E4E" stroke-width="4"/>
  <path d="M 208 470 L 380 448" stroke="#2F6E4E" stroke-width="3"/>
  <!-- 身体 -->
  <ellipse cx="208" cy="440" rx="104" ry="60" fill="#8BDB6A" stroke="#2F6E4E" stroke-width="4"/>
  <ellipse cx="208" cy="452" rx="62" ry="36" fill="#E9F8C9"/>
  <!-- 头 -->
  <ellipse cx="208" cy="362" rx="126" ry="78" fill="#8BDB6A" stroke="#2F6E4E" stroke-width="4"/>
  <!-- 眼睛凸起 -->
  <circle cx="140" cy="300" r="44" fill="#8BDB6A" stroke="#2F6E4E" stroke-width="4"/>
  <circle cx="276" cy="300" r="44" fill="#8BDB6A" stroke="#2F6E4E" stroke-width="4"/>
  <ellipse cx="208" cy="330" rx="100" ry="30" fill="#8BDB6A"/>
  <circle cx="140" cy="302" r="28" fill="#fff"/><circle cx="276" cy="302" r="28" fill="#fff"/>
  ${eye(144, 306, 14)}${eye(272, 306, 14)}
  ${blush(118, 380, 20)}${blush(298, 380, 20)}
  <path d="M 162 372 q 46 34 92 0" stroke="#2F6E4E" stroke-width="4.5" fill="none" stroke-linecap="round"/>
  <path d="M 196 386 q 12 18 24 0" fill="#FF7A9C"/>
  <!-- 小手 -->
  <ellipse cx="150" cy="452" rx="22" ry="14" fill="#8BDB6A" stroke="#2F6E4E" stroke-width="4"/>
  <ellipse cx="266" cy="452" rx="22" ry="14" fill="#8BDB6A" stroke="#2F6E4E" stroke-width="4"/>`;

// 5. 草莓宝宝
const berrySeeds = (cx, cy) => [[-30,-10],[0,-20],[30,-10],[-45,25],[-15,15],[15,15],[45,25],[-30,50],[0,45],[30,50],[-12,78],[12,78]]
  .map(([dx,dy]) => `<ellipse cx="${cx+dx}" cy="${cy+dy}" rx="3.5" ry="5" fill="#FFE9A8"/>`).join('');
const miniBerry = (x, y, s, rot) => `
  <g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" opacity="0.85">
    <path d="M 0 30 C -22 18 -24 -6 -12 -12 C -4 -16 4 -16 12 -12 C 24 -6 22 18 0 30 Z" fill="#FF6B81"/>
    <path d="M -12 -12 L -6 -20 L 0 -14 L 6 -20 L 12 -12 Z" fill="#5CC17B"/>
  </g>`;
faces['05-strawberry'] = `
  ${bg('g5', '#FFF6F8', '#FFD9E1')}
  ${miniBerry(60, 180, 1, -15)}${miniBerry(360, 160, 0.9, 20)}${miniBerry(340, 290, 0.7, -10)}${miniBerry(70, 300, 0.7, 15)}
  ${sparkle(130, 170, 7, '#FF9EB3', 0.7)}${sparkle(290, 210, 6, '#FF9EB3', 0.7)}
  <!-- 大草莓身体 -->
  <path d="M 208 500 C 90 470 52 360 96 300 C 126 262 170 256 208 266 C 246 256 290 262 320 300 C 364 360 326 470 208 500 Z"
        fill="#FF5C77" stroke="#9E2F45" stroke-width="4"/>
  <path d="M 120 310 q -20 30 -14 70" stroke="#fff" stroke-width="8" stroke-linecap="round" fill="none" opacity="0.5"/>
  ${berrySeeds(208, 400)}
  <!-- 叶子 -->
  <path d="M 130 282 Q 150 236 184 262 Q 190 222 208 222 Q 226 222 232 262 Q 266 236 286 282 Q 248 300 208 284 Q 168 300 130 282 Z"
        fill="#6CCB86" stroke="#2F7A4C" stroke-width="4" stroke-linejoin="round"/>
  <path d="M 208 226 q 6 -26 22 -36" stroke="#2F7A4C" stroke-width="6" stroke-linecap="round" fill="none"/>
  ${eye(162, 340, 12)}${eye(254, 340, 12)}
  ${blush(134, 372, 18, '#FFC2CD')}${blush(282, 372, 18, '#FFC2CD')}
  <path d="M 192 360 q 16 22 32 0 Z" fill="#9E2F45" stroke="#9E2F45" stroke-width="3" stroke-linejoin="round"/>
  <path d="M 200 366 q 8 8 16 0" fill="#FF9EB3"/>`;

// 6. 蛋壳里的小鸡
faces['06-egg-chick'] = `
  ${bg('g6', '#CDEBFF', '#FFF6D2')}
  <!-- 太阳 -->
  <g transform="translate(350 230)">
    ${Array.from({length: 10}, (_, i) => `<rect x="-3" y="-44" width="6" height="12" rx="3" fill="#FFC93C" transform="rotate(${i*36})"/>`).join('')}
    <circle r="26" fill="#FFD95A"/>
  </g>
  <!-- 小云 -->
  <g fill="#fff" opacity="0.9"><circle cx="60" cy="200" r="18"/><circle cx="84" cy="192" r="24"/><circle cx="108" cy="202" r="16"/><rect x="60" y="200" width="48" height="18" rx="9"/></g>
  <!-- 草地 -->
  <ellipse cx="208" cy="520" rx="300" ry="70" fill="#A8E08C"/>
  ${[50,90,330,370].map(x => `<path d="M ${x} 470 q 4 -16 8 0 q 4 -12 8 0" stroke="#6DBF55" stroke-width="3" fill="none" stroke-linecap="round"/>`).join('')}
  <!-- 小鸡 -->
  <ellipse cx="208" cy="370" rx="104" ry="100" fill="#FFE066" stroke="#8A6420" stroke-width="4"/>
  <path d="M 200 274 q -12 -26 4 -30 q 4 14 10 4 q 10 10 -4 28" fill="#FFE066" stroke="#8A6420" stroke-width="4" stroke-linejoin="round"/>
  ${eye(170, 350, 12)}${eye(246, 350, 12)}
  ${blush(144, 382, 18)}${blush(272, 382, 18)}
  <path d="M 194 372 L 222 372 L 208 390 Z" fill="#FF9F43" stroke="#C26A1E" stroke-width="3" stroke-linejoin="round"/>
  <!-- 翅膀 -->
  <path d="M 108 400 q -30 -20 -24 -50 q 20 10 34 30 Z" fill="#FFD43B" stroke="#8A6420" stroke-width="4" stroke-linejoin="round"/>
  <path d="M 308 400 q 30 -20 24 -50 q -20 10 -34 30 Z" fill="#FFD43B" stroke="#8A6420" stroke-width="4" stroke-linejoin="round"/>
  <!-- 蛋壳 -->
  <path d="M 92 410 L 122 386 L 150 414 L 180 388 L 208 416 L 236 388 L 266 414 L 294 386 L 324 410
           C 330 470 290 506 208 506 C 126 506 86 470 92 410 Z" fill="#FFFDF7" stroke="#8A6420" stroke-width="4" stroke-linejoin="round"/>
  <g fill="#FFB8D2" opacity="0.8"><circle cx="150" cy="460" r="8"/><circle cx="262" cy="452" r="10"/><circle cx="208" cy="480" r="6"/></g>`;

// ---------- 渲染 ----------
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  for (const [name, body] of Object.entries(faces)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`;
    await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
    await page.screenshot({ path: path.join(OUT, `${name}.png`), clip: { x: 0, y: 0, width: W, height: H } });
    console.log('✓', name);
  }
  await browser.close();
})();
