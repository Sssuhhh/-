// 可爱 Apple Watch 表盘壁纸生成器（商用精修版）
// 用法：node watchfaces/generate.js
// 输出：
//   watchfaces/output/<款式>/<款式>_<型号尺寸>.png   各型号原生分辨率
//   watchfaces/output/<款式>/<款式>_HD.png            3 倍高清母版（预览、印刷用）
//   watchfaces/output/mockups/<款式>_mockup.png       1200×1200 手表展示图（商品主图）
//   watchfaces/output/cover.png                       全系列封面图
// 设计坐标系为 416×496；顶部约 1/4 留空，给「照片」表盘的系统时间。

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const W = 416;
const H = 496;
const OUT = path.join(__dirname, 'output');

// 屏幕原生分辨率（来源：Apple 官方 Tech Specs）
const SIZES = [
  ['Ultra3-4_49mm', 422, 514],
  ['Ultra1-2_49mm', 410, 502],
  ['S10-12_46mm', 416, 496],
  ['S10-12_42mm', 374, 446],
  ['S7-9_45mm', 396, 484],
  ['S7-9_41mm', 352, 430],
  ['S4-6_SE_44mm', 368, 448],
  ['S4-6_SE_40mm', 324, 394],
];

// ================= 绘图工具 =================
let D = []; // 当前表盘的 <defs>
let uid = 0;
const nid = (p) => `${p}${++uid}`;
const stopsXml = (stops) =>
  stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('');
const radial = (stops, { cx = 0.38, cy = 0.3, r = 0.85 } = {}) => {
  const i = nid('r');
  D.push(`<radialGradient id="${i}" cx="${cx}" cy="${cy}" r="${r}">${stopsXml(stops)}</radialGradient>`);
  return `url(#${i})`;
};
const linear = (stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1, units = 'objectBoundingBox') => {
  const i = nid('l');
  D.push(`<linearGradient id="${i}" gradientUnits="${units}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stopsXml(stops)}</linearGradient>`);
  return `url(#${i})`;
};
// 立体感填充：左上亮、边缘暗
const vol = (light, base, dark) => radial([[0, light], [0.55, base], [1, dark]], { cx: 0.36, cy: 0.28, r: 0.95 });

// 描边合并：先画粗描边层，再画填充层，让多个形状拼成一个干净轮廓
const blob = (shapes, fill, stroke, sw = 3) => `
  <g fill="${stroke}" stroke="${stroke}" stroke-width="${sw * 2}" stroke-linejoin="round">${shapes}</g>
  <g fill="${fill}">${shapes}</g>`;

const eye = (x, y, r = 13) => `
  <ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 1.18}" fill="url(#eyeG)"/>
  <ellipse cx="${x + r * 0.3}" cy="${y - r * 0.42}" rx="${r * 0.42}" ry="${r * 0.36}" fill="#fff"/>
  <circle cx="${x - r * 0.38}" cy="${y + r * 0.45}" r="${r * 0.17}" fill="#fff" opacity="0.92"/>
  <circle cx="${x + r * 0.48}" cy="${y + r * 0.28}" r="${r * 0.09}" fill="#fff" opacity="0.7"/>`;
const blush = (x, y, rx = 22, color = '#FF8FAB', lines = true) => `
  <ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${rx * 0.6}" fill="${radial([[0, color, 0.8], [0.6, color, 0.45], [1, color, 0]], { cx: 0.5, cy: 0.5, r: 0.5 })}"/>
  ${lines ? `<g stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.75">
    <line x1="${x - rx * 0.45}" y1="${y + 3}" x2="${x - rx * 0.3}" y2="${y - 4}"/>
    <line x1="${x - rx * 0.08}" y1="${y + 3}" x2="${x + rx * 0.07}" y2="${y - 4}"/>
    <line x1="${x + rx * 0.3}" y1="${y + 3}" x2="${x + rx * 0.45}" y2="${y - 4}"/></g>` : ''}`;
const wMouth = (x, y, s = 1, color = '#5A3A3A') =>
  `<path d="M ${x - 13 * s} ${y} q ${6.5 * s} ${9 * s} ${13 * s} 0 q ${6.5 * s} ${9 * s} ${13 * s} 0"
     fill="none" stroke="${color}" stroke-width="${3.2 * s}" stroke-linecap="round" stroke-linejoin="round"/>`;
const heartD = 'M0 6 C -6 -2 -16 2 -12 10 C -9 16 0 21 0 24 C 0 21 9 16 12 10 C 16 2 6 -2 0 6 Z';
const heart = (x, y, s, c1, c2, op = 1, rot = 0) =>
  `<path transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" opacity="${op}" d="${heartD}"
     fill="${radial([[0, c1], [1, c2]], { cx: 0.35, cy: 0.3, r: 0.9 })}"/>`;
const starPts = (x, y, r, inner = 0.48) => {
  const p = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * inner;
    p.push(`${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)}`);
  }
  return p.join(' ');
};
const star = (x, y, r, fill, op = 1, glow = false) =>
  `<polygon points="${starPts(x, y, r)}" fill="${fill}" stroke="${fill}" stroke-width="${r * 0.25}"
     stroke-linejoin="round" opacity="${op}" ${glow ? 'filter="url(#glow)"' : ''}/>`;
const sparkle = (x, y, r, color, op = 1) =>
  `<path transform="translate(${x} ${y})" opacity="${op}" fill="${color}" filter="url(#glow)"
     d="M0 ${-r} Q ${r * 0.14} ${-r * 0.14} ${r} 0 Q ${r * 0.14} ${r * 0.14} 0 ${r} Q ${-r * 0.14} ${r * 0.14} ${-r} 0 Q ${-r * 0.14} ${-r * 0.14} 0 ${-r} Z"/>`;
