import { marked } from 'marked';
import spells from './spells.js';
import './styles.css';

const loader = document.getElementById('data-loader');
const status = document.getElementById('load-status');
const classSelect = document.getElementById('spell-class');
let loadedSpells = [];
const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const levelName = level => level === 0 ? 'Заговоры' : `${level}-й уровень`;
const spellCount = n => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'заклинание' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'заклинания' : 'заклинаний'}`;

function validate(data) {
  if (!Array.isArray(data) || !data.length) throw new Error('JSON должен содержать непустой массив заклинаний.');
  const ids = new Set();
  for (const spell of data) {
    if (typeof spell.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(spell.id) || ids.has(spell.id)) throw new Error('Каждому заклинанию нужен уникальный UUID в поле id.');
    ids.add(spell.id);
    if (!Number.isInteger(spell.level) || spell.level < 0 || spell.level > 9) throw new Error(`Некорректный уровень заклинания ${spell.id}.`);
    for (const key of ['nameRu', 'nameEn', 'school', 'castingTime', 'range', 'components', 'duration', 'descriptionMarkdown', 'originalText']) {
      if (typeof spell[key] !== 'string' || !spell[key].trim()) throw new Error(`В заклинании ${spell.id} отсутствует текстовое поле ${key}.`);
    }
    if (!Array.isArray(spell.classes) || !spell.classes.length || spell.classes.some(c => typeof c !== 'string')) throw new Error(`Некорректные классы заклинания ${spell.id}.`);
    if (typeof spell.ritual !== 'boolean' || typeof spell.alternative !== 'boolean') throw new Error(`Некорректные признаки ritual/alternative заклинания ${spell.id}.`);
  }
  return data;
}

function renderSpell(spell) {
  const esc = escapeHtml;
  const subtitle = `${spell.level === 0 ? 'Заговор' : `${spell.level}-й уровень`} · ${spell.school}${spell.ritual ? ' · Ритуал' : ''}`;
  const metadata = [
    ['Классы', spell.classes.join(', ')],
    ['Время накладывания', spell.castingTime],
    ['Дистанция', spell.range],
    ['Компоненты', spell.components],
    ['Длительность', spell.duration]
  ];
  // The document uses paragraphs, bold text, lists, headings and tables.
  // Escape raw HTML before parsing so JSON text cannot introduce executable markup.
  const description = marked.parse(esc(spell.descriptionMarkdown), {async: false})
    .replaceAll('<h3>', '<h4>').replaceAll('</h3>', '</h4>');
  return `<article class="spell" id="spell-${spell.id}" aria-labelledby="name-${spell.id}">
    <header><h3 id="name-${spell.id}">${esc(spell.nameRu)} <span class="english" lang="en">(${esc(spell.nameEn)})</span></h3>
    <p class="school">${esc(subtitle)}${spell.alternative ? ' <span class="alt">ALT · альтернативная версия</span>' : ''}</p></header>
    <dl class="meta">${metadata.map(([key, value]) => `<div${key === 'Классы' || key === 'Компоненты' ? ' class="wide"' : ''}><dt>${esc(key)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>
    <div class="description">${description}</div>
    <details class="original"><summary>Английский оригинал для сверки</summary><div lang="en" class="source">${esc(spell.originalText)}</div></details>
    <a class="back" href="#contents">К оглавлению ↑</a></article>`;
}

function render(data) {
  const spells = validate(data);
  loadedSpells = spells;
  const classes = [...new Set(spells.flatMap(spell => spell.classes))].sort((a, b) => a.localeCompare(b, 'ru'));
  classSelect.replaceChildren(new Option('Все классы', ''), ...classes.map(name => new Option(name, name)));
  document.getElementById('class-filter').hidden = false;
  const groups = Array.from({length: 10}, (_, level) => ({level, spells: spells.filter(s => s.level === level)})).filter(g => g.spells.length);
  const navigation = groups.map(group => `<details data-level="${group.level}"><summary>${levelName(group.level)} <span>${group.spells.length}</span></summary><ul>${group.spells.map(spell => `<li><a href="#spell-${spell.id}">${escapeHtml(spell.nameRu)}<small lang="en">${escapeHtml(spell.nameEn)}</small></a></li>`).join('')}</ul></details>`).join('');
  const articles = groups.map(group => `<section class="level" id="level-${group.level}" aria-labelledby="level-title-${group.level}"><header class="level-title"><h2 id="level-title-${group.level}">${levelName(group.level)}</h2><span>${spellCount(group.spells.length)}</span></header>${group.spells.map(renderSpell).join('')}</section>`).join('');
  document.getElementById('spell-navigation').innerHTML = navigation;
  document.getElementById('spell-list').innerHTML = articles;
  document.querySelector('.masthead p:last-child').textContent = `Русский перевод · ${spellCount(spells.length)} · Английские названия рядом с русскими.`;
  applyClassFilter();
  loader.hidden = true;
  document.getElementById('main').setAttribute('aria-busy', 'false');
  if (location.hash) requestAnimationFrame(() => document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView());
}

function applyClassFilter() {
  const selectedClass = classSelect.value;
  const matching = loadedSpells.filter(spell => !selectedClass || spell.classes.includes(selectedClass));
  const ids = new Set(matching.map(spell => spell.id));
  for (const spell of loadedSpells) {
    const visible = ids.has(spell.id);
    document.getElementById(`spell-${spell.id}`).hidden = !visible;
    document.querySelector(`#spell-navigation a[href="#spell-${spell.id}"]`).closest('li').hidden = !visible;
  }
  for (const section of document.querySelectorAll('#spell-list > .level')) {
    const level = Number(section.id.replace('level-', ''));
    const count = matching.filter(spell => spell.level === level).length;
    const navigation = document.querySelector(`#spell-navigation details[data-level="${level}"]`);
    section.hidden = count === 0;
    navigation.hidden = count === 0;
    section.querySelector('.level-title > span').textContent = spellCount(count);
    navigation.querySelector('summary span').textContent = count;
  }
  document.getElementById('filter-count').textContent = `${spellCount(matching.length)} из ${loadedSpells.length}`;
}

classSelect.addEventListener('change', applyClassFilter);

function showError(error) {
  loader.hidden = false;
  status.classList.add('error');
  status.textContent = `Не удалось загрузить сборник: ${error.message}`;
  document.getElementById('main').setAttribute('aria-busy', 'false');
}

document.getElementById('main').setAttribute('aria-busy', 'true');
try {
  render(spells);
} catch (error) {
  showError(error);
}
