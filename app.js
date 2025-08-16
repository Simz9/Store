// Utility: localStorage helpers
const store = {
  get: (key, fallback) => {
    try{ return JSON.parse(localStorage.getItem(key)) ?? fallback; }catch{ return fallback; }
  },
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val))
};

const q = (sel, ctx=document) => ctx.querySelector(sel);
const qa = (sel, ctx=document) => [...ctx.querySelectorAll(sel)];

const state = {
  stories: [],
  filter: 'all',
  search: '',
  bookmarks: store.get('bookmarks', []),
  theme: store.get('theme', 'dark')
};

// Theme
function applyTheme(){
  if(state.theme === 'light') document.documentElement.classList.add('light');
  else document.documentElement.classList.remove('light');
}
function toggleTheme(){
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  store.set('theme', state.theme);
  applyTheme();
}

// Load stories
async function loadStories(){
  const res = await fetch('stories.json');
  const data = await res.json();
  state.stories = data;
  render();
}

// Render grid
function render(){
  const grid = q('#grid');
  const term = state.search.trim();
  let list = state.stories;

  if(state.filter === 'psychology') list = list.filter(s => s.category === 'psychology');
  else if(state.filter === 'horror') list = list.filter(s => s.category === 'horror');
  else if(state.filter === 'bookmarked') list = list.filter(s => state.bookmarks.includes(s.id));

  if(term){
    const t = term.toLowerCase();
    list = list.filter(s => (s.title + ' ' + s.summary + ' ' + s.body).toLowerCase().includes(t));
  }

  grid.innerHTML = '';

  if(!list.length){
    grid.innerHTML = `<div class="card"><div class="title">لا توجد قصص مطابقة.</div><p class="meta">جرّب تصنيفاً آخر أو ابحث بكلمة مختلفة.</p></div>`;
    return;
  }

  list.forEach(s => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div class="title">${s.title}</div>
      <div class="meta">
        <span class="badge">${s.category === 'psychology' ? 'علم النفس' : 'رعب'}</span>
        <span class="badge">${s.length} دقيقة قراءة</span>
      </div>
      <p>${s.summary}</p>
      <div class="actions">
        <a href="#" class="read" data-id="${s.id}">قراءة</a>
        <button class="save" data-id="${s.id}">${state.bookmarks.includes(s.id) ? 'مُحفَظة' : 'حفظ'}</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

// Reader modal
const reader = q('#reader');
const readerTitle = q('#readerTitle');
const readerCategory = q('#readerCategory');
const readerContent = q('#readerContent');
const fontSize = q('#fontSize');
const progress = q('#progress > div');

function openReader(id){
  const story = state.stories.find(s => s.id === id);
  if(!story) return;
  readerTitle.textContent = story.title;
  readerCategory.textContent = story.category === 'psychology' ? 'علم النفس' : 'رعب';
  readerContent.innerHTML = story.body.split('\n').map(p => `<p>${p}</p>`).join('');
  reader.showModal();
  readerContent.scrollTop = 0;
  updateProgress();
}

function updateProgress(){
  const el = readerContent;
  const val = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100;
  progress.style.width = (isFinite(val) ? val : 0) + '%';
}

function toggleBookmark(id){
  const i = state.bookmarks.indexOf(id);
  if(i >= 0) state.bookmarks.splice(i,1); else state.bookmarks.push(id);
  store.set('bookmarks', state.bookmarks);
  render();
}

// Events
addEventListener('DOMContentLoaded', () => {
  q('#year').textContent = new Date().getFullYear();
  applyTheme();
  loadStories();

  q('#themeToggle').addEventListener('click', toggleTheme);
  q('#search').addEventListener('input', (e)=>{ state.search = e.target.value; render(); });

  qa('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      qa('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.filter = tab.dataset.filter;
      render();
    });
  });

  q('#grid').addEventListener('click', (e) => {
    const read = e.target.closest('.read');
    const save = e.target.closest('.save');
    if(read){
      e.preventDefault();
      openReader(parseInt(read.dataset.id));
    }
    if(save){
      toggleBookmark(parseInt(save.dataset.id));
    }
  });

  q('#bookmarkBtn').addEventListener('click', () => {
    const id = state.stories.find(s => s.title === readerTitle.textContent)?.id;
    if(id) toggleBookmark(id);
  });

  readerContent.addEventListener('scroll', updateProgress);
  fontSize.addEventListener('input', () => {
    readerContent.style.fontSize = fontSize.value + 'px';
  });

  q('#exportBookmarks').addEventListener('click', (e)=>{
    e.preventDefault();
    const bookmarkedStories = state.stories.filter(s => state.bookmarks.includes(s.id));
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(bookmarkedStories, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute('href', dataStr);
    dl.setAttribute('download', 'bookmarked-stories.json');
    dl.click();
  });
});