const dot = (x, y, r, color, op) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="${op}"/>`;
const paw = (x, y, s, color, op = 1, rot = 0) => `
  <g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" fill="${color}" opacity="${op}">
    <path d="M -10 8 Q -11 -2 0 -2 Q 11 -2 10 8 Q 9 15 0 14 Q -9 15 -10 8 Z"/>
    <ellipse cx="-11" cy="-8" rx="4" ry="5"/><ellipse cx="-4" cy="-14" rx="4" ry="5"/>
    <ellipse cx="4" cy="-14" rx="4" ry="5"/><ellipse cx="11" cy="-8" rx="4" ry="5"/>
  </g>`;

// 公共背景：渐变 + 柔光色块 +（最后叠加）颗粒与暗角
const scene = (top, bottom, blobs) => `
  <rect x="-80" y="-80" width="${W + 160}" height="${H + 160}" fill="${linear([[0, top], [1, bottom]])}"/>
  <g filter="url(#blur)">${blobs.map(([x, y, r, c, op]) => dot(x, y, r, c, op)).join('')}</g>`;
const finish = (tint) => `
  <rect x="-80" y="-80" width="${W + 160}" height="${H + 160}"
        fill="${radial([[0, tint, 0], [0.7, tint, 0], [1, tint, 0.14]], { cx: 0.5, cy: 0.5, r: 0.75 })}"/>
  <rect x="-80" y="-80" width="${W + 160}" height="${H + 160}" filter="url(#grain)" opacity="0.06"/>`;

const baseDefs = (shadowTint) => `
  <radialGradient id="eyeG" cx="0.5" cy="0.85" r="0.75">
    <stop offset="0" stop-color="#8A5A44"/><stop offset="0.55" stop-color="#3A2424"/><stop offset="1" stop-color="#1E1414"/>
  </radialGradient>
  <filter id="sh" x="-30%" y="-30%" width="160%" height="160%">
    <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="${shadowTint}" flood-opacity="0.3"/>
  </filter>
  <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
    <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="${shadowTint}" flood-opacity="0.25"/>
  </filter>
  <filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="34"/></filter>
  <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
    <feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
    <feColorMatrix type="saturate" values="0"/></filter>`;

// ================= 6 款表盘 =================
const faces = [];

// ---------- 1. 偷看的奶猫 ----------
faces.push({
  name: '01-peeking-kitty', tint: '#E07A9A', band: ['#FFD3E0', '#F7A9C0'], bg: ['#FFF0F4', '#FFC9D9'],
  draw() {
    const fur = vol('#FFFFFF', '#FFF6EC', '#F1D6C2');
    const line = '#B98A7C';
    const earIn = radial([[0, '#FFD6E1'], [1, '#FF9FBA']], { cx: 0.5, cy: 0.7, r: 0.8 });
    const bow = vol('#FFB8CE', '#FF86A8', '#E9608A');
    return `
    ${scene('#FFF2F6', '#FFC6D7', [[60, 120, 90, '#fff', 0.8], [360, 420, 110, '#FF9DBA', 0.45], [380, 160, 60, '#FFE3EC', 0.9]])}
    ${paw(56, 196, 1.05, '#fff', 0.75, -18)}${paw(362, 238, 0.85, '#fff', 0.75, 15)}${paw(38, 300, 0.6, '#fff', 0.6, -8)}
    ${heart(338, 150, 1.05, '#FFC2D4', '#FF7EA2', 0.9, 12)}${heart(92, 262, 0.7, '#FFC2D4', '#FF7EA2', 0.8, -14)}
    ${sparkle(258, 178, 9, '#fff')}${sparkle(150, 222, 6, '#fff', 0.9)}${sparkle(392, 330, 5, '#fff', 0.9)}
    ${dot(300, 250, 3, '#fff', 0.8)}${dot(120, 170, 2.5, '#fff', 0.8)}
    <g filter="url(#sh)">
      ${blob(`<path d="M 72 392 Q 56 262 108 256 Q 150 256 184 318 Z"/>
              <path d="M 344 392 Q 360 262 308 256 Q 266 256 232 318 Z"/>
              <ellipse cx="208" cy="458" rx="178" ry="152"/>`, fur, line, 3)}
      <path d="M 94 348 Q 86 290 114 284 Q 140 284 158 318 Z" fill="${earIn}"/>
      <path d="M 322 348 Q 330 290 302 284 Q 276 284 258 318 Z" fill="${earIn}"/>
      <g stroke="#F5B07E" stroke-width="8" stroke-linecap="round" fill="none" opacity="0.9">
        <path d="M 188 310 q 4 18 1 30"/><path d="M 208 307 q 0 22 0 36"/><path d="M 228 310 q -4 18 -1 30"/>
        <path d="M 36 430 q 14 -4 26 2" stroke-width="6"/><path d="M 380 430 q -14 -4 -26 2" stroke-width="6"/>
      </g>
      <!-- 蝴蝶结 -->
      <g transform="translate(320 292) rotate(18)">
        ${blob(`<path d="M 0 0 C -8 -24 -44 -26 -42 0 C -44 26 -8 24 0 0 Z"/><path d="M 0 0 C 8 -24 44 -26 42 0 C 44 26 8 24 0 0 Z"/>
                <path d="M -6 4 L -16 30 L -4 26 Z"/><path d="M 6 4 L 16 30 L 4 26 Z"/>`, bow, '#C2507A', 2.5)}
        <g fill="#fff" opacity="0.85"><circle cx="-26" cy="-8" r="3.5"/><circle cx="-18" cy="10" r="3"/><circle cx="26" cy="-6" r="3.5"/><circle cx="20" cy="11" r="3"/></g>
        ${blob('<ellipse cx="0" cy="0" rx="9" ry="10"/>', '#FF7AA0', '#C2507A', 2.5)}
        <ellipse cx="-2" cy="-3" rx="3" ry="2.5" fill="#fff" opacity="0.7"/>
      </g>
      ${eye(148, 402, 15)}${eye(268, 402, 15)}
      ${blush(108, 442, 27)}${blush(308, 442, 27)}
      <path d="M 199 422 Q 208 417 217 422 Q 215 430 208 433 Q 201 430 199 422 Z" fill="#FF7F9E"/>
      <ellipse cx="205" cy="422" rx="3" ry="1.6" fill="#fff" opacity="0.7"/>
      ${wMouth(208, 436, 0.8, '#8A5A50')}
      <g stroke="${line}" stroke-width="2.6" stroke-linecap="round" fill="none" opacity="0.85">
        <path d="M 54 404 q 22 0 40 8"/><path d="M 50 426 q 22 -2 42 0"/><path d="M 56 448 q 18 -6 38 -10"/>
        <path d="M 362 404 q -22 0 -40 8"/><path d="M 366 426 q -22 -2 -42 0"/><path d="M 360 448 q -18 -6 -38 -10"/>
      </g>
      <!-- 小爪子 + 肉垫 -->
      ${blob('<ellipse cx="124" cy="490" rx="46" ry="32"/><ellipse cx="292" cy="490" rx="46" ry="32"/>', fur, line, 3)}
      ${[124, 292].map((x) => `
        <g fill="${radial([[0, '#FFC4D4'], [1, '#FF9AB6']], { cx: 0.4, cy: 0.35, r: 0.8 })}">
          <ellipse cx="${x}" cy="496" rx="14" ry="10"/>
          <ellipse cx="${x - 18}" cy="477" rx="6" ry="7"/><ellipse cx="${x}" cy="471" rx="6" ry="7"/><ellipse cx="${x + 18}" cy="477" rx="6" ry="7"/>
        </g>`).join('')}
    </g>`;
  },
});

// ---------- 2. 抱蜂蜜罐的小熊 ----------
const hex = (x, y, r, op) => {
  const p = [];
  for (let i = 0; i < 6; i++) { const a = (Math.PI / 3) * i; p.push(`${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`); }
  return `<polygon points="${p.join(' ')}" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round" opacity="${op}"/>`;
};
const bee = (x, y, s, flip = false) => `
  <g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})" filter="url(#soft)">
    <ellipse cx="-6" cy="-16" rx="10" ry="14" fill="${radial([[0, '#fff'], [1, '#D9F0FF']], { cx: 0.4, cy: 0.3 })}" opacity="0.95" transform="rotate(-25 -6 -16)" stroke="#9CC9E8" stroke-width="1.5"/>
    <ellipse cx="8" cy="-16" rx="10" ry="14" fill="${radial([[0, '#fff'], [1, '#D9F0FF']], { cx: 0.4, cy: 0.3 })}" opacity="0.95" transform="rotate(25 8 -16)" stroke="#9CC9E8" stroke-width="1.5"/>
    ${blob('<ellipse cx="0" cy="0" rx="20" ry="15"/><path d="M -19 0 L -28 2 L -19 5 Z"/>', vol('#FFF09A', '#FFD43B', '#F0A800'), '#5A3B28', 2.4)}
    <path d="M -8 -13 q 3 13 0 26 M 4 -14 q 3 14 0 28" stroke="#5A3B28" stroke-width="5" fill="none"/>
    <circle cx="13" cy="-3" r="2.6" fill="#3A2424"/><circle cx="13.8" cy="-4" r="0.9" fill="#fff"/>
    <ellipse cx="14" cy="4" rx="3.5" ry="2" fill="#FF8C7A" opacity="0.7"/>
    <path d="M 14 -14 q 4 -10 10 -10" stroke="#5A3B28" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="24" cy="-24" r="2.5" fill="#5A3B28"/>
  </g>`;
faces.push({
  name: '02-honey-bear', tint: '#D08A3A', band: ['#FFE6B0', '#F2C06A'], bg: ['#FFF8E1', '#FFD98E'],
  draw() {
    const fur = vol('#E6B386', '#C98E5E', '#A26B42');
    const line = '#6E4630';
    return `
    ${scene('#FFF9E6', '#FFD68A', [[70, 120, 90, '#fff', 0.85], [350, 430, 120, '#FFB948', 0.4], [360, 180, 70, '#FFF1C2', 0.9]])}
    ${hex(34, 176, 18, 0.55)}${hex(62, 192, 18, 0.35)}${hex(34, 208, 18, 0.25)}
    ${hex(368, 300, 15, 0.5)}${hex(390, 316, 15, 0.3)}
    ${sparkle(96, 168, 7, '#fff')}${sparkle(250, 196, 5, '#fff', 0.9)}${dot(140, 196, 2.5, '#fff', 0.9)}
    <path d="M 238 214 q 22 -34 46 -10 q 18 20 34 -6" stroke="#C9963F" stroke-width="2.4" stroke-dasharray="5 7" stroke-linecap="round" fill="none" opacity="0.8"/>
    ${bee(334, 184, 1)}${bee(156, 200, 0.6, true)}
    <g filter="url(#sh)">
      ${blob(`<circle cx="94" cy="262" r="46"/><circle cx="322" cy="262" r="46"/><ellipse cx="208" cy="370" rx="152" ry="126"/>`, fur, line, 3.2)}
      <circle cx="94" cy="262" r="25" fill="${radial([[0, '#FBE0C2'], [1, '#E7B486']], { cx: 0.45, cy: 0.4 })}"/>
      <circle cx="322" cy="262" r="25" fill="${radial([[0, '#FBE0C2'], [1, '#E7B486']], { cx: 0.45, cy: 0.4 })}"/>
      ${eye(150, 348, 14)}${eye(266, 348, 14)}
      ${blush(116, 388, 25, '#FF8C7A')}${blush(300, 388, 25, '#FF8C7A')}
      <ellipse cx="208" cy="394" rx="56" ry="40" fill="${radial([[0, '#FFF4E4'], [1, '#EFCBA2']], { cx: 0.45, cy: 0.3 })}"/>
      <ellipse cx="208" cy="377" rx="17" ry="12" fill="${radial([[0, '#7B5340'], [1, '#3A2418']], { cx: 0.4, cy: 0.3 })}"/>
      <ellipse cx="202" cy="373" rx="5" ry="3" fill="#fff" opacity="0.8"/>
      ${wMouth(208, 396, 0.8, line)}
      <!-- 蜂蜜罐 -->
      ${blob(`<path d="M 136 452 Q 128 424 160 420 L 256 420 Q 288 424 280 452 Q 306 500 290 540 L 126 540 Q 110 500 136 452 Z"/>`,
        linear([[0, '#F9C35A'], [1, '#D9821C']], 0, 0, 1, 0), line, 3.2)}
      <path d="M 148 456 Q 140 482 146 512" stroke="#fff" stroke-width="9" stroke-linecap="round" fill="none" opacity="0.4"/>
      ${blob('<rect x="140" y="404" width="136" height="28" rx="14"/>', linear([[0, '#D8954A'], [1, '#9C5F22']]), line, 3.2)}
      <rect x="152" y="409" width="60" height="6" rx="3" fill="#fff" opacity="0.3"/>
      <path d="M 160 430 q 2 16 -2 24 q -4 8 5 8 q 9 0 5 -9 q -3 -10 -1 -23 Z M 228 430 q 2 10 -1 15 q -3 6 4 6 q 7 0 4 -7 q -2 -6 -1 -14 Z"
            fill="${linear([[0, '#FFE07A'], [1, '#F5AE22']])}"/>
      ${blob('<rect x="166" y="452" width="84" height="46" rx="16"/>', '#FFF7E6', line, 2.4)}
      <text x="208" y="474" text-anchor="middle" font-family="Inter" font-weight="800" font-size="14" letter-spacing="1.5" fill="#D07A26">HONEY</text>
      ${heart(208, 478, 0.55, '#FF9C9C', '#FF5F6D')}
      <!-- 小手 -->
      ${blob('<ellipse cx="126" cy="452" rx="31" ry="25"/><ellipse cx="290" cy="452" rx="31" ry="25"/>', fur, line, 3.2)}
      <g fill="#F3D2AE" opacity="0.9"><circle cx="118" cy="446" r="5"/><circle cx="132" cy="443" r="5"/><circle cx="284" cy="443" r="5"/><circle cx="298" cy="446" r="5"/></g>
    </g>`;
  },
});

// ---------- 3. 云朵上的兔兔 ----------
const cloud = (circles, fill, extra = '') =>
  `<g fill="${fill}" ${extra}>${circles.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>`;
faces.push({
  name: '03-cloud-bunny', tint: '#7A6CC8', band: ['#DCD5FF', '#B8AEF0'], bg: ['#A49EF0', '#F6DDF0'],
  draw() {
    const fur = vol('#FFFFFF', '#FBF8FF', '#E3D8F6');
    const line = '#8E7DC0';
    const starFill = radial([[0, '#FFFBE0'], [1, '#FFE07A']], { cx: 0.5, cy: 0.4 });
    const tiny = [[40, 60], [130, 40], [300, 70], [380, 40], [210, 120], [90, 130], [350, 120], [260, 250], [30, 360]]
      .map(([x, y]) => dot(x, y, 1.6, '#fff', 0.85)).join('');
    return `
    ${scene('#9C95EC', '#F7DFF1', [[80, 200, 80, '#FFF3C4', 0.55], [350, 400, 110, '#FFC4E2', 0.5], [300, 150, 60, '#C7C0FF', 0.7]])}
    ${tiny}
    ${star(352, 168, 11, starFill, 1, true)}${star(306, 222, 6, starFill, 0.95, true)}${star(116, 248, 7, starFill, 0.95, true)}
    ${star(386, 280, 7, starFill, 0.9, true)}${star(40, 300, 5, starFill, 0.9, true)}${star(196, 172, 5, starFill, 0.9, true)}
    <!-- 月亮 -->
    <g filter="url(#glow)">
      <path d="M 92 156 a 38 38 0 1 0 44 50 a 31 31 0 1 1 -44 -50 Z" fill="${radial([[0, '#FFFBE6'], [1, '#FFE07A']], { cx: 0.3, cy: 0.4 })}"/>
    </g>
    <circle cx="86" cy="206" r="4" fill="#F5CF5A" opacity="0.5"/><circle cx="100" cy="222" r="2.5" fill="#F5CF5A" opacity="0.5"/>
    <!-- 后层云 -->
    ${cloud([[30, 452, 54], [110, 432, 46], [306, 430, 50], [392, 448, 56]], '#E4DAFC', 'opacity="0.95"')}
    <g filter="url(#sh)">
      ${blob(`<ellipse cx="158" cy="252" rx="30" ry="80" transform="rotate(-12 158 252)"/>
              <ellipse cx="258" cy="252" rx="30" ry="80" transform="rotate(12 258 252)"/>
              <ellipse cx="208" cy="380" rx="122" ry="98"/>`, fur, line, 3)}
      <ellipse cx="158" cy="258" rx="14" ry="58" transform="rotate(-12 158 258)" fill="${radial([[0, '#FFE0EA'], [1, '#FFAECA']], { cx: 0.5, cy: 0.5, r: 0.6 })}"/>
      <ellipse cx="258" cy="258" rx="14" ry="58" transform="rotate(12 258 258)" fill="${radial([[0, '#FFE0EA'], [1, '#FFAECA']], { cx: 0.5, cy: 0.5, r: 0.6 })}"/>
      ${star(272, 206, 11, starFill)}
      <g stroke="#6B5A9E" stroke-width="4.2" fill="none" stroke-linecap="round">
        <path d="M 138 370 q 19 17 38 0"/><path d="M 240 370 q 19 17 38 0"/>
        <path d="M 140 372 l -7 5 M 276 372 l 7 5" stroke-width="3"/>
      </g>
      ${blush(140, 404, 22)}${blush(276, 404, 22)}
      <path d="M 202 392 Q 208 388 214 392 Q 213 398 208 400 Q 203 398 202 392 Z" fill="#FF8FAB"/>
      ${wMouth(208, 404, 0.6, '#6B5A9E')}
      <g font-family="Inter" font-weight="800" fill="#fff" filter="url(#glow)">
        <text x="320" y="322" font-size="26">z</text><text x="342" y="296" font-size="20">z</text><text x="359" y="274" font-size="15">z</text>
      </g>
    </g>
    <!-- 前层云 -->
    <g filter="url(#sh)">
      ${cloud([[34, 488, 60], [124, 468, 56], [212, 478, 60], [300, 466, 56], [390, 484, 62]],
        linear([[0, '#FFFFFF'], [1, '#EEE6FF']], 0, 420, 0, 520, 'userSpaceOnUse'))}
      <rect x="-20" y="486" width="456" height="40" fill="#EEE6FF"/>
    </g>
    ${blob('<ellipse cx="168" cy="460" rx="24" ry="17"/><ellipse cx="248" cy="460" rx="24" ry="17"/>', fur, line, 3)}
    <g stroke="${line}" stroke-width="2" stroke-linecap="round" opacity="0.7">
      <line x1="162" y1="452" x2="162" y2="460"/><line x1="174" y1="452" x2="174" y2="460"/>
      <line x1="242" y1="452" x2="242" y2="460"/><line x1="254" y1="452" x2="254" y2="460"/>
    </g>`;
  },
});

// ---------- 4. 荷叶上的小青蛙 ----------
const flower = (x, y, s, c1, c2, center = '#FFE27A') => `
  <g transform="translate(${x} ${y}) scale(${s})" filter="url(#soft)">
    ${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-14" rx="10" ry="15" transform="rotate(${a})" fill="${radial([[0, c1], [1, c2]], { cx: 0.5, cy: 0.8, r: 0.9 })}"/>`).join('')}
    <circle r="8" fill="${radial([[0, '#FFF6C2'], [1, center]], { cx: 0.4, cy: 0.35 })}"/>
  </g>`;
faces.push({
  name: '04-lily-frog', tint: '#3E9E6A', band: ['#C9F2DA', '#8FDCB4'], bg: ['#E4FBEF', '#A6E6C8'],
  draw() {
    const skin = vol('#C4F3A2', '#8FDC6C', '#5FB646');
    const line = '#3E8A4C';
    return `
    ${scene('#EAFCF2', '#9FE2C4', [[80, 130, 90, '#fff', 0.85], [340, 430, 120, '#6FD3AB', 0.4], [360, 200, 60, '#E8FFF4', 0.9]])}
    <g stroke="#fff" stroke-width="2.6" fill="none" opacity="0.65" stroke-linecap="round">
      <path d="M 34 214 q 14 -9 28 0 q 14 9 28 0"/><path d="M 300 166 q 14 -9 28 0 q 14 9 28 0"/>
      <path d="M 330 268 q 11 -7 22 0 q 11 7 22 0"/>
    </g>
    ${[[360, 210, 5], [372, 190, 3.5], [52, 250, 4], [44, 268, 2.5]].map(([x, y, r]) =>
      `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" fill-opacity="0.35" stroke="#fff" stroke-width="1.5" opacity="0.9"/>`).join('')}
    <!-- 小荷叶 + 花 -->
    <ellipse cx="66" cy="318" rx="44" ry="16" fill="${radial([[0, '#7CD49A'], [1, '#48A970']], { cx: 0.5, cy: 0.4 })}" opacity="0.9"/>
    ${flower(66, 304, 0.9, '#FFF0F6', '#FF9DC0')}
    ${flower(362, 340, 0.6, '#FFFFFF', '#FFD0E2')}
    ${sparkle(150, 190, 7, '#fff')}${sparkle(270, 224, 5, '#fff', 0.9)}
    <!-- 水波 -->
    <ellipse cx="208" cy="472" rx="214" ry="70" fill="none" stroke="#fff" stroke-width="3" opacity="0.4"/>
    <ellipse cx="208" cy="472" rx="236" ry="84" fill="none" stroke="#fff" stroke-width="2" opacity="0.25"/>
    <g filter="url(#sh)">
      ${blob('<path d="M 208 472 L 26 446 A 192 72 0 1 0 390 446 Z"/>', radial([[0, '#78D598'], [1, '#3C9D63']], { cx: 0.5, cy: 0.35, r: 0.8 }), '#2F6E4E', 3)}
      <g stroke="#A8EBC0" stroke-width="2.2" opacity="0.6" stroke-linecap="round">
        ${[200, 230, 260, 290, 320, 350].map((a) => { const r = (a * Math.PI) / 180; return `<line x1="208" y1="472" x2="${(208 + 180 * Math.cos(r)).toFixed(0)}" y2="${(472 - 60 * Math.sin(r) + 30).toFixed(0)}"/>`; }).join('')}
      </g>
      ${blob(`<circle cx="140" cy="300" r="46"/><circle cx="276" cy="300" r="46"/>
              <ellipse cx="208" cy="362" rx="132" ry="82"/><ellipse cx="208" cy="446" rx="104" ry="58"/>`, skin, line, 3.2)}
      <ellipse cx="208" cy="456" rx="66" ry="36" fill="${radial([[0, '#FAFFE6'], [1, '#D9F0A8']], { cx: 0.5, cy: 0.35 })}"/>
      <circle cx="140" cy="302" r="31" fill="${radial([[0, '#FFFFFF'], [1, '#E8F3E2']], { cx: 0.4, cy: 0.3 })}"/>
      <circle cx="276" cy="302" r="31" fill="${radial([[0, '#FFFFFF'], [1, '#E8F3E2']], { cx: 0.4, cy: 0.3 })}"/>
      ${eye(145, 307, 16)}${eye(271, 307, 16)}
      ${flower(208, 286, 0.8, '#FFF0F6', '#FF8FB6')}
      ${blush(112, 380, 25)}${blush(304, 380, 25)}
      <path d="M 158 372 q 50 38 100 0" stroke="${line}" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <path d="M 194 387 q 14 20 28 0 Z" fill="#FF7A9C"/>
      ${blob('<ellipse cx="148" cy="454" rx="23" ry="15"/><ellipse cx="268" cy="454" rx="23" ry="15"/>', skin, line, 3)}
      <g fill="#B4EC8E"><circle cx="134" cy="458" r="5"/><circle cx="148" cy="462" r="5"/><circle cx="162" cy="458" r="5"/>
        <circle cx="254" cy="458" r="5"/><circle cx="268" cy="462" r="5"/><circle cx="282" cy="458" r="5"/></g>
    </g>`;
  },
});

// ---------- 5. 草莓宝宝 ----------
const miniBerry = (x, y, s, rot) => `
  <g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" filter="url(#soft)">
    <path d="M 0 30 C -22 18 -24 -6 -12 -12 C -4 -16 4 -16 12 -12 C 24 -6 22 18 0 30 Z" fill="${vol('#FF9AAB', '#FF5C7A', '#E0405E')}"/>
    <path d="M -10 -4 q -4 10 0 18" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.55"/>
    ${[[-6, 2], [6, 2], [0, 12], [-8, 14], [8, 14]].map(([a, b]) => `<ellipse cx="${a}" cy="${b}" rx="1.6" ry="2.4" fill="#FFE7A0"/>`).join('')}
    <path d="M -13 -12 L -7 -21 L 0 -14 L 7 -21 L 13 -12 Q 0 -6 -13 -12 Z" fill="#5CC27B"/>
  </g>`;
const blossom = (x, y, s) => `
  <g transform="translate(${x} ${y}) scale(${s})" filter="url(#soft)">
    ${[0, 72, 144, 216, 288].map((a) => `<circle cx="0" cy="-10" r="8" transform="rotate(${a})" fill="#fff"/>`).join('')}
    <circle r="6" fill="#FFD84A"/><circle cx="-1.5" cy="-1.5" r="2" fill="#FFF3B0"/>
  </g>`;
faces.push({
  name: '05-strawberry', tint: '#E0607A', band: ['#FFD6DF', '#FF9FB2'], bg: ['#FFF7F9', '#FFD6E0'],
  draw() {
    const pid = nid('gingham');
    D.push(`<pattern id="${pid}" width="32" height="32" patternUnits="userSpaceOnUse">
      <rect width="32" height="16" fill="#FF8FA8" opacity="0.12"/><rect width="16" height="32" fill="#FF8FA8" opacity="0.12"/></pattern>`);
    const line = '#A8304A';
    const leaf = vol('#9CE6AE', '#5CC27B', '#3A9A5A');
    const seeds = [[-34, -14], [0, -24], [34, -14], [-52, 20], [-18, 12], [18, 12], [52, 20], [-36, 48], [0, 42], [36, 48], [-18, 76], [18, 76], [0, 100]];
    return `
    ${scene('#FFF8FA', '#FFD3DE', [[340, 120, 90, '#fff', 0.8], [70, 420, 110, '#FFA9BD', 0.4]])}
    <rect x="-80" y="-80" width="${W + 160}" height="${H + 160}" fill="url(#${pid})"/>
    <rect x="-80" y="-80" width="${W + 160}" height="${H + 160}" fill="${linear([[0, '#FFF8FA', 0.92], [0.45, '#FFF8FA', 0.5], [1, '#FFF8FA', 0]])}"/>
    ${miniBerry(58, 186, 1, -16)}${miniBerry(362, 168, 0.9, 18)}${miniBerry(352, 298, 0.7, -10)}${miniBerry(60, 312, 0.72, 14)}
    ${blossom(110, 238, 0.8)}${blossom(316, 236, 0.7)}${blossom(388, 400, 0.6)}${blossom(30, 410, 0.55)}
    ${sparkle(150, 170, 7, '#FF9EB3', 0.8)}${sparkle(278, 196, 6, '#FF9EB3', 0.8)}
    <g filter="url(#sh)">
      ${blob(`<path d="M 208 504 C 86 474 48 360 94 298 C 124 258 170 254 208 264 C 246 254 292 258 322 298 C 368 360 330 474 208 504 Z"/>`,
        vol('#FF9DAD', '#FF5574', '#D72F4F'), line, 3.2)}
      <path d="M 116 312 q -22 34 -14 78" stroke="#fff" stroke-width="10" stroke-linecap="round" fill="none" opacity="0.45"/>
      <circle cx="122" cy="296" r="6" fill="#fff" opacity="0.6"/>
      ${seeds.map(([dx, dy]) => `
        <ellipse cx="${208 + dx}" cy="${402 + dy + 1.5}" rx="3.6" ry="5.4" fill="#B7203F" opacity="0.35"/>
        <ellipse cx="${208 + dx}" cy="${402 + dy}" rx="3.4" ry="5.2" fill="${radial([[0, '#FFF6D2'], [1, '#FFD873']], { cx: 0.4, cy: 0.3 })}"/>`).join('')}
      ${blob(`<path d="M 126 282 Q 146 232 184 260 Q 190 218 208 218 Q 226 218 232 260 Q 270 232 290 282 Q 250 302 208 286 Q 166 302 126 282 Z"/>`, leaf, '#2F7A4C', 3)}
      <g stroke="#2F7A4C" stroke-width="2" stroke-linecap="round" opacity="0.5" fill="none">
        <path d="M 150 276 q 14 -10 30 -6"/><path d="M 208 232 v 40"/><path d="M 266 276 q -14 -10 -30 -6"/>
      </g>
      <path d="M 208 222 q 4 -26 22 -38" stroke="#2F7A4C" stroke-width="8" stroke-linecap="round" fill="none"/>
      <path d="M 208 222 q 4 -26 22 -38" stroke="#6CCB86" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      ${eye(162, 342, 15)}${eye(254, 342, 15)}
      ${blush(130, 374, 24, '#FFC2CD')}${blush(286, 374, 24, '#FFC2CD')}
      <path d="M 190 362 Q 208 360 226 362 Q 222 384 208 386 Q 194 384 190 362 Z" fill="#8E1F38"/>
      <path d="M 198 378 Q 208 370 218 378 Q 214 386 208 386 Q 202 386 198 378 Z" fill="#FF8FA5"/>
    </g>`;
  },
});

// ---------- 6. 蛋壳里的小鸡 ----------
faces.push({
  name: '06-egg-chick', tint: '#D89A2E', band: ['#FFF0B8', '#FFD45E'], bg: ['#BFE6FF', '#FFF4D6'],
  draw() {
    const feather = vol('#FFF6B8', '#FFDF5C', '#F2B42E');
    const line = '#B7862A';
    const shell = linear([[0, '#FFFFFF'], [1, '#F2E8D6']]);
    const daisy = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">
      ${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<ellipse cx="0" cy="-7" rx="3" ry="6" transform="rotate(${a})" fill="#fff"/>`).join('')}
      <circle r="3.5" fill="#FFC93C"/></g>`;
    return `
    ${scene('#B9E3FF', '#FFF2D2', [[350, 236, 100, '#FFE7A0', 0.75], [60, 140, 80, '#E4F4FF', 0.9]])}
    <!-- 太阳 -->
    <g transform="translate(352 232)" filter="url(#soft)">
      ${Array.from({ length: 12 }, (_, i) => `<rect x="-3.5" y="-50" width="7" height="14" rx="3.5" fill="#FFC93C" transform="rotate(${i * 30})"/>`).join('')}
      <circle r="30" fill="${radial([[0, '#FFF3B0'], [1, '#FFC93C']], { cx: 0.4, cy: 0.35 })}"/>
      <path d="M -13 -2 q 5 5 10 0 M 3 -2 q 5 5 10 0" stroke="#C98A1E" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <ellipse cx="-14" cy="8" rx="5" ry="3" fill="#FF9C7A" opacity="0.6"/><ellipse cx="14" cy="8" rx="5" ry="3" fill="#FF9C7A" opacity="0.6"/>
      <path d="M -4 10 q 4 4 8 0" stroke="#C98A1E" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    </g>
    <!-- 云 -->
    <g filter="url(#soft)" fill="#fff">
      <circle cx="58" cy="206" r="18"/><circle cx="84" cy="196" r="25"/><circle cx="110" cy="206" r="17"/><rect x="56" y="204" width="56" height="20" rx="10"/>
    </g>
    <g fill="#fff" opacity="0.85"><circle cx="232" cy="176" r="10"/><circle cx="246" cy="170" r="13"/><circle cx="260" cy="177" r="9"/><rect x="230" y="176" width="32" height="10" rx="5"/></g>
    <!-- 山坡 -->
    <path d="M -40 470 Q 80 400 220 450 Q 340 400 460 440 L 460 560 L -40 560 Z" fill="${linear([[0, '#D4F2B6'], [1, '#B7E59A']])}"/>
    <path d="M -40 490 Q 208 440 460 490 L 460 560 L -40 560 Z" fill="${linear([[0, '#A9DE88'], [1, '#86CC66']])}"/>
    ${daisy(46, 476, 1)}${daisy(374, 470, 0.9)}${daisy(396, 488, 0.7)}${daisy(22, 494, 0.7)}
    ${[70, 340].map((x) => `<path d="M ${x} 486 q 4 -14 8 0 q 4 -10 8 0" stroke="#6DBF55" stroke-width="2.6" fill="none" stroke-linecap="round"/>`).join('')}
    <g filter="url(#sh)">
      ${blob(`<path d="M 108 404 q -34 -18 -28 -54 q 24 8 40 32 Z"/><path d="M 308 404 q 34 -18 28 -54 q -24 8 -40 32 Z"/>
              <ellipse cx="208" cy="372" rx="108" ry="104"/>`, feather, line, 3)}
      ${eye(170, 352, 14)}${eye(246, 352, 14)}
      ${blush(140, 388, 24)}${blush(276, 388, 24)}
      ${blob('<path d="M 192 374 Q 208 368 224 374 Q 216 392 208 394 Q 200 392 192 374 Z"/>', vol('#FFC27A', '#FF9F43', '#E57F20'), '#C26A1E', 2.4)}
      <ellipse cx="203" cy="375" rx="4" ry="2" fill="#fff" opacity="0.6"/>
      <!-- 头顶蛋壳帽 -->
      <g transform="translate(212 276) rotate(-12)">
        ${blob('<path d="M -52 8 C -50 -40 50 -40 52 8 L 36 -2 L 20 10 L 4 -2 L -12 10 L -28 -2 Z"/>', shell, line, 3)}
        <circle cx="-18" cy="-14" r="5" fill="#FFC6D8"/><circle cx="14" cy="-20" r="4" fill="#BFE3FF"/><circle cx="30" cy="-6" r="3" fill="#FFC6D8"/>
        <path d="M -36 -10 q 6 -16 22 -20" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none"/>
      </g>
      <!-- 蛋壳 -->
      ${blob(`<path d="M 90 412 L 120 388 L 150 416 L 180 390 L 208 418 L 236 390 L 266 416 L 296 388 L 326 412
               C 332 474 292 512 208 512 C 124 512 84 474 90 412 Z"/>`, shell, line, 3)}
      <path d="M 104 430 Q 102 470 130 494" stroke="#fff" stroke-width="8" stroke-linecap="round" fill="none" opacity="0.9"/>
      <g opacity="0.85"><circle cx="152" cy="462" r="9" fill="#FFC6D8"/><circle cx="264" cy="452" r="11" fill="#BFE3FF"/>
        <circle cx="210" cy="486" r="6" fill="#FFE59A"/><circle cx="300" cy="476" r="5" fill="#FFC6D8"/></g>
    </g>`;
  },
});

// ================= 组装 SVG =================
const faceSvg = (face, w = W, h = H) => {
  D = [];
  const body = face.draw();
  const tail = finish(face.tint);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice">
    <defs>${baseDefs(face.tint)}${D.join('')}</defs>${body}${tail}</svg>`;
};

// 通用（非品牌）智能手表外观，用于商品展示图
const watchMockup = (face, dataUri, { time = '10:09', date = 'WED 18' } = {}) => {
  const sw = 470, sh = 560; // 屏幕区域
  const cw = sw + 76, ch = sh + 80; // 表壳
  const cx = 600, cy = 600;
  const x0 = cx - cw / 2, y0 = cy - ch / 2;
  const sx = cx - sw / 2, sy = cy - sh / 2;
  const [b1, b2] = face.band;
  return `
  <defs>
    <linearGradient id="band" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${b2}"/><stop offset="0.25" stop-color="${b1}"/><stop offset="0.75" stop-color="${b1}"/><stop offset="1" stop-color="${b2}"/></linearGradient>
    <linearGradient id="case" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FBF9F6"/><stop offset="0.5" stop-color="#E4DFD8"/><stop offset="1" stop-color="#C9C3BA"/></linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.18"/><stop offset="0.4" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <clipPath id="screen"><rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="96"/></clipPath>
    <filter id="wsh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="30" stdDeviation="34" flood-color="${face.tint}" flood-opacity="0.35"/></filter>
    <filter id="tsh"><feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000" flood-opacity="0.25"/></filter>
  </defs>
  <g filter="url(#wsh)">
    <path d="M ${cx - 150} -20 L ${cx + 150} -20 L ${cx + 170} ${y0 + 40} L ${cx - 170} ${y0 + 40} Z" fill="url(#band)"/>
    <path d="M ${cx - 170} ${y0 + ch - 40} L ${cx + 170} ${y0 + ch - 40} L ${cx + 150} 1220 L ${cx - 150} 1220 Z" fill="url(#band)"/>
    ${[0, 1, 2].map((i) => `<ellipse cx="${cx}" cy="${y0 + ch + 70 + i * 60}" rx="8" ry="6" fill="${b2}" opacity="0.8"/>`).join('')}
    <rect x="${x0 + cw - 8}" y="${cy - 150}" width="30" height="96" rx="14" fill="url(#case)" stroke="#BDB6AC" stroke-width="2"/>
    ${Array.from({ length: 9 }, (_, i) => `<line x1="${x0 + cw + 10}" y1="${cy - 140 + i * 10}" x2="${x0 + cw + 20}" y2="${cy - 140 + i * 10}" stroke="#B0A99E" stroke-width="2"/>`).join('')}
    <rect x="${x0 + cw - 8}" y="${cy - 10}" width="18" height="110" rx="8" fill="url(#case)" stroke="#BDB6AC" stroke-width="2"/>
    <rect x="${x0}" y="${y0}" width="${cw}" height="${ch}" rx="150" fill="url(#case)"/>
    <rect x="${x0 + 6}" y="${y0 + 6}" width="${cw - 12}" height="${ch - 12}" rx="145" fill="none" stroke="#fff" stroke-width="3" opacity="0.7"/>
    <rect x="${x0 + 16}" y="${y0 + 16}" width="${cw - 32}" height="${ch - 32}" rx="132" fill="#0B0B0D"/>
  </g>
  <g clip-path="url(#screen)">
    <image href="${dataUri}" x="${sx}" y="${sy}" width="${sw}" height="${sh}" preserveAspectRatio="xMidYMax slice"/>
    <g filter="url(#tsh)" fill="#fff" text-anchor="middle" font-family="Inter Display, Inter">
      <text x="${cx}" y="${sy + 62}" font-size="22" font-weight="700" letter-spacing="2" opacity="0.95">${date}</text>
      <text x="${cx}" y="${sy + 138}" font-size="78" font-weight="600" letter-spacing="-1">${time}</text>
    </g>
    <rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="url(#glass)"/>
  </g>`;
};

// ================= 渲染 =================
(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, 'mockups'), { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const shot = async (svg, w, h, file) => {
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(`<html><body style="margin:0;background:#000">${svg}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    const buf = await page.screenshot({ path: file, clip: { x: 0, y: 0, width: w, height: h } });
    return buf;
  };

  const hdPngs = {};
  for (const face of faces) {
    const dir = path.join(OUT, face.name);
    fs.mkdirSync(dir, { recursive: true });
    for (const [label, w, h] of SIZES) {
      await shot(faceSvg(face, w, h), w, h, path.join(dir, `${face.name}_${label}_${w}x${h}.png`));
    }
    hdPngs[face.name] = await shot(faceSvg(face, W * 3, H * 3), W * 3, H * 3, path.join(dir, `${face.name}_HD_${W * 3}x${H * 3}.png`));
    console.log('✓', face.name);
  }

  // 商品展示图
  for (const face of faces) {
    D = [];
    const uri = `data:image/png;base64,${hdPngs[face.name].toString('base64')}`;
    const bgFill = linear([[0, face.bg[0]], [1, face.bg[1]]], 0, 0, 1, 1);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
      <defs>${D.join('')}<filter id="bb"><feGaussianBlur stdDeviation="60"/></filter></defs>
      <rect width="1200" height="1200" fill="${bgFill}"/>
      <g filter="url(#bb)"><circle cx="200" cy="220" r="220" fill="#fff" opacity="0.6"/><circle cx="1040" cy="980" r="260" fill="#fff" opacity="0.35"/></g>
      ${watchMockup(face, uri)}</svg>`;
    await shot(svg, 1200, 1200, path.join(OUT, 'mockups', `${face.name}_mockup.png`));
  }

  // 系列封面：3×2 网格
  const tiles = [];
  for (let i = 0; i < faces.length; i++) {
    const uri = `data:image/png;base64,${hdPngs[faces[i].name].toString('base64')}`;
    const x = 90 + (i % 3) * 560, y = 110 + Math.floor(i / 3) * 640;
    tiles.push(`<g transform="translate(${x} ${y})">
      <rect x="0" y="0" width="500" height="596" rx="110" fill="#fff" filter="url(#csh)"/>
      <rect x="14" y="14" width="472" height="568" rx="98" fill="#0B0B0D"/>
      <clipPath id="c${i}"><rect x="28" y="28" width="444" height="540" rx="86"/></clipPath>
      <image href="${uri}" x="28" y="28" width="444" height="540" preserveAspectRatio="xMidYMax slice" clip-path="url(#c${i})"/></g>`);
  }
  const cover = `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1440" viewBox="0 0 1800 1440">
    <defs><linearGradient id="cbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF4F7"/><stop offset="0.5" stop-color="#F7F1FF"/><stop offset="1" stop-color="#EAF8F1"/></linearGradient>
      <filter id="csh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#9C7FB0" flood-opacity="0.28"/></filter></defs>
    <rect width="1800" height="1440" fill="url(#cbg)"/>${tiles.join('')}</svg>`;
  await shot(cover, 1800, 1440, path.join(OUT, 'cover.png'));

  await browser.close();
  console.log('完成 →', OUT);
})();
